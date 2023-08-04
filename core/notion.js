import { readdirSync, readFileSync } from "fs";
import { config } from "dotenv";
import Converter from "showdown";
import handlebars from "handlebars";
import { app, notion as _notion } from "../notion.config.js";
import helpers from "./helpers.js";
import { Client } from "@notionhq/client";

config();

readdirSync(app.partialsDirectory).forEach((file) => {
  const partialName = file.split(".").slice(0, -1).join(".");
  const partialContent = readFileSync(
    `${app.partialsDirectory}/${file}`,
    "utf-8"
  );
  handlebars.registerPartial(partialName, partialContent);
});

// register helpers
Object.keys(helpers).forEach((helperName) => {
  handlebars.registerPartial(helperName, helpers[helperName]);
});

const converter = new Converter.Converter();
const notion = new Client({ auth: process.env.NOTION_API_KEY });
export const SITE_DATA = {};
const PARSED_PAGE_IDS = [];

function makeTitleSlug(title) {
  return title
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "");
}

async function blocksToContentDict(blocks) {
  let mdContent = [""];
  let txtContent = "";

  for (const block of blocks) {
    let text = "";
    block[block.type].rich_text?.forEach((rich_text) => {
      let partialText = rich_text.plain_text;
      if (rich_text.annotations) {
        if (rich_text.annotations.bold) partialText = `**${partialText}**`;
        if (rich_text.annotations.italic) partialText = `*${partialText}*`;
        if (rich_text.annotations.strikethrough)
          partialText = `~~${partialText}~~`;
        if (rich_text.annotations.code) partialText = "`" + partialText + "`";
      }
      if (rich_text.href) partialText = `[${partialText}](${rich_text.href})`;
      text += partialText;
    });
    txtContent += text;
    const l = mdContent.length - 1;

    switch (block.type) {
      case "heading_1":
        mdContent[l] += `# ${text}\n\n`;
        break;
      case "heading_2":
        mdContent[l] += `## ${text}\n\n`;
        break;
      case "heading_3":
        mdContent[l] += `### ${text}\n\n`;
        break;
      case "paragraph":
        mdContent[l] += `${text}\n\n`;
        break;
      case "bulleted_list_item":
        mdContent[l] += `* ${text}\n`;
        break;
      case "numbered_list_item":
        mdContent[l] += `1. ${text}\n`;
        break;
      case "to_do":
        mdContent[l] += `- [ ] ${text}\n`;
        break;
      case "toggle":
        mdContent[l] += `> ${text}\n`;
        break;
      case "quote":
        mdContent[l] += `> ${text}\n`;
        break;
      case "video":
        mdContent[l] += `${text}\n\n`;
        break;
      case "code":
        mdContent[
          l
        ] += `\`\`\`${block.code.language}\n${block.code.rich_text[0].plain_text}\n\`\`\`\n\n`;
        break;
      // Handle case for unsupported block type
      case "bookmark":
      case "breadcrumb":
      case "child_database":
      case "column":
      case "column_list":
      case "divider":
      case "embed":
      case "equation":
      case "file":
      case "image":
      case "link_preview":
      case "link_to_page":
      case "table":
      case "table_of_contents":
      case "table_row":
      case "template":
      case "pdf":
        mdContent[l] += `${text}\n\n`;
        break;
      case "child_page":
        const page = await notion.pages.retrieve({ page_id: block.id });
        const slug = makeTitleSlug(block.child_page.title);
        SITE_DATA[page.slug] = {
          id: page.id,
          createdTime: page.created_time,
          lastEditedTime: page.last_edited_time,
          slug: slug,
          title: block.child_page.title,
          pageUrl: page.url,
          icon: page.icon,
          cover: page.cover,
          content: await getPageContent(page.id),
        };
        mdContent[l] += `[${block.child_page.title}](./${slug})\n\n`;
        break;
      case "callout":
        // md to html conversion must happen here, it will not be picked up later
        // escape any sensitive characters
        mdContent.push(
          `{{> ${block.type} content='${converter.makeHtml(text)}'}}\n\n`
        );
        mdContent.push("");
        break;
      case "unsupported":
        break;
    }
  }

  return {markdown: mdContent, text: txtContent};
}

async function getPageContent(pageId) {
  if (PARSED_PAGE_IDS.includes(pageId)) return "";
  PARSED_PAGE_IDS.push(pageId);

  const blocks = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 50,
  });

  const content = await blocksToContentDict(blocks.results);
  const htmlContent = content.markdown
    .map((text) =>
      text.startsWith("{{")
        ? handlebars.compile(text)()
        : converter.makeHtml(text)
    )
    .join("");
  content.html = htmlContent;
  return content;
}

async function getDatabase(databaseId, withContent) {
  const query = await notion.databases.query({
    database_id: databaseId,
  });

  const rows = [];

  for (const page of query.results) {
    // Skip pages without a slug
    if (!page.properties.Name.title[0]) continue;

    const title = page.properties.Name.title[0].plain_text;

    let slug;
    if (page.properties.Slug.rich_text.length === 0) {
      slug = makeTitleSlug(title);
    } else {
      slug = page.properties.Slug.rich_text[0].plain_text;
    }

    new Date(page.last_edited_time);

    rows.push({
      id: page.id,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
      slug: slug,
      title: title,
      pageUrl: page.url,
      icon: page.icon,
      cover: page.cover,
      content: withContent ? await getPageContent(page.id) : null,
    });
  }

  return rows;
}

export async function loadDatabase() {
  const rows = await getDatabase(_notion.databaseId, true);
  rows.forEach((row) => (SITE_DATA[row.slug] = row));
}

export { handlebars };
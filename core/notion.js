import { readdirSync, readFileSync } from "fs";
import { config } from "dotenv";
import Converter from "showdown";
import handlebars from "handlebars";
import { app, notion as _notion } from "../notion.config.js";
import * as helpers from "./helpers.js";
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
const PARSED_PAGE_IDS = [];

function makeTitleSlug(title) {
  return title
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "");
}

function replaceNotionHeaderURL(url) {
  return url.replace(
    /notion:\/\/www\.notion\.so\/([a-zA-Z0-9_-]+)\/([a-zA-Z_-]+)-[a-zA-Z0-9_-]+(#\S*)?/g,
    "$3"
  );
}

async function blocksToContentDict(rows, blocks) {
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
    text = replaceNotionHeaderURL(text);
    txtContent += text;

    switch (block.type) {
      case "heading_1":
        mdContent += `# ${text}\n\n`;
        break;
      case "heading_2":
        mdContent += `## ${text}\n\n`;
        break;
      case "heading_3":
        mdContent += `### ${text}\n\n`;
        break;
      case "paragraph":
        mdContent += `${text}\n\n`;
        break;
      case "bulleted_list_item":
        mdContent += `* ${text}\n`;
        break;
      case "numbered_list_item":
        mdContent += `1. ${text}\n`;
        break;
      case "to_do":
        mdContent += `- [ ] ${text}\n`;
        break;
      case "toggle":
        mdContent += `> ${text}\n`;
        break;
      case "quote":
        mdContent += `> ${text}\n`;
        break;
      case "video":
        mdContent += `${text}\n\n`;
        break;
      case "code":
        mdContent += `\`\`\`${block.code.language}\n${block.code.rich_text[0].plain_text}\n\`\`\`\n\n`;
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
        mdContent += `${text}\n\n`;
        break;
      case "child_page":
        const page = await notion.pages.retrieve({ page_id: block.id });
        const slug = makeTitleSlug(block.child_page.title);
        rows.push({
          id: page.id,
          createdTime: page.created_time,
          lastEditedTime: page.last_edited_time,
          slug: slug,
          title: block.child_page.title,
          pageUrl: page.url,
          icon: page.icon,
          cover: page.cover,
          content: await getPageContent(rows, page.id),
        });
        mdContent += `[${block.child_page.title}](./${slug})\n\n`;
        break;
      case "callout":
        // md to html conversion must happen here, it will not be picked up later
        // escape any sensitive characters
        mdContent += handlebars.compile(
          `{{> ${block.type} content='${converter.makeHtml(text)}'}}\n\n`
        )();
        break;
      case "unsupported":
        break;
    }
  }
  return { markdown: mdContent, text: txtContent, html: converter.makeHtml(mdContent) };
}

async function getPageContent(rows, pageId) {
  if (PARSED_PAGE_IDS.includes(pageId)) return "";
  PARSED_PAGE_IDS.push(pageId);

  const blocks = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 50,
  });

  return await blocksToContentDict(rows, blocks.results);
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
      content: withContent ? await getPageContent(rows, page.id) : null,
    });
  }

  return rows;
}

export async function loadDatabase() {
  let siteData = {};
  const rows = await getDatabase(process.env.NOTION_DATABASE_ID, true);
  rows.forEach((row) => (siteData[row.slug] = row));
  return siteData;
}

export { handlebars };

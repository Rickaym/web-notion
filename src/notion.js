import { config } from "dotenv";
import Converter from "showdown";
import { Client } from "@notionhq/client";
import { HandlebarsFactory } from "./setup.js";

config();

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


async function getPageContent(pages, pageId) {
  if (PARSED_PAGE_IDS.includes(pageId)) return "";

  PARSED_PAGE_IDS.push(pageId);

  const blocks = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 50,
  });

  const hbs = new HandlebarsFactory().getImport();

  let contentMd = "";
  let contentTxt = "";

  for (const block of blocks.results) {
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
    contentTxt += text;

    switch (block.type) {
      case "heading_1":
        contentMd += `# ${text}\n\n`;
        break;
      case "heading_2":
        contentMd += `## ${text}\n\n`;
        break;
      case "heading_3":
        contentMd += `### ${text}\n\n`;
        break;
      case "paragraph":
        contentMd += `${text}\n\n`;
        break;
      case "bulleted_list_item":
        contentMd += `* ${text}\n`;
        break;
      case "numbered_list_item":
        contentMd += `1. ${text}\n`;
        break;
      case "to_do":
        contentMd += `- [ ] ${text}\n`;
        break;
      case "toggle":
        contentMd += `> ${text}\n`;
        break;
      case "quote":
        contentMd += `> ${text}\n`;
        break;
      case "video":
        contentMd += `${text}\n\n`;
        break;
      case "code":
        contentMd += `\`\`\`${block.code.language}\n${block.code.rich_text[0].plain_text}\n\`\`\`\n\n`;
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
        contentMd += `${text}\n\n`;
        break;
      case "child_page":
        const page = await notion.pages.retrieve({ page_id: block.id });
        const slug = makeTitleSlug(block.child_page.title);
        parsePage(page).forEach((page) => pages.push(page));
        contentMd += `[${block.child_page.title}](./${slug})\n\n`;
        break;
      case "callout":
        // md to html conversion must happen here, it will not be picked up later
        // escape any sensitive characters
        contentMd += hbs.compile(
          `{{> ${block.type} content='${converter.makeHtml(text)}'}}\n\n`
        )();
        break;
      case "unsupported":
        break;
    }
  }
  return {
    markdown: contentMd,
    text: contentTxt,
    html: converter.makeHtml(contentMd),
  };
}

async function parsePage(page) {
  // Skip pages without a slug
  const pages = []
  if (!page.properties.Name.title[0]) return pages;

  const title = page.properties.Name.title[0].plain_text;
  let slug = page.properties.Slug.rich_text.length >= 1 ? page.properties.Slug.rich_text[0].plain_text : makeTitleSlug(title);

  if (slug !== "index" && process.env.ENVIRONMENT !== "production") {
    slug += ".html";
  }
  pages.push({
    id: page.id,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
    slug: slug,
    title: title,
    pageUrl: page.url,
    icon: page.icon,
    cover: page.cover,
    content: await getPageContent(pages, page.id),
  });

  return pages;
}

export async function loadDatabase() {
  let siteData = {};

  const query = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID,
  });

  for (const page of query.results) {
    (await parsePage(page)).forEach((page) => siteData[page.slug] = page);

  }
  return siteData;
}

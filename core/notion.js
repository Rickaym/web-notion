const fs = require("fs");
const { config } = require("dotenv");
const showdown = require("showdown");
const handlebars = require("handlebars");
const notionCfg = require("../notion.config");
const { Client } = require("@notionhq/client");

config();

fs.readdirSync(notionCfg.app.partialsDirectory).forEach((file) => {
  const partialName = file.split(".").slice(0, -1).join(".");
  const partialContent = fs.readFileSync(
    `${notionCfg.app.partialsDirectory}/${file}`,
    "utf-8"
  );
  handlebars.registerPartial(partialName, partialContent);
});

// register helpers
const helpers = require("./helpers");
Object.keys(helpers).forEach((helperName) => {
  handlebars.registerHelper(helperName, helpers[helperName]);
});

const converter = new showdown.Converter();
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const SITE_DATA = {};
const PARSED_PAGE_IDS = [];

function makeTitleSlug(title) {
  return title
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "");
}

async function blocksToMarkdown(blocks) {
  let markdown = [""];

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
    const l = markdown.length - 1;

    switch (block.type) {
      case "heading_1":
        markdown[l] += `# ${text}\n\n`;
        break;
      case "heading_2":
        markdown[l] += `## ${text}\n\n`;
        break;
      case "heading_3":
        markdown[l] += `### ${text}\n\n`;
        break;
      case "paragraph":
        markdown[l] += `${text}\n\n`;
        break;
      case "bulleted_list_item":
        markdown[l] += `* ${text}\n`;
        break;
      case "numbered_list_item":
        markdown[l] += `1. ${text}\n`;
        break;
      case "to_do":
        markdown[l] += `- [ ] ${text}\n`;
        break;
      case "toggle":
        markdown[l] += `> ${text}\n`;
        break;
      case "quote":
        markdown[l] += `> ${text}\n`;
        break;
      case "video":
        markdown[l] += `${text}\n\n`;
        break;
      case "code":
        markdown[
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
        markdown[l] += `${text}\n\n`;
        break;
      case "child_page":
        const page = await notion.pages.retrieve({ page_id: block.id });
        const slug = makeTitleSlug(block.child_page.title);
        SITE_DATA[page.slug] = {
          id: page.id,
          createdTime: page.created_time,
          slug: slug,
          title: block.child_page.title,
          pageUrl: page.url,
          icon: page.icon,
          cover: page.cover,
          content: await getPageContent(page.id),
        };
        markdown[l] += `[${block.child_page.title}](./${slug})\n\n`;
        break;
      case "callout":
        // md to html conversion must happen here, it will not be picked up later
        // escape any sensitive characters
        markdown.push(
          `{{> ${block.type} content='${converter.makeHtml(text)}'}}\n\n`
        );
        markdown.push("");
        break;
      case "unsupported":
        break;
    }
  }

  return markdown;
}

async function getPageContent(pageId) {
  if (PARSED_PAGE_IDS.includes(pageId)) return "";
  PARSED_PAGE_IDS.push(pageId);

  const blocks = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 50,
  });

  const markdown = await blocksToMarkdown(blocks.results);
  const html = markdown
    .map((text) =>
      text.startsWith("{{")
        ? handlebars.compile(text)()
        : converter.makeHtml(text)
    )
    .join("");
  return html;
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
      slug: page.properties.Slug.rich_text[0].plain_text,
      title: title,
      pageUrl: page.url,
      icon: page.icon,
      cover: page.cover,
      content: withContent ? await getPageContent(page.id) : null,
    });
  }

  return rows;
}

async function reloadDatabase() {
  const rows = await getDatabase(notionCfg.notion.databaseId, false);
  for (const row of rows) {
    if (SITE_DATA[row.slug] === undefined) {
      row.content = await getPageContent(row.id);
      SITE_DATA[row.slug] = row;
    } else if (SITE_DATA[row.slug].last_edited_time !== row.last_edited_time) {
      SITE_DATA[row.slug].content = await getPageContent(row.id);
    }
  }
}

async function loadDatabase() {
  const rows = await getDatabase(notionCfg.notion.databaseId, true);
  rows.forEach((row) => (SITE_DATA[row.slug] = row));
}
module.exports = {
  SITE_DATA: SITE_DATA,
  loadDatabase: loadDatabase,
  handlebars: handlebars,
};

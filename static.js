var fs = require("fs");
const fsExtra = require("fs-extra");
const notionCfg = require("./notion.config");
const { loadDatabase, SITE_DATA, handlebars } = require("./core/notion");

if (!fs.existsSync(notionCfg.app.buildDirectory)) {
  fs.mkdirSync(notionCfg.app.buildDirectory);
}
function generateFile(slug, content) {
  fs.writeFileSync(`${notionCfg.app.buildDirectory}/${slug}.html`, content);
}

function generateStatic() {
  const indexContent = handlebars.compile(fs
    .readFileSync(`${notionCfg.app.viewsDirectory}/index.hbs`, "utf-8")
    .toString());
  const pageContent = handlebars.compile(fs
    .readFileSync(`${notionCfg.app.viewsDirectory}/page.hbs`, "utf-8")
    .toString());
  const redirectContent = handlebars.compile(fs
    .readFileSync(`${notionCfg.app.viewsDirectory}/redirect.hbs`, "utf-8")
    .toString());

  const pages = { ...SITE_DATA };
  delete pages['index'];

  generateFile(
    "index",
    indexContent({
      layout: false,
      title: notionCfg.app.name,
      pages: pages,
      ...(SITE_DATA["index"] || {}),
    })
  );

  for (const page of Object.values(SITE_DATA)) {
    if (page.slug === "index") {
      if (notionCfg.notion.linkOriginalPage) {
        generateFile(
          "page",
          redirectContent({ pageUrl: page.pageUrl })
        );
      }
      continue;
    }

    generateFile(
      page.slug,
      pageContent({
        layout: false,
        title: notionCfg.app.name,
        ...page,
      })
    );

    if (notionCfg.notion.linkOriginalPage) {
      const subdir = `${notionCfg.app.buildDirectory}/${page.slug}`;
      if (!fs.existsSync(subdir)) {
        fs.mkdirSync(subdir);
      }
      generateFile(
        `${page.slug}/page`,
        redirectContent({ pageUrl: page.pageUrl })
      );
    }
  }

  try {
    fsExtra.copySync(
      `${notionCfg.app.staticDirectory}`,
      `${notionCfg.app.buildDirectory}`
    );
  } catch (err) {
    console.error("Error copying files:", err);
  }
  console.log("Build ended successfully.");
}

loadDatabase(true).then(() => generateStatic());

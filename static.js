// STATIC SITE GENERATOR

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { copySync } from "fs-extra";
import { app, notion } from "./notion.config.js";
import { loadDatabase, SITE_DATA, handlebars } from "./core/notion.js";

if (!existsSync(app.buildDirectory)) {
  mkdirSync(app.buildDirectory);
}
function generateFile(slug, content) {
  writeFileSync(`${app.buildDirectory}/${slug}.html`, content);
}

function generateStatic() {
  const indexContent = readFileSync(`${app.viewsDirectory}/index.hbs`, "utf-8")
    .toString();
  const pageContent = readFileSync(`${app.viewsDirectory}/page.hbs`, "utf-8")
    .toString();
  const redirectContent = readFileSync(`${app.viewsDirectory}/redirect.hbs`, "utf-8")
    .toString();

  const pages = {...SITE_DATA};
  delete pages['index'];

  generateFile(
    "index",
    handlebars.compile(indexContent)({
      layout: false,
      title: app.name,
      pages: pages,
      ...(SITE_DATA["index"] || {}),
    })
  );

  for (const page of Object.values(SITE_DATA)) {
    if (page.slug === "index") {
      if (notion.linkOriginalPage) {
        generateFile(
          "page",
          handlebars.compile(redirectContent)({ pageUrl: page.pageUrl })
        );
      }
      continue;
    }

    generateFile(
      page.slug,
      handlebars.compile(pageContent)({
        layout: false,
        title: app.name,
        ...page,
      })
    );

    if (notion.linkOriginalPage) {
      const subdir = `${app.buildDirectory}/${page.slug}`;
      if (!existsSync(subdir)) {
        mkdirSync(subdir);
      }
      generateFile(
        `${page.slug}/page`,
        handlebars.compile(redirectContent)({ pageUrl: page.pageUrl })
      );
    }
  }

  try {
    copySync(
      `${app.staticDirectory}`,
      `${app.buildDirectory}`
    );
  } catch (err) {
    console.error("Error copying files:", err);
  }
  console.log("Build ended successfully.");
}

loadDatabase(true).then(() => generateStatic());

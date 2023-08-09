// STATIC SITE GENERATOR

import { promises as fs } from "fs";
import { app, notion } from "../notion.config.js";
import { loadDatabase, handlebars } from "./notion.js";
import { get_content_slice } from "./helpers.js";

await fs.mkdir(app.buildDirectory).catch(() => { });

async function generateFile(slug, content) {
  await fs.writeFile(`${app.buildDirectory}/${slug}.html`, content);
}

async function generateStatic(siteData) {
  handlebars.registerHelper("get_content_slice", get_content_slice);

  const indexRender = handlebars.compile((await fs
    .readFile(`${app.viewsDirectory}/index.hbs`, "utf-8"))
    .toString());
  const pageRender = handlebars.compile((await fs
    .readFile(`${app.viewsDirectory}/page.hbs`, "utf-8"))
    .toString());
  const redirectRender = handlebars.compile((await fs
    .readFile(`${app.viewsDirectory}/redirect.hbs`, "utf-8"))
    .toString());

  const pages = { ...siteData };
  delete pages['index'];

  await generateFile(
    "index",
    indexRender({
      layout: false,
      title: app.name,
      pages: pages,
      ...(siteData["index"] || {}),
    })
  );

  for (const page of Object.values(siteData)) {
    if (page.slug === "index") {
      if (notion.linkOriginalPage) {
        await generateFile(
          "page",
          redirectRender({ pageUrl: page.pageUrl })
        );
      }
      continue;
    }

    await generateFile(
      page.slug,
      pageRender({
        layout: false,
        title: app.name,
        ...page,
      })
    );

    if (notion.linkOriginalPage) {
      const subdir = `${app.buildDirectory}/${page.slug}`;
      fs.mkdir(subdir).catch(() => { });
      await generateFile(
        `${page.slug}/page`,
        redirectRender({ pageUrl: page.pageUrl })
      );
    }
  }

  try {
    await fs.cp(
      app.staticDirectory,
      app.buildDirectory,
      { recursive: true }
    );
  } catch (err) {
    console.error("Error copying files:", err);
  }
  console.log("Build ended successfully.");
}



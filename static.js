// STATIC SITE GENERATOR

import { promises as fs } from "fs";
import { app, notion } from "./notion.config.js";
import { loadDatabase, SITE_DATA, handlebars } from "./core/notion.js";
import { get_content_slice } from "./core/helpers.js";

await fs.mkdir(app.buildDirectory).catch(() => { });

async function generateFile(slug, content) {
  await fs.writeFile(`${app.buildDirectory}/${slug}.html`, content);
}

async function generateStatic() {
  handlebars.registerHelper("get_content_slice", get_content_slice);

  const indexContent = handlebars.compile((await fs
    .readFile(`${app.viewsDirectory}/index.hbs`, "utf-8"))
    .toString());
  const pageContent = handlebars.compile((await fs
    .readFile(`${app.viewsDirectory}/page.hbs`, "utf-8"))
    .toString());
  const redirectContent = handlebars.compile((await fs
    .readFile(`${app.viewsDirectory}/redirect.hbs`, "utf-8"))
    .toString());

  const pages = { ...SITE_DATA };
  delete pages['index'];

  await generateFile(
    "index",
    indexContent({
      layout: false,
      title: app.name,
      pages: pages,
      ...(SITE_DATA["index"] || {}),
    })
  );

  for (const page of Object.values(SITE_DATA)) {
    if (page.slug === "index") {
      if (notion.linkOriginalPage) {
        await generateFile(
          "page",
          redirectContent({ pageUrl: page.pageUrl })
        );
      }
      continue;
    }

    await generateFile(
      page.slug,
      pageContent({
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
        redirectContent({ pageUrl: page.pageUrl })
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

loadDatabase(true).then(() => generateStatic());

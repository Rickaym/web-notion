import { promises as fs } from "fs";
import { Config, HandlebarsFactory, getPageRenderData } from "./setup.js";
import { loadDatabase } from "./notion.js";
import path from "path";

async function generateStaticFile(buildDirectory, slug, content) {
  let fp = path.join(buildDirectory, slug);
  if (!fp.endsWith(".html")) {
    fp += ".html";
  }
  await fs.writeFile(fp, content);
}

async function cleanBuildDirectory(buildDirectory) {
  const files = await fs.readdir(buildDirectory);
  for (const itemName of files) {
    const itemPath = path.join(buildDirectory, itemName);

    const stat = await fs.stat(itemPath);
    if (stat.isFile()) {
      await fs.unlink(itemPath);
    } else if (stat.isDirectory()) {
      await fs.rm(itemPath, { recursive: true });
    }
  }
}

export async function generateSSA() {
  const siteData = await loadDatabase(true);
  const appConfig = new Config().getJSON();
  const handlebars = new HandlebarsFactory().getImport();

  await fs.mkdir(appConfig.buildDirectory).catch(() => { });
  await cleanBuildDirectory(appConfig.buildDirectory);

  const indexRender = handlebars.compile(
    (
      await fs.readFile(path.join(appConfig.viewsDirectory, "index.hbs"), "utf-8")
    ).toString()
  );
  const pageRender = handlebars.compile(
    (
      await fs.readFile(path.join(appConfig.viewsDirectory, "page.hbs"), "utf-8")
    ).toString()
  );
  const redirectRender = handlebars.compile(
    (
      await fs.readFile(path.join(appConfig.viewsDirectory, "redirect.hbs"), "utf-8")
    ).toString()
  );

  await generateStaticFile(
    appConfig.buildDirectory,
    "index",
    indexRender(getPageRenderData(siteData, "index"))
  );

  for (const page of Object.values(siteData)) {
    if (page.slug === "index") {
      if (appConfig.linkOriginalPage) {
        await generateStaticFile(appConfig.buildDirectory, "page", redirectRender({ pageUrl: page.pageUrl }));
      }
      continue;
    }

    await generateStaticFile(
      appConfig.buildDirectory,
      page.slug,
      pageRender(getPageRenderData(siteData, page.slug))
    );

    if (appConfig.linkOriginalPage) {
      // remove .html from the slug to create a subdirectory
      const subdir = path.join(appConfig.buildDirectory, page.slug.replace(/\.html$/, ''));
      
      await fs.mkdir(subdir);
      await generateStaticFile(
        '',
        path.join(subdir, "page"),
        redirectRender({ pageUrl: page.pageUrl })
      );
    }
  }

  try {
    await fs.cp(appConfig.staticDirectory, appConfig.buildDirectory, {
      recursive: true,
    });
  } catch (err) {
    console.error("Error copying files:", err);
  }
  console.log("Build ended successfully.");
}

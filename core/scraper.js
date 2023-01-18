const puppeteer = require("puppeteer");
const fs = require("fs");
const config = require("../notion.config");
const { getSlug, isShareUrl } = require("./notion");

// Filter pages that has a custom slug
const redirectSlugs = {};
config.notion.subpages
  .filter((page) => page.customSlug)
  .forEach((page) => (redirectSlugs[page.slug] = page.customSlug));

const FS_URL_MAP = {
  cacheDir: "./public",
  staticDir: "./public",
  contentJsonName: "documentContent.json",
};
let cachedDocumentContent;

function existsCache() {
  return fs.existsSync(
    `${FS_URL_MAP["cacheDir"]}/${FS_URL_MAP["contentJsonName"]}`
  );
}

async function prepareDocumentContent(pageUrl, forceCache = false) {
  if (!existsCache() || forceCache) {
    cachedDocumentContent = await crawlDocument(pageUrl);
  } else {
    cachedDocumentContent = JSON.parse(
      fs.readFileSync(
        `${FS_URL_MAP["cacheDir"]}/${FS_URL_MAP["contentJsonName"]}`
      )
    );
  }
}

function getDocumentContent(slug = "index") {
  return cachedDocumentContent[slug];
}

async function crawlDocument(pageUrl) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const documentContent = {};
  await fetchDocumentContent(page, pageUrl, documentContent);
  fs.writeFile(
    `${FS_URL_MAP["cacheDir"]}/${FS_URL_MAP["contentJsonName"]}`,
    JSON.stringify(documentContent),
    (err) => {
      if (err) {
        console.error(err);
      }
    }
  );
  await browser.close();
  return documentContent;
}

async function fetchDocumentContent(page, pageUrl, documentContent) {
  /**
   * Extracts required HTML components from a notion share URL.
   *
   * Includs:
   *    notion-frame
   *    stylesheet
   */

  let slug = getSlug(pageUrl);

  // Index document will be referenced using 'index'
  // rather than its original slug.
  if (slug === config.notion.slug) {
    slug = "index";
  }

  if (Object.keys(redirectSlugs).includes(slug)) {
    slug = redirectSlugs[slug];
  }

  if (Object.keys(documentContent).includes(slug)) {
    return;
  }

  console.log(`Fetching "${pageUrl}" slug "${slug}"`);
  const pageContent = {};
  documentContent[slug] = pageContent;
  try {
    await page.goto(pageUrl, { waitUntil: "networkidle0" });
    await page.waitForSelector("div.notion-presence-container");

    const topbar = await page.$eval(
      "div.notion-topbar",
      (topbar) => topbar.outerHTML
    );
    pageContent["topbar"] = topbar;

    const frame = await page.$eval(
      "div.notion-frame",
      (frame) => frame.outerHTML
    );
    pageContent["frame"] = frame;

    // Ammending slugs occur before it is ever cached
    Object.keys(redirectSlugs).forEach(
      (slug) =>
        (pageContent["frame"] = pageContent["frame"].replace(
          slug,
          redirectSlugs[slug]
        ))
    );

    const styles = await page.$$eval("link[rel='stylesheet']", (link) =>
      link.map((l) => l.href)
    );
    pageContent["styles"] = styles
      .map((href) => `<link href='${href}' rel='stylesheet'>`)
      .join("\n");

    // Fetch subpages
    const subpages = await page.$$eval(
      "a[rel='noopener noreferrer']",
      (aTags) => aTags.map((a) => a.href).filter(href => isShareUrl(config.notion.domain, href))
    );
    for (let url of subpages) {
      await fetchDocumentContent(page, url, documentContent);
    }
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  prepareDocumentContent: prepareDocumentContent,
  getDocumentContent: getDocumentContent,
};

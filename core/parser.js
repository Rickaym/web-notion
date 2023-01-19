const fs = require("fs");
const puppeteer = require("puppeteer");
const config = require("../notion.config");
const { getSlug, isShareUrl, getShareURI } = require("./notion");

// Filter pages that has a custom slug
const slugCustomSlugMap = {};
const customSlugSlugMap = {};

config.notion.subpages
  .filter((page) => page.customSlug)
  .forEach((page) => {
    slugCustomSlugMap[page.slug] = page.customSlug;
    customSlugSlugMap[page.customSlug] = page.slug;
  });

const FS_URL_MAP = {
  cacheDir: "./public",
  staticDir: "./public",
  contentJsonName: "siteData.json",
};
const RE_TOPBAR_HEADING =
  /<div class="notranslate" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">([^<]*)<\/div>/;

let cachedSiteData;

function existsCache() {
  return fs.existsSync(
    `${FS_URL_MAP["cacheDir"]}/${FS_URL_MAP["contentJsonName"]}`
  );
}

function getSlugCanonical(slug) {
  if (slug === config.notion.slug) {
    slug = "index";
  }

  if (Object.keys(slugCustomSlugMap).includes(slug)) {
    slug = slugCustomSlugMap[slug];
  }
  return slug;
}

async function prepareDocumentContent(pageUrl, forceCache = false) {
  if (!existsCache() || forceCache) {
    cachedSiteData = await crawlDocument(pageUrl);
  } else {
    cachedSiteData = JSON.parse(
      fs.readFileSync(
        `${FS_URL_MAP["cacheDir"]}/${FS_URL_MAP["contentJsonName"]}`
      )
    );
  }
}

function getSiteData() {
  return cachedSiteData;
}

function getPageContent(slug) {
  return cachedSiteData.pages.find((page) => page.slug === slug);
}

function getMetaData(siteData) {
  /**
   * Generate site metadata such as the page slugs, headings, etc... under
   * the "meta" key in the site data json.
   */

  return {
    pageSlugs: Object.keys(siteData),
    headings: Object.values(siteData)
      .filter((page) => Object.keys(page).includes("topbar"))
      // for fail-proof, missing headings in top bars are simply set to spaces to be removed later
      .map((page) => (page.topbar.match(RE_TOPBAR_HEADING) || "  ")[1])
      .filter((heading) => heading !== " "),
  };
}

async function crawlDocument(pageUrl) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const siteData = { pages: [] };
  // documents fetched are automatically appended into sitedata.pages
  await fetchPageContent(page, pageUrl, siteData);

  fs.writeFile(
    `${FS_URL_MAP["cacheDir"]}/${FS_URL_MAP["contentJsonName"]}`,
    JSON.stringify(siteData),
    (err) => {
      if (err) {
        console.error(err);
      }
    }
  );
  await browser.close();
  return siteData;
}

function preparePageContent(HTML) {
  /**
   * Swap shared workspace relative URLs to absolute URLs.
   */
  const RE_RELATIVE_IMAGE_URL = /url\(&quot;\/images\//g;
  return HTML.replace(
    RE_RELATIVE_IMAGE_URL,
    `url(&quot;${getShareURI(config.notion.domain)}images/`
  ).replace(/"\/images\//g, `"${getShareURI(config.notion.domain)}images/`);
}

async function fetchPageContent(page, pageUrl, siteData) {
  /**
   * Extracts required HTML components from a notion share URL.
   */

  let slug = getSlugCanonical(getSlug(pageUrl));

  if (siteData.pages.find((page) => page.slug === slug)) {
    return;
  }

  console.log(`Fetching "${pageUrl}" slug "${slug}"`);
  const pageContent = { slug: slug, pageUrl: pageUrl };
  siteData.pages.push(pageContent);
  try {
    await page.goto(pageUrl, { waitUntil: "networkidle0" });
    await page.waitForSelector("div.notion-presence-container");

    const topbar = preparePageContent(
      // We have to get the parentNode here since it contains the main CSS
      await page.$eval(
        "div.notion-topbar",
        (topbar) => topbar.parentNode.outerHTML
      )
    );
    pageContent.topbar = topbar;

    // Heading unable to be parsed through regex should be set to null
    pageContent.heading = (topbar.match(RE_TOPBAR_HEADING) || [null, null])[1];

    const frame = preparePageContent(
      await page.$eval("div.notion-frame", (frame) => frame.outerHTML)
    );
    pageContent.frame = frame;

    // Ammending slugs occur before it is ever cached
    Object.keys(slugCustomSlugMap).forEach(
      (slug) =>
        (pageContent.frame = pageContent.frame.replace(
          slug,
          slugCustomSlugMap[slug]
        ))
    );

    const styles = await page.$$eval("link[rel='stylesheet']", (link) =>
      link.map((l) => l.href)
    );
    pageContent["styles"] = styles
      .map((href) => `<link href='${href}' rel='stylesheet'>`)
      .join("\n");

    // Fetch subpages
    const subpages = (
      await page.$$eval("a[rel='noopener noreferrer']", (aTags) =>
        aTags.map((a) => a.href)
      )
    ).filter((href) => isShareUrl(config.notion.domain, href));

    for (let url of subpages) {
      await fetchPageContent(page, url, siteData);
    }
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  prepareDocumentContent: prepareDocumentContent,
  getPageContent: getPageContent,
  customSlugSlugMap: customSlugSlugMap,
  getSlugCanonical: getSlugCanonical,
  getSiteData: getSiteData,
};

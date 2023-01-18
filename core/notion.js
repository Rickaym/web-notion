function getSlug(pageUrl) {
  return pageUrl.split("/").pop();
}

function getShareUrl(domain, slug) {
  return `https://${domain}.notion.site/${slug}`;
}

function isShareUrl(domain, pageUrl) {
  return pageUrl.startsWith(`https://${domain}.notion.site/`);
}

module.exports = {
  getSlug: getSlug,
  getShareUrl: getShareUrl,
  isShareUrl: isShareUrl,
};

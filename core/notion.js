function getSlug(pageUrl) {
  return pageUrl.split("/").pop();
}

function getShareURI(domain) {
  return `https://${domain}.notion.site/`;
}

function getShareUrl(domain, slug) {
  return `${getShareURI(domain)}${slug}`;
}

function isShareUrl(domain, pageUrl) {
  return pageUrl.startsWith(getShareURI(domain));
}

module.exports = {
  getSlug: getSlug,
  getShareUrl: getShareUrl,
  isShareUrl: isShareUrl,
  getShareURI: getShareURI,
};
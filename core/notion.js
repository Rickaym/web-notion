function getSlug(documentUrl) {
  return documentUrl.split("/").pop();
}

function getShareUrl(domain, slug) {
  return `https://${domain}.notion.site/${slug}`;
}

function isShareUrl(domain, documentUrl) {
  return documentUrl.startsWith(`https://${domain}.notion.site/`);
}

module.exports = {
  getSlug: getSlug,
  getShareUrl: getShareUrl,
  isShareUrl: isShareUrl,
};

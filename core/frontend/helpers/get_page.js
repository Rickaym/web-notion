const { getPageContent, getSiteData } = require("../../parser");

module.exports = function get_page(pageSlug, option) {
  return !option || typeof option != "string"
      ? getPageContent(pageSlug)
      : getPageContent(pageSlug)[option];
};

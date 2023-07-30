const { SITE_DATA } = require("./notion");

function get_page(pageSlug, key) {
  return SITE_DATA.find((page) => page.slug === pageSlug)[key];
};

module.exports = {
    get_page: get_page
};
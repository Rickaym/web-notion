function get_content_preview(content) {
  return content.substring(0, Math.min(250, content.length));
}

function get_page(pageSlug, key) {
  return SITE_DATA.find((page) => page.slug === pageSlug)[key];
};

module.exports = {
    get_page: get_page,
    get_content_preview: get_content_preview
};
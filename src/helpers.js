export function get_content_slice(content, length, fullSentences) {
  return fullSentences
    ? sentence_split(content, length)
    : content.substring(0, Math.min(length, content.length));
}

export function sentence_split(content, length) {
  const sentences = content.split(".");
  let result = "";
  let i = 0;
  while (result.length < length) {
    result += sentences[i] + ".";
    i++;
  }
  return result;
}

export function get_page(pageSlug, key) {
  return SITE_DATA.find((page) => page.slug === pageSlug)[key];
}

export function get_latest(pages) {
  // returns the latest page
  return Object.values(pages)
    .sort((a, b) => {
      return new Date(b.lastEditedTime) - new Date(a.lastEditedTime);
    })
    .slice(0, 1)[0];
}

export function get_readtime(content) {
  const wordsPerMinute = 200;
  const noOfWords = content.split(/\s/g).length;
  const minutes = noOfWords / wordsPerMinute;
  const readTime = Math.ceil(minutes);
  return `${readTime} MIN READ`;
}

export function get_datetime(date) {
  return new Date(date)
    .toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();
}


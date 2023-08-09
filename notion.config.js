export const app = {
  port: 3000,
  // the name of your app, as it will appear on the browser tab
  name: "Web-Notion",
  // do not edit the options below unless you know what you're doing
  staticDirectory: "./public",
  viewsDirectory: "./views",
  partialsDirectory: "./views/partials",
  buildDirectory: "./build",
};
export const notion = {
  // enabling this will register a `/page` route after every page that redirects
  // to the original notion page, including the index page.
  linkOriginalPage: true
};
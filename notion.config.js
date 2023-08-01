module.exports = {
  app: {
    port: 3000,
    name: "Web-Notion",
    staticDirectory: "./public",
    viewsDirectory: "./views",
    partialsDirectory: "./views/partials",
    buildDirectory: "./build",
  },
  notion: {
    databaseId: "c30f99b58b264a42b613070b56c88300",
    linkOriginalPage: true
  },
};
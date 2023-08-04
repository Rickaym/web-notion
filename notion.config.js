module.exports = {
  app: {
    port: 3000,
    // the name of your app, as it will appear on the browser tab
    name: "Web-Notion",
    // do not edit the options below unless you know what you're doing
    staticDirectory: "./public",
    viewsDirectory: "./views",
    partialsDirectory: "./views/partials",
    buildDirectory: "./build",
  },
  notion: {
    // get your database Id through the 'Share' -> 'Copy Link' option,
    // the id is the part right after the slash
    // i.e. https://www.notion.so/rickaym/c30f99b58b264a42b613070b56c88300?v=b27db66b32cc440e809b3fe13a9a6170&pvs=4
    //                                    ^^^^^^^^^ database id ^^^^^^^^^^
    databaseId: "c30f99b58b264a42b613070b56c88300",

    // enabling this will register a `/page` route after every page that redirects
    // to the original notion page, including the index page.
    linkOriginalPage: true
  },
};
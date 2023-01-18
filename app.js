const express = require("express");
const hbs = require("express-handlebars");
const config = require("./notion.config");
const {
  prepareDocumentContent,
  getDocumentContent,
} = require("./core/scraper");
const { getShareUrl } = require("./core/notion");

function initApp() {
  const app = express();

  // Initializing handlebars engine
  app.engine(
    "hbs",
    hbs.engine({
      extname: "hbs",
      layoutsDir: __dirname + "/views/layouts",
      partialsDir: __dirname + "/views/partials",
    })
  );
  app.set("view engine", "hbs");
  app.set("views", "./views");

  // Static files should be under 'public'
  app.use(express.static("public"));

  app.get("/", (req, res) => {
    return res.render("default", {
      layout: "index",
      title: config.app.name,
      ...getDocumentContent("index"),
    });
  });

  app.get("/:slug", (req, res) => {
    return res.render("default", {
      layout: "index",
      title: config.app.name,
      ...getDocumentContent(req.params.slug),
    });
  });

  app.listen(config.app.port, () => {
    console.log(
      `App "${config.app.name}" listening on localhost:${config.app.port}.`
    );
  });
}

prepareDocumentContent(
  getShareUrl(config.notion.domain, config.notion.slug),
  (forceCache = true)
).then(() => initApp());
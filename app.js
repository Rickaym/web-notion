const express = require("express");
const hbs = require("express-handlebars");
const config = require("./notion.config");

const pino = require("pino-http")({
  quietReqLogger: true, // turn off the default logging output
  transport: {
    target: "pino-http-print", // use the pino-http-print transport and its formatting output
    options: {
      destination: 1,
      all: true,
      translateTime: true,
    },
  },
});

const {
  prepareDocumentContent,
  getSiteData,
  getPageContent,
} = require("./core/parser");
const { getShareUrl } = require("./core/notion");

function initApp() {
  hbs.register;
  const app = express();

  // Initializing handlebars engine
  console.log(require("./core/frontend/helpers/helpers"));
  app.engine(
    "hbs",
    hbs.engine({
      extname: "hbs",
      partialsDir: __dirname + "/views/partials",
      helpers: require("./core/frontend/helpers/helpers"),
    })
  );
  app.set("view engine", "hbs");
  app.set("views", "./views");

  app.use(express.static(config.app.staticDir || "public"));
  app.use(pino);

  const siteData = getSiteData();

  app.get("/", (req, res) =>
    res.render("index", {
      layout: false,
      title: config.app.name,
      ...siteData,
    })
  );

  for (const page of siteData.pages) {
    if (page.slug === "index") {
      if (config.notion.linkPage) {
        app.get("/page", (req, res) => res.redirect(page.pageUrl));
      }
      continue;
    }

    app.get(`/${page.slug}`, (req, res) =>
      res.render("page", {
        layout: false,
        title: config.app.name,
        ...getPageContent(page.slug),
      })
    );

    if (config.notion.linkPage) {
      app.get(`/${page.slug}/page`, (req, res) => res.redirect(page.pageUrl));
    }
  }

  app.listen(config.app.port, () => {
    console.log(
      `App "${config.app.name}" listening on http://localhost:${config.app.port}`
    );
  });
}

prepareDocumentContent(
  getShareUrl(config.notion.domain, config.notion.slug),
  // (forceCache = true)
).then(() => initApp());

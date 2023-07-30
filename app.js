const express = require("express");
const exphbs = require("express-handlebars");
const notionCfg = require("./notion.config");
const pinoLogger = require("pino");
const { loadDatabase, SITE_DATA } = require("./core/notion");

const pino = require("pino-http")(
  {
    quietReqLogger: true, // turn off the default logging output
    transport: {
      target: "pino-http-print", // use the pino-http-print transport and its formatting output
      options: {
        destination: 1,
        all: true,
        translateTime: true,
      },
    },
  },
  pinoLogger.pino.destination(`${__dirname}/logs/combined.log`)
);

const hbs = exphbs.create({
  extname: "hbs",
  partialsDir: __dirname + notionCfg.app.partialsDirectory,
  helpers: require("./core/helpers"),
});

hbs.getPartials()

function initApp() {
  const app = express();
  // Initializing handlebars engine
  app.engine("hbs", hbs.engine);
  app.set("view engine", "hbs");
  app.set("views", notionCfg.app.viewsDirectory);

  app.use(express.static(notionCfg.app.staticDir || "public"));
  app.use(pino);

  app.get("/", (req, res) =>
    res.render("index", {
      layout: false,
      title: notionCfg.app.name,
      pages: SITE_DATA,
      ...SITE_DATA["index"] || {},
    })
  );

  for (const page of Object.values(SITE_DATA)) {
    if (page.slug === "index") {
      if (notionCfg.notion.linkOriginalPage) {
        app.get("/page", (req, res) => res.redirect(page.pageUrl));
      }
      continue;
    }

    app.get(`/${page.slug}`, (req, res) =>
      res.render("page", {
        layout: false,
        title: notionCfg.app.name,
        ...page,
      })
    );

    if (notionCfg.notion.linkOriginalPage) {
      app.get(`/${page.slug}/page`, (req, res) => res.redirect(page.pageUrl));
    }
  }

  app.listen(notionCfg.app.port, () => {
    console.log(
      `App "${notionCfg.app.name}" listening on http://localhost:${notionCfg.app.port}`
    );
  });
}

loadDatabase(true).then(() => initApp());

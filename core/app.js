import express, { static as static_ } from "express";
import { create } from "express-handlebars";
import { app as _app, notion } from "../notion.config.js";
import { pino as _pino } from "pino";
import { loadDatabase, SITE_DATA } from "./notion.js";
import pinoHttp from "pino-http";
import * as helpers from "./helpers.js";

const pino = pinoHttp(
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
  _pino.destination(`./logs/combined.log`)
);

const hbs = create({
  extname: "hbs",
  partialsDir: _app.partialsDirectory,
  helpers,
});

hbs.getPartials();

function initApp() {
  const app = express();
  // Initializing handlebars engine
  app.engine("hbs", hbs.engine);
  app.set("view engine", "hbs");
  app.set("views", _app.viewsDirectory);

  app.use(static_(_app.staticDir || "public"));
  app.use(pino);

  app.get("/", (req, res) =>
    res.render("index", {
      layout: false,
      title: _app.name,
      pages: SITE_DATA,
      ...(SITE_DATA["index"] || {}),
    })
  );

  for (const page of Object.values(SITE_DATA)) {
    if (page.slug === "index") {
      if (notion.linkOriginalPage) {
        app.get("/page", (req, res) => res.redirect(page.pageUrl));
      }
      continue;
    }

    app.get(`/${page.slug}`, (req, res) =>
      res.render("page", {
        layout: false,
        title: _app.name,
        ...page,
      })
    );

    if (notion.linkOriginalPage) {
      app.get(`/${page.slug}/page`, (req, res) => res.redirect(page.pageUrl));
    }
  }

  app.listen(_app.port, () => {
    console.log(
      `App "${_app.name}" listening on http://localhost:${_app.port}`
    );
  });
}


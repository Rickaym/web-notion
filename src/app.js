import express, { static as static_ } from "express";
import { pino as _pino } from "pino";
import { Config, HandlebarsFactory, getPageRenderData } from "./setup.js";
import pinoHttp from "pino-http";
import { loadDatabase } from "./notion.js";

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
);

export async function initializeExpressApp() {
  const siteData = await loadDatabase(true);
  const appConfig = new Config().getJSON();
  const app = express();
  const hbs = new HandlebarsFactory().getCompiler();

  // Initializing handlebars engine
  app.engine("hbs", hbs.engine);
  app.set("view engine", "hbs");
  app.set("views", appConfig.viewsDirectory);

  app.use(static_(appConfig.staticDir || "public"));
  app.use(pino);

  app.get("/", (req, res) =>
    res.render("index", getPageRenderData(siteData, "index"))
  );

  for (const page of Object.values(siteData)) {
    if (page.slug === "index") {
      if (appConfig.linkOriginalPage) {
        app.get("/page", (req, res) => res.redirect(page.pageUrl));
      }
      continue;
    }

    app.get(`/${page.slug}`, (req, res) =>
      res.render("page", getPageRenderData(siteData, page.slug))
    );

    if (appConfig.linkOriginalPage) {
      app.get(`/${page.slug}/page`, (req, res) => res.redirect(page.pageUrl));
    }
  }

  app.listen(appConfig.port, () => {
    console.log(
      `App "${appConfig.name}" listening on http://localhost:${appConfig.port}`
    );
  });
}

import { create } from "express-handlebars";
import { promises as fs } from "fs";
import * as helpers from "./helpers.js";

export class Config {
  constructor() {
    if (Config.instance) {
      return Config.instance;
    }

    Config.instance = this;
  }

  async loadConfig(filePath) {
    try {
      const rawData = await fs.readFile(filePath);
      this.configData = JSON.parse(rawData);
    } catch (error) {
      console.error("Error reading JSON config:", error);
    }
  }

  getJSON() {
    return this.configData;
  }
}

export class HandlebarsFactory {
  constructor() {
    if (HandlebarsFactory.instance) {
      return HandlebarsFactory.instance;
    }

    HandlebarsFactory.instance = this;
  }

  async setup() {
    const config = new Config().getJSON();
    const hbs = create({
      extname: "hbs",
      partialsDir: config.partialsDirectory,
      helpers,
    });
    hbs.getPartials();

    Object.keys(helpers).forEach((helperName) => {
      hbs.handlebars.registerHelper(helperName, helpers[helperName]);
    });

    (await fs.readdir(config.partialsDirectory)).forEach(async (file) => {
      hbs.handlebars.registerPartial(
        file.split(".").slice(0, -1).join("."),
        await fs.readFile(`${config.partialsDirectory}/${file}`, "utf-8")
      );
    });
    this.hbs = hbs;
  }

  /**
   * @returns {import("express-handlebars").ExpressHandlebars} the instance of the handlebars compiler
   */
  getCompiler() {
    return this.hbs;
  }

  /**
   *
   * @returns {import("handlebars")} the instance of the handlebars compiler
   */
  getImport() {
    return this.hbs.handlebars;
  }
}

/**
 *
 * @param {Object.<string, string>} siteData
 * @param {string} pageSlug
 * @returns data for rendering the handlebars template
 */
export function getPageRenderData(siteData, pageSlug) {
  const config = new Config().getJSON();
  const page = siteData[pageSlug];
  const data = {
    layout: false,
    title: config.name,
    ...page,
  };

  if (pageSlug === "index") {
    data.pages = { ...siteData };
    delete data.pages["index"];
  }
  return data;
}

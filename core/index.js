#! /usr/bin/env node

import { generateStatic } from "./static.js";
import { loadDatabase } from "./database.js";
import { initApp } from "./app.js";

const args = process.argv.slice(1);
if (args.length < 1) {
  console.error("Please enter at least 1 argument.");
  process.exit(1); //an error occurred
}

const mode = args[0];

loadDatabase(true).then(() => {
  if (mode === "init") {
  } else if (mode === "build") {
    generateStatic(siteData);
  } else if (mode === "serve") {
    initApp();
  }
});

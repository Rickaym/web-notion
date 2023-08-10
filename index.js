#!/usr/bin/env node
"use strict";

import { ArgumentParser } from "argparse";
import { promises as fs } from "fs";

import { Config, HandlebarsFactory } from "./src/setup.js";
import { initializeExpressApp } from "./src/app.js";
import { generateSSA } from "./src/generateStatic.js";

const version = JSON.parse(
  await fs.readFile("./package.json")
).version;

const parser = new ArgumentParser({
  description: "Web-Notion CLI",
});

// Add a subparsers object to the main parser
const subparsers = parser.add_subparsers({
  title: 'commands',
  dest: 'command',
  required: true // makes sure one of the subcommands must be provided
});

const buildParser = subparsers.add_parser('build', { help: 'Build a static site application.', add_help: true });
buildParser.set_defaults({ func: generateSSA });

const serveParser = subparsers.add_parser('serve', { help: 'Serve the express.js app.', add_help: true });
serveParser.set_defaults({ func: initializeExpressApp });

parser.add_argument("-v", "--version", { action: "version", version: `v${version}` });

parser.add_argument("-c", "--config", {
  help: "Path to the notion.config.json file.",
  default: "./notion.config.json",
});

const args = parser.parse_args();

// Load the config file and setup handlebars
await (new Config().loadConfig(args.config));
await (new HandlebarsFactory().setup());

args.func(args);
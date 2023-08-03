# Web-Notion

[![Deploy Static Content](https://github.com/Rickaym/web-notion/actions/workflows/static.yml/badge.svg)](https://github.com/Rickaym/web-notion/actions/workflows/static.yml)

Web-notion is an express-handlebar based web server that uses Notion as a database to source content. It is built to be hosted on a server, but can also be hosted statically.

# Table of Contents

- [Get Started](#get-started)
- [Overview](#overview)
  - [Custom Layouts](#custom-layouts)
  - [Handlebars](#handlebars)
- [Hosting](#hosting)
    - [Static Hosting](#static-hosting)
    - [Webserver Hosting](#webserver-hosting)

## Get Started

1. Clone the repository

```bash
git clone https://github.com/Rickaym/web-notion.git
```
2. Setup your Notion API integration [here](https://developers.notion.com/docs/create-a-notion-integration) and copy the integration token into `.env`
3. Configure [`notion.config.js`](./notion.config.js); further details are in the file
4. Design your handlebar layouts under [`/views`](./views)
5. Run the project!

## Overview

Web-notion serves pages based on a notion database. This is done by mapping each page in the database to an endpoint that returns the rendered HTML of the page. The database is specified in [`notion.config.js`](./notion.config.js) and is loaded at runtime on a webserver or buildtime when statically generated.

The database is loaded using the [notion-api-worker](./core/notion.js) through the Notion API Integration.

Web-notion serves pages through the following steps:

1. The notion database is loaded and parsed into a list of pages
2. Each page is mapped to an endpoint
2. The Markdown content on each pgae is converted to HTML
3. When an endpoint is called, the page content is fetched from the list of pages and rendered into the specified layout using handlebars
4. The rendered HTML is dispatched

*Note: Static hosting is achieved by running through these steps once and storing them for later use*

This process enables us to render the decorated markdown content from Notion straight whilst still hvaing it in a custom layout.

### Custom Layouts

There are two main layouts web-notion uses to generate HTML pages.

1. `views/index.hbs` - for generating the root page of the website
2. `views/page.hbs` - for non-index and nested pages

You can edit these layouts to customize the website.

### Handlebars

When rendering the page content into the layout, a dictionary of context values based on the notion document is provided.

E.g.

```json
{
    "id": "e78f702d-bed1-413e-9623-a93aa9b7d05d",
    "createdTime": "2023-07-30T03:26:00.000Z",
    "slug": "index",
    "title": "Web-Notion",
    "pageUrl": "https://www.notion.so/Web-Notion-e78f702dbed1413e9623a93aa9b7d05d",
    "icon": null,
    "cover": null,
    "content": "..."
}
```

Both the `page.hbs` and `index.hbs` layout have these variables at their disposal, whilst `index.hbs` is provided the context of the index page and `page.hbs` is provided the page being rendered.

*Note, `index.hbs` also gets an extra variable called **pages** which is a list of all pages in the format of the object above.*

## Hosting

### Static Hosting

Hosting web-notion statically is possible. It is achieved through [a static site generation workflow](https://github.com/Rickaym/web-notion/blob/master/.github/workflows/static.yml) that does the job of fetching content and rendering it all in build time. The drawback however is that changes to the notion document will not be rendered unless the site is rebuilt. (this website is is static!)

### Webserver Hosting

Web-notion is built to be hosted on a server and is the recommended way of hosting.

Follow these steps to host web-notion on a webserver (this requires the steps in Getting Started to be done):

1. Clone the repository
2. Install dependencies

```bash
npm install
```
3. Run the project

```bash
npm start
```

*Note: You can also use `npm run dev` to run the project in development mode which will restart the server on file changes*

4. Visit the website at `http://localhost:port`


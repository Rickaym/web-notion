# Web-Notion

[![Deploy Static Content](https://github.com/Rickaym/web-notion/actions/workflows/static.yml/badge.svg)](https://github.com/Rickaym/web-notion/actions/workflows/static.yml)

Web-notion is an express-handlebar based web server that uses Notion as a database. It is built to be hosted statically, but can also be hosted on a webserver to render updates dynamically.

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
2. Get your Notion API key by setting up an integration [here](https://developers.notion.com/docs/create-a-notion-integration)
3. Copy the integration secret into `.env`
4. Configure [`notion.config.js`](./notion.config.js) read the comments in the file for more information
5. Design your html layouts (with hbs) under [`/views`](./views)
6. Run the project

```bash
npm start
```

## Overview

Web notion serves pages using a notion database. Each document in the notion database is fetched and rendered into HTML through the corresponding layout.

There are two main layouts:

1. `views/index.hbs` - this layout is used to render the root page of the website
2. `views/page.hbs` - this layout is used for everything else; non-index and nested pages

Edit these layouts to customize the website.

The rendered HTML content is then mapped to a route that is the slug of the notion document.

Web-notion serve pages in this manner:

1. The notion database is loaded and parsed into a list of pages
2. Each page is mapped to an endpoint
2. The Markdown content on each pgae is converted to HTML
3. When an endpoint is called, the page content is fetched from the list of pages and rendered into the specified layout using handlebars
4. The rendered HTML is dispatched

*Note: Static hosting is achieved by running through these steps only once and storing them for later use*

This process enables us to render the decorated markdown content from Notion straight whilst still hvaing it in a custom layout.

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

Follow these steps to host web-notion on a webserver (this requires the steps in Getting Started to be done):

1. Install dependencies

```bash
npm install
```
2. Run the project

```bash
npm start
```

# Web-Notion

[![Deploy Static Content](https://github.com/Rickaym/web-notion/actions/workflows/static.yml/badge.svg)](https://github.com/Rickaym/web-notion/actions/workflows/static.yml)

Web-notion is an express-handlebar based web server that uses Notion as a content database. It is built to be hosted statically with sparsely edited content, so it must be rebuilt every time there are major changes to the database. However, it can also be hosted on a webserver to render updates dynamically.

# Table of Contents

- [Get Started](#get-started)
- [Overview](#overview)
  - [Custom Layouts](#custom-layouts)
  - [Handlebars](#handlebars)
- [Hosting](#hosting)
    - [Static Hosting](#static-hosting)
    - [Webserver Hosting](#webserver-hosting)

## Get Started

### Pre-requisites
1. Clone the repository

```bash
git clone https://github.com/Rickaym/web-notion.git
```

2. Install dependencies
```bash
npm install
```

### Setup Notion

3.  Create a Notion integration by following [Step 1: Create an integration](https://developers.notion.com/docs/create-a-notion-integration#step-1-create-an-integration) from the official docs, this is required to access the database
4. Create a file named `.env` in the project root and copy the integration secret into it in the format of `NOTION_API_KEY="{secret}"`
5. Then follow [Step 2: Share a database with your integration](https://developers.notion.com/docs/create-a-notion-integration#step-2-share-a-database-with-your-integration) and setup the database to be used with the integration
6. Copy the ID of the database [like this](https://developers.notion.com/docs/create-a-notion-integration#step-3-save-the-database-id) and set it to `databaseId` in [`notion.config.js`](./notion.config.js)

7. Run the project!
```bash
npm start
```

## Overview

The database that is needed to be used must have the following two columns:
1. `Name` - This is where the page itself is stored
2. `Slug` (optional) - This is where the slug of the page is stored, if a value is not present in this column, a slug will be made automatically through the name of the page

For example:
![Notion Database](./readme/database.png)

The content for each page should be stored inside the nested page of the `Name` column. When web-notion serves this page, it will render the content of the nested page into a handlebar layout.

There are two main layouts:

1. `views/index.hbs` - This layout is used to render the root page of the website
2. `views/page.hbs` - This layout is used for everything else; non-index and nested pages

You can edit these layouts to customize the look of the website. When editing these layouts, you are provided with the following variables:



The rendered HTML content is then mapped to a route at the slug of the Notion document.

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

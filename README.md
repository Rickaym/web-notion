# Web-Notion

[![Deploy Static Content](https://github.com/Rickaym/web-notion/actions/workflows/static.yml/badge.svg)](https://github.com/Rickaym/web-notion/actions/workflows/static.yml)

Web-Notion is a Node.js application that serves a website using Notion databases as the content management system (CMS), it can be hosted as an SSA as well as on a webserver.

# Table of Contents

- [Get Started](#get-started)
  - [Installation](#installation)
  - [Setup Database](#setup-database)
  - [Setup Notion](#setup-notion)
  - [Customizing the Website](#customizing-the-website)
- [Examples](#examples)
- [Hosting](#hosting)
  - [Static Hosting](#static-hosting)
  - [Webserver Hosting](#webserver-hosting)

## Get Started

Web-notion works by fetching the content of a Notion database and rendering it into a website. It does this by using the [Notion API](https://developers.notion.com/) to fetch the content of the database and [handlebars.js](https://handlebarsjs.com/) to render the content into a website.

To get started, follow these steps:

### Installation
1. Install `web-notion` CLI

```bash
npm i -g web-notion
```

2. Clone the template repository [web-notion-template](https://github.com/Rickaym/web-notion-template), this is the repository that contains the handlebars layouts for rendering content, this is where you will be customizing the website (more on it [here](#customizing-the-website)).

```bash
git clone https://github.com/Rickaym/web-notion-template.git
```
### Setup Database

3. Create a new database in Notion (does not need to be public) Ensure that the database these two columns:
- `Name` - This is where the page itself is stored
- `Slug` (optional) - This is where the slug of the page is stored, if a value is not present in this column, a slug will be made using the name of the page

E.g.

![Notion Database](./readme/database.png)

The content for each page should be stored inside the nested page of the `Name` column.

### Setup Notion

4.  Create a Notion integration by following [Step 1: Create an integration](https://developers.notion.com/docs/create-a-notion-integration#step-1-create-an-integration) from the official docs, this is required to access the database
4. Create a file named `.env` in the project root and copy the integration secret into it in the format of `NOTION_API_KEY="{secret}"`
5. Then follow [Step 2: Share a database with your integration](https://developers.notion.com/docs/create-a-notion-integration#step-2-share-a-database-with-your-integration) and setup the database to be used with the integration
6. Copy the ID of the database [like this](https://developers.notion.com/docs/create-a-notion-integration#step-3-save-the-database-id) and set it to `NOTION_DATABASE_ID` in `.env`

The `.env` file should look like this when you are done:

```env
NOTION_API_KEY="secret_..."
NOTION_DATABASE_ID="...-...-..-.."
```

8. **✨ Run the project!**
```bash
npx web-notion serve
```

## Customizing the Website

Handlebars layouts are provided with HTML, Markdown and Text variants of content when rendering into HTML. This lets us take advantage of the Markdown format that notion provides by default.

There are two main layouts that are used to render the pages:

1. `web-notion-template/views/index.hbs` - This layout is used to render the root page of the website
2. `web-notion-template/views/page.hbs` - This layout is used for everything else; non-index and nested pages

You are provided with the following data in the layouts:

```json
{
        "id": "e78f702d-bed1-413e-9623-a93aa9b7d05d",
        "createdTime": "2023-07-30T03:26:00.000Z",
        "lastEditedTime": "2023-08-04T15:32:00.000Z",
        "slug": "index",
        "title": "Web-Notion",
        "pageUrl": "https://www.notion.so/Web-Notion-e78f702dbed1413e9623a93aa9b7d05d",
        "icon": null,
        "cover": null,
        "content": {
            "markdown": "...",
            "text": "...",
            "html": "..."
        }
    }
```

To use these variables, you can use the following syntax in your layout:

```handlebars
{{variable}}
```

While both of the layouts have these variables (`index.hbs` with the data of the index page and `page.hbs` with the page being rendered) `index.hbs` gets a special variable called `pages`, a list of objects of all the pages (without the index page).

## Examples

Refer to the [web-notion-template](https://github.com/Rickaym/web-notion-template) repository as an example.

## Hosting

### Static Hosting

Hosting web-notion as a static site is the easiest way to host it, it is also the cheapest way to host it as it can be hosted on GitHub Pages for free. But as it only pulls data from Notion when the site is built, it is not suitable for websites that require real-time updates.

To generate the static site, run the following command:

```bash
npx web-notion build
```

### Webserver Hosting

To host web-notion on a webserver, you will need to run the following command:

```bash
npx web-notion serve
```

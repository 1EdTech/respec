# Drupal stylesheet

Normal Respec documents like `1edtech-examples/basic.html` are rendered on the fly when you first load the document. Every plug-in is run in order. Many plug-ins reformat or add content to the document. And many plug-ins add a stylesheet to the `<head>` of the document.

When you export the document for CMS, only a portion of the body is exported and then imported into the CMS. That means all the stylesheets are thrown away. When Drupal renders the document, Drupal inserts is own pre-generated stylesheet.

This folder is where the pre-generated stylesheet 'drupal.css' lives!

## Instructions for deploying a new Drupal stylesheet

1. Run the `combine-styles` tool from the root of the repo:

   ```bash
   node ./tools/combine-styles.js --localhost ./1edtech-examples/basic.html ./src/1edtech/styles/drupal.css
   ```

2. If `./drupal.css` changed, send `./drupal.css` to Joe Miller and let them know it is a replacement for Drupal's Respec stylesheet

## What if I want to test it before sending it to Drupal

Load `/1edtech-examples/basic.drupal.html` in a browser. It simulates Drupal by only loading `./drupal.css`.

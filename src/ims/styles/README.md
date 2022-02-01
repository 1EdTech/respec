# Drupal stylesheet

Normal Respec documents like `../ims-basic.html` are rendered on the fly when you first load the document. Every plug-in is run in order. Many plug-ins reformat or add content to the document. And many plug-ins add a stylesheet to the `<head>` of the document.

When you export the document for CMS, only the `<body>` contents are exported and then imported into Drupal. That means all the stylesheets are thrown away. When Drupal renders the document, Drupal inserts is own pre-generated stylesheet.

This folder is where the pre-generated stylesheet is generated!

## Instructions for generating a new Drupal stylesheet

1. Open `./drupal.scss`
2. For each imported stylesheet, open the `/src/styles/{stylesheeet}.css.js` file
   - The exception is `base.scss`. You can find the contents at [https://www.w3.org/StyleSheets/TR/2016/base.css](https://www.w3.org/StyleSheets/TR/2016/base.css).
3. The styles are defined as a string constant. Copy the styles to your clipboard.
4. Paste the styles into `./{stylesheet}.scss`

When you are done updating the source files

1. Compile `./drupal.scss` to create `./drupal.css` which is a combination of all the individual stylesheets that Respec normally adds
2. If `./drupal.css` changed, send `./drupal.css` to Lisa Mattson and let her know it is a replacement for Drupal's Respec stylesheet

## What if I want to test it first?

Load `/ims-examples/ims-basic.drupal.html` in a browser. It simulates Drupal by only loading `./drupal.css`.

## Can this be automated?

Probably.

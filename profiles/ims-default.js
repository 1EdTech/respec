"use strict";
// In case everything else fails, we want the error
window.addEventListener("error", ev => {
  console.error(ev.error, ev.message, ev);
});

// Based on w3c-common profile
const modules = [
  // order is significant
  import("../src/core/base-runner.js"),
  import("../src/ims/ui.js"),
  import("../src/core/location-hash.js"),
  import("../src/core/l10n.js"),
  import("../src/core/style.js"),
  import("../src/ims/style.js"),
  // Check configuration
  import("../src/ims/config.js"),
  // Compute common values
  import("../src/ims/compute.js"),
  // Process transcludes
  import("../src/ims/transclude.js"),
  // Don't use github
  // import("../src/core/github.js"),
  import("../src/core/data-include.js"),
  import("../src/core/markdown.js"),
  import("../src/core/reindent.js"),
  // Make sure markdown abstract has an id
  import("../src/core/id-headers.js"),
  // Check for abstract
  import("../src/ims/abstract.js"),
  // Add introductory class to abstract
  import("../src/ims/post-markdown.js"),
  import("../src/core/data-transform.js"),
  import("../src/core/data-abbr.js"),
  // Make sure markdown conformance section has an id
  import("../src/ims/inlines.js"),
  import("../src/core/inlines.js"),
  import("../src/ims/conformance.js"),
  import("../src/core/dfn.js"),
  import("../src/core/pluralize.js"),
  import("../src/core/examples.js"),
  import("../src/ims/issues-notes.js"),
  import("../src/core/best-practices.js"),
  import("../src/core/figures.js"),
  import("../src/core/webidl.js"),
  // Import IMS biblio
  import("../src/ims/biblio.js"),
  import("../src/core/biblio.js"),
  import("../src/core/link-to-dfn.js"),
  import("../src/core/xref.js"),
  import("../src/core/data-cite.js"),
  import("../src/core/webidl-index.js"),
  import("../src/core/render-biblio.js"),
  import("../src/core/dfn-index.js"),
  import("../src/ims/contrib.js"),
  import("../src/core/fix-headers.js"),
  import("../src/core/structure.js"),
  import("../src/core/informative.js"),
  import("../src/core/id-headers.js"),
  import("../src/core/caniuse.js"),
  import("../src/core/mdn-annotation.js"),
  import("../src/ims/save-html.js"),
  import("../src/ims/search-specref.js"),
  import("../src/ims/search-xref.js"),
  import("../src/ims/dfn-list.js"),
  import("../src/ims/about-respec.js"),
  import("../src/core/seo.js"),
  import("../src/ims/seo.js"),
  import("../src/core/highlight.js"),
  import("../src/core/webidl-clipboard.js"),
  import("../src/core/data-tests.js"),
  import("../src/core/list-sorter.js"),
  import("../src/core/highlight-vars.js"),
  import("../src/core/dfn-panel.js"),
  import("../src/core/data-type.js"),
  import("../src/core/algorithms.js"),
  import("../src/core/anchor-expander.js"),
  import("../src/core/custom-elements/index.js"),
  // Add IMS boilerplate content
  import("../src/ims/boilerplate.js"),
  // Clean up the document
  import("../src/ims/cleanBody.js"),
  // Add title attributes to internal definition references
  import("../src/ims/title-attrs.js"),
  // Insert IMS stylesheet
  import("../src/ims/scripts.js"),
  // Not working...disable until fixed
  // import("../src/ims/tooltips.js"),
  // Remove all comment nodes
  import("../src/ims/comments.js"),
  /* Linters must be the last thing to run */
  import("../src/core/linter.js"),
  import("../src/core/a11y.js"),
];

async function domReady() {
  if (document.readyState === "loading") {
    await new Promise(resolve =>
      document.addEventListener("DOMContentLoaded", resolve)
    );
  }
}

(async () => {
  const [runner, { ui }, ...plugins] = await Promise.all(modules);
  try {
    ui.show();
    await domReady();
    await runner.runAll(plugins);
  } finally {
    ui.enable();
  }
})().catch(err => {
  console.error(err);
});

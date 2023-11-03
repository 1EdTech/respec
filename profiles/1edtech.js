import * as ReSpec from "../src/respec.js";

const modules = [
  // order is significant
  import("../src/core/location-hash.js"),
  import("../src/core/l10n.js"),
  import("../src/1edtech/defaults.js"),
  import("../src/core/style.js"),
  import("../src/1edtech/style.js"),
  // Check configuration
  import("../src/1edtech/config.js"),
  // Compute common values
  import("../src/1edtech/compute.js"),
  // Process transcludes
  import("../src/1edtech/transclude.js"),
  import("../src/core/github.js"),
  import("../src/core/data-include.js"),
  // Model Processing Service plugin
  import("../src/1edtech/mps.js"),
  // Add the 1EdTech privacy appendix
  import("../src/1edtech/privacy.js"),
  import("../src/core/markdown.js"),
  import("../src/1edtech/post-markdown.js"),
  import("../src/core/reindent.js"),
  // import("../src/core/title.js"),
  import("../src/1edtech/headers.js"),
  import("../src/core/id-headers.js"),
  import("../src/1edtech/abstract.js"),
  import("../src/core/data-transform.js"),
  import("../src/core/data-abbr.js"),
  // Make sure markdown conformance section has an id
  import("../src/1edtech/inlines.js"),
  import("../src/core/inlines.js"),
  import("../src/1edtech/conformance.js"),
  import("../src/core/dfn.js"),
  import("../src/core/pluralize.js"),
  import("../src/core/examples.js"),
  import("../src/core/issues-notes.js"),
  // Left in for legacy specs
  import("../src/1edtech/issues-notes.js"),
  import("../src/core/best-practices.js"),
  import("../src/core/figures.js"),
  // Import 1EdTech biblio
  import("../src/1edtech/biblio.js"),
  import("../src/core/biblio.js"),
  import("../src/core/link-to-dfn.js"),
  import("../src/core/xref.js"),
  import("../src/core/data-cite.js"),
  import("../src/core/render-biblio.js"),
  import("../src/core/dfn-index.js"),
  import("../src/1edtech/contrib.js"),
  import("../src/core/fix-headers.js"),
  import("../src/core/structure.js"),
  import("../src/core/informative.js"),
  import("../src/core/id-headers.js"),
  import("../src/core/caniuse.js"),
  import("../src/core/mdn-annotation.js"),
  import("../src/ui/save-html.js"),
  import("../src/ui/search-specref.js"),
  import("../src/ui/search-xref.js"),
  import("../src/ui/about-respec.js"),
  import("../src/core/seo.js"),
  import("../src/1edtech/seo.js"),
  import("../src/core/highlight.js"),
  import("../src/core/data-tests.js"),
  import("../src/core/list-sorter.js"),
  import("../src/core/highlight-vars.js"),
  import("../src/core/dfn-panel.js"),
  import("../src/core/data-type.js"),
  import("../src/core/algorithms.js"),
  import("../src/core/anchor-expander.js"),
  import("../src/core/custom-elements/index.js"),
  // Clean up the document
  import("../src/1edtech/cleanBody.js"),
  // Add title attributes to internal definition references
  import("../src/1edtech/title-attrs.js"),
  // Insert 1EdTech stylesheet
  import("../src/1edtech/scripts.js"),
  // Remove all comment nodes
  import("../src/1edtech/comments.js"),
  // Add the 1EdTech footer
  import("../src/1edtech/footers.js"),
  /* Linters must be the last thing to run */
  import("../src/core/linter-rules/check-charset.js"),
  import("../src/core/linter-rules/check-punctuation.js"),
  import("../src/core/linter-rules/check-internal-slots.js"),
  import("../src/core/linter-rules/local-refs-exist.js"),
  import("../src/core/linter-rules/no-headingless-sections.js"),
  import("../src/core/linter-rules/no-unused-vars.js"),
  import("../src/core/linter-rules/privsec-section.js"),
  import("../src/core/linter-rules/wpt-tests-exist.js"),
  import("../src/core/linter-rules/no-http-props.js"),
  import("../src/core/linter-rules/a11y.js"),
];

Promise.all(modules)
  .then(plugins => ReSpec.run(plugins))
  .catch(err => console.error(err));

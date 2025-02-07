// @ts-check
// Module 1edtech/conformance
//
// Based on w3c/conformance with following differences:
//
// 1EdTech version:
// - Skip if specType == 'Errata' (1EdTech Errata documents do not have a conformance section).
// - Use slightly modified conformance text.
//
// Note: Run after inlines so the conformance section has an id and NormativeReferences is available.
import { getIntlData, htmlJoinAnd, showError, showWarning } from "../core/utils.js";
import { html } from "../core/import-maps.js";
import { renderInlineCitation } from "../core/render-biblio.js";
import { rfc2119Usage } from "../core/inlines.js";
import localizationStrings from "./translations/conformance.js";
const l10n = getIntlData(localizationStrings);

export const name = "1edtech/conformance";

/**
 * core/inlines will count the actual occurances of each term and
 * both w3c/conformance and 1edtech/conformance will only list the terms
 * that are in rfc2119Usage. But the current version of the normative
 * text refers to all the keywords, so this stuffs the list with all
 * the keywords.
 */
function stuffRfc299Usage() {
  rfc2119Usage.MUST = true;
  rfc2119Usage["MUST NOT"] = true;
  rfc2119Usage.REQUIRED = true;
  rfc2119Usage.SHALL = true;
  rfc2119Usage["SHALL NOT"] = true;
  rfc2119Usage.SHOULD = true;
  rfc2119Usage["SHOULD NOT"] = true;
  rfc2119Usage.RECOMMENDED = true;
  rfc2119Usage.MAY = true;
  rfc2119Usage.OPTIONAL = true;
}

/**
 * @param {*} conf
 */
function getNormativeText(conf) {
  // Make sure all the terms referenced in the text below are included.
  // Remove this step if you only want to list the terms that are actually
  // used in this document.
  stuffRfc299Usage();

  // Build the HTML
  const terms = [...Object.keys(rfc2119Usage)];
  const keywords = htmlJoinAnd(
    terms.sort(),
    item => html`<em class="rfc2119">${item}</em>`
  );
  const plural = terms.length > 1;

  const content = html`<p>
      ${l10n.normative_text_paragraph_1}
    </p>
    ${terms.length
      ? html`
          <p>
          ${plural ? `${l10n.the_plural} ${l10n.key_words}` : `${l10n.the} ${l10n.key_word}`}
          ${[keywords]}
          ${l10n.keywords_paragraph
            .replace("{0}", plural ? l10n.are : l10n.is)
            .replace("{1}", renderInlineCitation("RFC2119"))}
          </p>
        `
      : null}
    <p>${l10n.normative_text_implementation}</p>`;

  if (conf.skipCertGuideConformanceRef || conf.specType == "cert") {
    return content;
  }

  return html`${content}
    <p>
      ${l10n.normative_text_certification_constraints}
    </p>`;
}

/**
 * @param {*} conf
 */
function getInformativeText(conf) {
  if (!conf.mainSpecTitle) {
    showWarning("No mainSpecTitle property found in config')", name);
  }

  if (!conf.mainSpecBiblioKey) {
    showWarning("No mainSpecBiblioKey property found in config')", name);
  }

  return html` <p>
    ${l10n.informative_text_paragraph_1.replace("{0}", conf.mainSpecTitle ? conf.mainSpecTitle : "").replace("{1}", conf.mainSpecBiblioKey ? renderInlineCitation(conf.mainSpecBiblioKey) : "")}.
    ${l10n.informative_text_paragraph_2}
  </p>`;
}

/**
 * @param {Element} conformance
 * @param {*} conf
 */
function processConformance(conformance, conf) {
  // Add RFC2119 to the bibliography
  conf.normativeReferences.add("RFC2119");

  // Get the appropriate text
  let content;

  if (conf.specNature === "normative") {
    content = getNormativeText(conf);
  } else if (conf.specNature === "informative") {
    content = getInformativeText(conf);
  }

  if (conformance.tagName === "SECTION") {
    conformance.prepend(...content.childNodes);
  } else {
    conformance.after(...content.childNodes);
  }
}

/**
 * @param {*} conf
 */
export function run(conf) {
  // No conformance section in 1EdTech Errata documents
  if (conf.specType === "errata") {
    return;
  }

  let conformance = document.querySelector("section#conformance");
  if (!conformance)
    conformance = document.querySelector("section#conformance-0");
  if (!conformance)
    conformance = document.querySelector("section #conformance");
  if (!conformance)
    conformance = document.querySelector("section #conformance-0");
  if (!conformance) {
    if (conf.specType === "doc") {
      // Conformance is optional for generic documents
      return;
    }
    // Otherwise, the conformance section is required
    showError("No section found with id 'conformance'", name);
    return;
  }

  // Use 1EdTech specNature to determine conformance text
  if (!conf.specNature) {
    showError("Document must have config.specNature set", name);
  }

  // 1EdTech standard is to have a Conformance heading
  if (conformance.tagName === "SECTION") {
    const conformanceHeading = conformance.querySelector(
      "h1, h2, h3, h4, h5, h6"
    );
    if (!conformanceHeading) {
      showWarning("No heading found in the conformance section", name);
    } else {
      // Insert conformation text after heading
      conformance = conformanceHeading;
    }
  }

  // Insert the conformance text
  processConformance(conformance, conf);
}

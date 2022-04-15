// @ts-check
// Module ims/conformance
//
// Based on w3c/conformance with following differences:
//
// IMS version:
// - Skip if specType == 'Errata' (IMS Errata documents do not have a conformance section).
// - Use slightly modified conformance text.
//
// Note: Run after inlines so the conformance section has an id and NormativeReferences is available.
import { htmlJoinAnd, showError, showWarning } from "../core/utils.js";
import { html } from "../core/import-maps.js";
import { renderInlineCitation } from "../core/render-biblio.js";
import { rfc2119Usage } from "../core/inlines.js";

export const name = "ims/conformance";

/**
 * core/inlines will count the actual occurances of each term and
 * both w3c/conformance and ims/conformance will only list the terms
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
      As well as sections marked as non-normative, all authoring guidelines,
      diagrams, examples, and notes in this specification are non-normative.
      Everything else in this specification is normative.
    </p>
    ${terms.length
      ? html`
          <p>
            The key word${plural ? "s" : ""} ${[keywords]} in this document
            ${plural ? "are" : "is"} to be interpreted as described in
            ${renderInlineCitation("RFC2119")}.
          </p>
        `
      : null}
    <p>
      An implementation of this specification that fails to implement a
      MUST/REQUIRED/SHALL requirement or fails to abide by a MUST NOT/SHALL NOT
      prohibition is considered nonconformant. SHOULD/SHOULD NOT/RECOMMENDED
      statements constitute a best practice. Ignoring a best practice does not
      violate conformance but a decision to disregard such guidance should be
      carefully considered. MAY/OPTIONAL statements indicate that implementers
      are entirely free to choose whether or not to implement the option.
    </p>`;

  if (conf.skipCertGuideConformanceRef || conf.specType == "cert") {
    return content;
  }

  return html`${content}
    <p>
      The <a href="#document-set">Conformance and Certification Guide</a>
      for this specification may introduce greater normative constraints than
      those defined here for specific service or implementation categories.
    </p>`;
}

/**
 * @param {*} conf
 */
function getInformativeText(conf) {
  if (!conf.mainSpecTitle) {
    showWarning("warn", "No mainSpecTitle property found in config')");
  }

  if (!conf.mainSpecBiblioKey) {
    showWarning("warn", "No mainSpecBiblioKey property found in config')");
  }

  return html` <p>
    This document is an informative resource in the Document Set of the
    ${conf.mainSpecTitle ? conf.mainSpecTitle : ""} specification
    ${conf.mainSpecBiblioKey
      ? renderInlineCitation(conf.mainSpecBiblioKey)
      : ""}.
    As such, it does not include any normative requirements. Occurrences in this
    document of terms such as MAY, MUST, MUST NOT, SHOULD or RECOMMENDED have no
    impact on the conformance criteria for implementors of this specification.
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
    conformance.parentNode.append(...content.childNodes);
  }
}

/**
 * @param {*} conf
 */
export function run(conf) {
  // No conformance section in IMS Errata documents
  if (conf.specType === "errata") {
    return;
  }

  let conformance = document.querySelector("section#conformance");
  if (!conformance)
    conformance = document.querySelector("section#conformance-0");
  if (!conformance) {
    if (conf.specType === "doc") {
      // Conformance is optional for generic documents
      return;
    }
    // Otherwise, the conformance section is required
    showError("error", "No section found with id 'conformance'");
    return;
  }

  // Use IMS specNature to determine conformance text
  if (!conf.specNature) {
    showError("error", "Document must have config.specNature set");
  }

  // IMS standard is to have a Conformance heading
  if (conformance.tagName === "SECTION") {
    const conformanceHeading = conformance.querySelector(
      "h1, h2, h3, h4, h5, h6"
    );
    if (!conformanceHeading) {
      showWarning("warn", "No heading found in the conformance section");
    } else {
      // Insert conformation text after heading
      conformance = conformanceHeading;
    }
  }

  // Insert the conformance text
  processConformance(conformance, conf);
}

// @ts-check
// Module 1edtech/privacy
// Handle the privacy section properly.
import confLevelTmpl from "./templates/confidentialityLevelTemplate.js";
import { getIntlData } from "../core/utils.js";
import { html } from "../core/import-maps.js";
import localizationStrings from "./translations/privacy.js";
import privacyTmpl from "./templates/privacyImplicationsTemplate.js";

export const name = "1edtech/privacy";

const l10n = getIntlData(localizationStrings);
const privacyImplicationsKeys = [
  "ACCESSIBILITY",
  "ANALYTICS",
  "CONTAINER",
  "CREDENTIALS",
  "CREDENTIALSIDREF",
  "DEMOGRAPHICS",
  "EXTENSION",
  "FINANCIAL",
  "IDENTIFIER",
  "IDENTIFIERREF",
  "INSURANCE",
  "LEGAL",
  "MEDICAL",
  "NA",
  "OTHER",
  "QUALIFICATION",
  "PERSONAL",
  "SOURCEDID",
  "SOURCEDIDREF",
];

const confidentialityLevelKeys = [
  "UNRESTRICTED",
  "NORMAL",
  "RESTRICTED",
  "VERYRESTRICTED",
];

/**
 * @param {string} title
 * @returns {HTMLElement}
 */
function createSection(title, header) {
  return html`<section>
    <h3>${title}</h3>
    <p>${header}</p>
  </section>`;
}

/**
 * Handles checking for the abstract, and inserts a temp one if not present.
 */
export async function run(conf) {
  /** @type {HTMLElement} */
  if (!conf.showPrivacyAnnotations) {
    return;
  }

  const privacySection =
    document.querySelector("section#privacy-appendix") ||
    html`<section id="privacy-appendix"></section>`;

  if (!document.querySelector("section#privacy-appendix > h2")) {
    privacySection.prepend(html`<h2>${l10n.privacy_section_header}</h2>`);
  }

  privacySection.classList.add("appendix");

  const piSection = createSection(
    l10n.privacy_implications,
    l10n.privacy_implications_paragraph
  );
  piSection.appendChild(privacyTmpl(privacyImplicationsKeys, l10n));
  privacySection.appendChild(piSection);

  const confSection = createSection(
    l10n.confidentiality_level,
    l10n.confidentiality_level_paragraph
  );
  confSection.appendChild(confLevelTmpl(confidentialityLevelKeys, l10n));
  privacySection.appendChild(confSection);

  document.body.appendChild(privacySection);
}

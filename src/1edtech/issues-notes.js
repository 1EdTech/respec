// @ts-check
import { addId } from "../core/utils.js";
import { pub } from "../core/pubsubhub.js";
import { toHTMLElement } from "./utils.js";

export const name = "ims/issues-notes";

/**
 * NOTE: No longer required. core/issues-notes.js handles note|warning|issue
 * just fine even if no github connection. Leaving this in the ims-default
 * profile to support existing markup.
 *
 * Handles admonitions, adding a top bar and a11y attrs
 * Types currently supported:
 * aside.note
 * aside.ednote
 * aside.warning
 * aside.issue (will yield error if status is final, warning if CF)
 *
 * Alternate syntax is div.aside.note|warning|issue
 *
 * This replaces core/issues-notes.js, which has github features we can't utilize
 * because of our non-open repos.
 *
 * @param {*} conf respecConfig
 */
export async function run(conf) {
  // check and warn for issue admons in late process stages
  const issues = document.body.querySelectorAll("aside.issue, div.aside.issue");
  if (issues.length > 0) {
    if (conf.specStatus == "IMS Final Release") {
      pub(
        "error",
        "Issue asides must not be present when the status is 'IMS Final Release'"
      );
    } else if (conf.specStatus == "IMS Candidate Final") {
      pub(
        "warn",
        "Issue asides should not be present when the status is 'IMS Candidate Final'"
      );
    }
  }

  // prep the output element
  /** @type {NodeListOf<HTMLElement>} */
  const admons = document.body.querySelectorAll(
    "aside.note, aside.ednote, aside.warning, aside.issue, " +
      " div.aside.note, div.aside.ednote div.aside.warning, div.aside.issue"
  );

  admons.forEach(aside => {
    const type = getAdmonType(aside);
    aside.setAttribute("role", "note");
    aside.classList.add("admonition");
    if (!aside.hasAttribute("id")) {
      addId(aside);
    }
    const topBar = toHTMLElement(`<div class='admon-top'>${type}</div>`);
    topBar.classList.add(`${type}-title`);
    aside.insertAdjacentElement("afterbegin", topBar);
  });
}

/**
 * Returns the admonition type as a string based on the classList.
 * The three known types are "note", "warning", and "issue". If none
 * of those are present, returns "info".
 *
 * @param { * } aside the element to inspect
 * @returns { string } the admonition type as a string
 */
function getAdmonType(aside) {
  if (aside.classList.contains("note")) {
    return "note";
  } else if (aside.classList.contains("warning")) {
    return "warning";
  } else if (aside.classList.contains("issue")) {
    return "issue";
  }
  return "info";
}

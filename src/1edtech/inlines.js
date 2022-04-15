// @ts-check
//
// Ensure the conformance section has an id.
//
// core/inlines determines whether a document is informative by the
// presence or absence of a section with id='conformance'. If the conformance
// section is in Markddown, it will not have an id. This module will assign the
// id to a section if the first header in the section is 'conformance' or
// 'conformance statements' (ignoring case). For example,
//
// Note: Run after core/markdown and before core/inlines

import { addId } from "../core/utils.js";

export const name = "1edtech/inlines";

/**
 * Find the Conformance section in parent and assign an id.
 *
 * @param {Element | HTMLElement} parent
 */
function findConformanceSection(parent) {
  /** @type {NodeListOf<HTMLElement>} */
  const sectionElements = parent.querySelectorAll(":scope > section");
  for (const section of sectionElements) {
    if (!section.children.length) {
      continue;
    }

    if (!section.id) {
      const header = section.children[0];
      const title = header.textContent;
      if (
        title.toLowerCase() == "conformance" ||
        title.toLowerCase() == "conformance statements"
      ) {
        addId(section, null, "conformance");
        return section;
      }
    }

    const foundSection = findConformanceSection(section);
    if (foundSection) {
      return foundSection;
    }
  }

  return null;
}

/**
 * @param {*} conf
 */
export async function run(conf) {
  // No conformance section in IMS Errata documents
  if (conf.specType == "errata") {
    return;
  }

  let conformance = document.querySelector("section#conformance");
  if (!conformance) {
    conformance = findConformanceSection(document.body);
  }
}

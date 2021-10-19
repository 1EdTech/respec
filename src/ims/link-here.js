// @ts-check

import { toHTMLElement } from "../ims/utils.js";

export const name = "ims/link-here";

/**
 * Add a link to the first header element of each section not
 * in the introduction.
 */
export async function run() {
  const sections = document.querySelectorAll("section:not(.introductory)");
  for (let i = 0; i < sections.length; i++) {
    const h = sections[i].querySelector("h1, h2, h3, h4, h5, h6");
    if (h == undefined) continue;
    const link =
      toHTMLElement(`<span class="link-here"><a class="hidden-reveal" 
        title="link here" href="#${h.id}">&nbsp;</a>&nbsp;</span>`);

    h.insertAdjacentElement("afterbegin", link);
  }
}

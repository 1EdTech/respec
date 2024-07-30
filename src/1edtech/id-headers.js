// @ts-check
// Module 1edtech/id-headers
// All headings are expected to have an ID, unless their immediate container has one.

export const name = "1edtech/id-headers";
import { addId } from "../core/utils.js";

export function run(conf) {
  /** @type {NodeListOf<HTMLElement>} */
  const headings = document.querySelectorAll(
    `section:not(.head,#abstract,#sotd) h2, h3, h4, h5, h6`
  );
  for (const h of headings) {
    // prefer for ID: heading.id > parentElement.id > newly generated heading.id
    let id = h.id;
    if (!id) {
      addId(h);
    }
  }
}

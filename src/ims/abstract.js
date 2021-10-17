// @ts-check
import { pub } from "../core/pubsubhub.js";
import { toHTMLNode } from "../ims/utils.js";

export const name = "ims/abstract";

/**
 * Handles checking for the abstract, and inserts a temp one if not present.
 */
export async function run() {
  const abstract = document.querySelector("#abstract");
  if (abstract === null) {
    pub(
      "warn",
      "No abstract found. Consider adding a section element with an " +
        "id of 'abstract'"
    );
    // insert a temp abstract
    const tempAbstract = toHTMLNode(
      "<section id='abstract' class='introductory remove'><h2>Abstract</h2></section>"
    );
    document.body.prepend(tempAbstract);
  }
}

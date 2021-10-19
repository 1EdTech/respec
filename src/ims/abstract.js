// @ts-check
// Module ims/abstract
// Handle the abstract section properly.
import { showError } from "../core/utils.js";
export const name = "ims/abstract";

/**
 * Handles checking for the abstract, and inserts a temp one if not present.
 */
export async function run() {
  let abstract = document.getElementById("abstract");
  if (!abstract) {
    const msg = `Document must have one element with \`id="abstract"`;
    showError(msg, name);
    return;
  }

  if (abstract.tagName.startsWith("H")) {
    abstract.removeAttribute("id");
    abstract = abstract.parentElement;
    abstract.id = "abstract";
  }
  if (abstract.tagName === "SECTION") {
    if (!abstract.classList.contains("introductory")) {
      abstract.classList.add("introductory");
    }
  }

  let abstractHeading = document.querySelector("#abstract>h2");
  if (abstractHeading) {
    return;
  }
  abstractHeading = document.createElement("h2");
  abstractHeading.textContent = "Abstract";
  abstract.prepend(abstractHeading);
}

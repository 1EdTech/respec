// @ts-check
// Module 1edtech/abstract
// Handle the abstract section properly.
import { html } from "../core/import-maps.js";
import { showWarning } from "../core/utils.js";
export const name = "1edtech/abstract";

/**
 * Handles checking for the abstract, and inserts a temp one if not present.
 */
export async function run() {
  let abstract = document.getElementById("abstract");
  if (!abstract) {
    const msg = `Document should have one element with \`id="abstract"`;
    showWarning(msg, name);
    // insert a temp abstract
    abstract = html`<section id="abstract" class="introductory remove">
      <h2>To be removed</h2>
    </section>`;
    document.body.prepend(abstract);
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

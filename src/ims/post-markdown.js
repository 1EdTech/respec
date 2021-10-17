// @ts-check
export const name = "ims/post-markdown";

/**
 * Post processing of markdown transcludes. Run after markdown.
 *
 * @param {*} conf respecConfig
 */
export async function run(conf) {
  if (conf.format !== "markdown") return;

  // remove <md-only> elements
  const mdOnlies = document.body.querySelectorAll("md-only");
  for (let i = 0; i < mdOnlies.length; i++) {
    mdOnlies[i].parentNode.removeChild(mdOnlies[i]);
  }

  // find abstract and add introductory class
  let abstract = document.body.querySelector("#abstract");
  if (abstract) {
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
  }
}

// @ts-check
export const name = "1edtech/post-markdown";

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
}

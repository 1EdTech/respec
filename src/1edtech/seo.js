// @ts-check
export const name = "ims/seo";

/**
 * Add a canonical href
 *
 * @param {*} conf respecConfig
 *
 * Can be run before or after core/seo
 */
export async function run(conf) {
  const linkElem = document.createElement("link");
  linkElem.setAttribute("rel", "canonical");
  linkElem.setAttribute("href", conf.thisURL);
  document.head.appendChild(linkElem);
}

// @ts-check
/**
 * Module 1edtech/headers
 * Add IMS boilerplate front matter to the document.
 */
import headersTmpl from "./templates/headers.js";

export const name = "1edtech/headers";

/**
 * @param {*} conf
 */
export async function run(conf) {
  document.title = `${conf.specTitle} ${conf.specVersion ?? ""} 
    ${conf.specStatus ?? ""}`;

  const body = document.body;
  const header = headersTmpl(conf);

  if (body.firstChild) {
    body.insertBefore(header, body.firstChild);
  } else {
    body.appendChild(header);
  }
}

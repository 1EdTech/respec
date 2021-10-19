// @ts-check
/**
 * Module ims/headers
 * Add IMS boilerplate front matter to the document.
 */
import headersTmpl from "./templates/headers.js";

export const name = "ims/headers";

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

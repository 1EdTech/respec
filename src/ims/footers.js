/* eslint-disable prettier/prettier */
// @ts-check
/**
 * Module ims/footers
 * 
 * Add IMS boilerplate back matter to the document.
 */

import footersTmpl from "./templates/footers.js";

export const name = "ims/footers";

/**
 * @param {*} conf
 */
export async function run(conf) {

  const footer = footersTmpl(conf);
  document.body.appendChild(footer);
}

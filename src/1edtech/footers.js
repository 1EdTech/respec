/* eslint-disable prettier/prettier */
// @ts-check
/**
 * Module 1edtech/footers
 * 
 * Add 1EdTech boilerplate back matter to the document.
 */

import footersTmpl from "./templates/footers.js";

export const name = "1edtech/footers";

/**
 * @param {*} conf
 */
export async function run(conf) {

  const footer = footersTmpl(conf);
  document.body.appendChild(footer);
}

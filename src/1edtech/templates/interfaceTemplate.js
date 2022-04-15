// @ts-check
import { renderIssue, renderNote } from "./templateUtils.js";
import { html } from "../../core/import-maps.js";

/**
 * Render the header, description, notes, and issues for a MPS RestInterface object.
 * @param {*} serviceInterface The RestInterface object.
 * @param {string?} title Optional title for the section. By default it will be the operation name.
 * @param {string?} headerId The preferred header id.
 * @returns {HTMLElement[]} The rendered content.
 */
export default (serviceInterface, title, headerId) => {
  if (serviceInterface && serviceInterface.operations) {
    title = title ?? `${serviceInterface.name}`;
    headerId = (headerId ?? serviceInterface.id).replace(/\./g, "-");
    return html`<h3 id="${headerId}">${title}</h3>
      <p>${serviceInterface.documentation?.description}</p>
      ${serviceInterface.documentation?.issues.map(renderIssue)}
      ${serviceInterface.documentation?.notes.map(renderNote)}`;
  }
};

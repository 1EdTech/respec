// @ts-check
import { renderIssue, renderNote } from "./templateUtils.js";
import { html } from "../../core/import-maps.js";

/**
 * Render the header, description, notes, and issues for a MPS RestService object.
 * @param {*} serviceModel The ServiceModel object.
 * @param {string?} title The preferred title for this section.
 * @param {string?} headerId The unique header id to use so a data model can appear in multiple sections.
 * @returns {HTMLElement[]} An array of HTML elements.
 */
export default (serviceModel, title, headerId) => {
  if (serviceModel) {
    title = title ?? `${serviceModel.name} Service Model`;
    headerId = (headerId ?? serviceModel.id).replace(/\./g, "-");
    return html`<h2 id="${headerId}">${title}</h2>
      ${serviceModel.documentation.issues.map(renderIssue)}
      ${serviceModel.documentation.notes.map(renderNote)}`;
  }
};

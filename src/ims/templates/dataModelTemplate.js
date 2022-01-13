// @ts-check
import { renderIssue, renderNote } from "./templateUtils.js";
import { html } from "../../core/import-maps.js";

/**
 * @param {*} dataModel The CDM data model.
 * @param {string} title The preferred title for this section.
 * @param {string} id The unique header id to use so a data model
 * can appear in multiple sections.
 * @returns {HTMLElement[]} An array of HTML elements.
 */
export default (dataModel, title, id) => {
  if (dataModel) {
    title = title ?? `${dataModel.name} Data Model`;
    id = (id ?? dataModel.id).replace(/\./g, "-");
    return html`<h2 id="${id}">${title}</h2>
      ${dataModel.documentation.issues.map(renderIssue)}
      ${dataModel.documentation.notes.map(renderNote)}`;
  }
};

// @ts-check
import { renderIssue, renderNote } from "./templateUtils.js";
import { html } from "../../core/import-maps.js";

/**
 * Render the JSON Schema of an MPS Class object.
 * @param {*} classData The Class object.
 * @param {*} schema The Class' JSON Schema.
 * @param {string?} title The preferred title for this section.
 * @returns {HTMLElement[]} An array of HTML elements.
 */
export default (classData, schema, title) => {
  if (classData) {
    title = title ?? `${classData.name}`;
    return html`<h3>${title}</h3>
      <p>${classData.documentation.description}</p>
      ${classData.documentation.issues.map(renderIssue)}
      ${classData.documentation.notes.map(renderNote)}
      <pre class="nohighlight">${JSON.stringify(schema, null, 2)}</pre>`;
  }
};

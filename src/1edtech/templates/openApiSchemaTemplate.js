// @ts-check
import { renderIssue, renderNote } from "./templateUtils.js";
import { html } from "../../core/import-maps.js";

/**
 * Render the OpenAPI Schema of an MPS Model object.
 * @param {*} modelData The Model object.
 * @param {*} schema The Model's OpenAPI Schema (YAML or JSON).
 * @param {string?} title The preferred title for this section.
 * @returns {HTMLElement[]} An array of HTML elements.
 */
export default (modelData, schema, title) => {
  if (modelData) {
    title = title ?? `${modelData.name}`;
    return html`<h3>${title}</h3>
      <p>${modelData.documentation.description}</p>
      ${modelData.documentation.issues.map(renderIssue)}
      ${modelData.documentation.notes.map(renderNote)}
      <pre class="nohighlight">${schema}</pre>`;
  }
};

// @ts-check
import { html } from "../../core/import-maps.js";

/**
 * Render the Class diagram of an MPS Model / Package object.
 * @param {*} diagram The Class diagram in markdown format.
 * @param {string?} title The preferred title for this section.
 * @returns {HTMLElement[]} An array of HTML elements.
 */
export default (diagram, title) => {
    return html`<h3>${title}</h3>
      <pre class="mermaid">${diagram}</pre>`;
};

// @ts-check
import { html, mermaid } from "../../core/import-maps.js";

/**
 * Render the Class diagram of an MPS Model / Package object.
 * @param {*} diagram The Class diagram in markdown format.
 * @param {string?} title The preferred title for this section.
 * @returns {Promise<HTMLElement[]>} An array of HTML elements.
 */
export default async (index, diagram, title) => {
  mermaid.initialize({ startOnLoad: false });
  const { svg } = await mermaid.render(`class-diagram-${index}`, diagram);
  const cleanedSvg = svg.trim().replace(/height="[0-9]*"/, "");
  return html`<h3>${title}</h3>
    ${cleanedSvg}`;
};

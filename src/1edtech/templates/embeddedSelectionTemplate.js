// @ts-check
import { renderIssue, renderNote, renderType } from "./templateUtils.js";
import { html } from "../../core/import-maps.js";
import { getIntlData } from "../../core/utils.js";

import localizationStrings from "../translations/embeddedSelectionTemplate.js";
const l10n = getIntlData(localizationStrings);

/**
 * Render an EmbeddedSelection class.
 * @param {*} classData The MPS Class object.
 * @param {string?} title The preferred title.
 * @returns {HTMLElement[]} The entire section contents.
 */
export default (classData, title) => {
  if (classData && classData.generalizations) {
    title = title ?? `${classData.name}`;
    return html`<h3>${title}</h3>
      <p>${classData.documentation.description}</p>
      ${classData.documentation.issues.map(renderIssue)}
      ${classData.documentation.notes.map(renderNote)}
      <p>${l10n.intro}</p>
      <table class="simple">
        <thead>
          <tr>
            <th>${l10n.Type}</th>
            <th>${l10n.Description}</th>
          </tr>
        </thead>
        <tbody>
          ${classData.generalizations.map(renderSuperClass)}
        </tbody>
      </table>`;
  }
};

/**
 * Render superclass information.
 * @param {*} cls The MPS ModelClass object.
 * @returns {HTMLTableRowElement?} A table row with property information.
 */
function renderSuperClass(cls) {
  return html` <tr>
    <td style="min-width: 150px; word-break: break-all;">${renderType(cls)}</td>
    <td>
      ${cls.documentation.description}
      ${cls.documentation.issues.map(renderIssue)}
      ${cls.documentation.notes.map(renderNote)}
    </td>
  </tr>`;
}

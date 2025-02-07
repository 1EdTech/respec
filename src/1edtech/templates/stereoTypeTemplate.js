// @ts-check
import { renderIssue, renderNote } from "./templateUtils.js";
import { html } from "../../core/import-maps.js";
import { getIntlData } from "../../core/utils.js";

import localizationStrings from "../translations/stereoTypeTemplate.js";
const l10n = getIntlData(localizationStrings);

/**
 * Render a table of types with the same stereotype.
 * @param {*} dataModel An array of Derived or Primitive types.
 * @param {*} stereoType The MPS StereoType to list. For example, DerivedType or PrimitiveType.
 * @returns {HTMLElement[]} An array of HTML elements.
 */
export default (dataModel, stereoType) => {
  const types = dataModel.classes
    .filter(classData => classData.stereoType === stereoType)
    .sort((a, b) => {
      const nameA = a.name.toUpperCase();
      const nameB = b.name.toUpperCase();
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      return 0;
    });
  if (types.length > 0) {
    return html` <table class="simple">
      <thead>
        <tr>
          <th>${l10n.Type}</th>
          <th>${l10n.Description}</th>
        </tr>
      </thead>
      <tbody>
        ${types.map(renderType)}
      </tbody>
    </table>`;
  }
};

/**
 * Render type information.
 * @param {*} type The MPS Class object for a DerivedType or PrimitiveType.
 * @returns {HTMLTableRowElement?} A table row with property information.
 */
function renderType(type) {
  return html` <tr id="${type.id}">
    <td id="${type.name.toLowerCase()}">${type.name}</td>
    <td>
      ${type.documentation.description}
      ${type.documentation.issues.map(renderIssue)}
      ${type.documentation.notes.map(renderNote)}
    </td>
  </tr>`;
}

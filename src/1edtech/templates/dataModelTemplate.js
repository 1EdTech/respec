// @ts-check
import { renderIssue, renderNote } from "./templateUtils.js";
import { html } from "../../core/import-maps.js";
import { getIntlData } from "../../core/utils.js";

import localizationStrings from "../translations/dataModelTemplate.js";
const l10n = getIntlData(localizationStrings);

/**
 * Render the header, notes, and issues for a MPS Model. This template
 * is used when the Model includes MPS DataModels.
 * @param {*} dataModel The MPS Model.
 * @param {string?} title The preferred title for this section.
 * @param {string?} id The unique header id to use so a model can appear in multiple sections.
 * @returns {HTMLElement[]} An array of HTML elements.
 */
export default (dataModel, title, id) => {
  if (dataModel) {
    title = title ?? `${l10n.data_model_name.replace("{0}", dataModel.name)}`;
    id = (id ?? dataModel.id).replace(/\./g, "-");
    return html`<h2 id="${id}">${title}</h2>
      ${dataModel.documentation.issues.map(renderIssue)}
      ${dataModel.documentation.notes.map(renderNote)}`;
  }
};

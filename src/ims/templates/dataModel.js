// @ts-check
import { html } from "../../core/import-maps.js";

export default (dataModel, title) => {
  if (dataModel) {
    title = title ?? `${dataModel.name} Data Model`;
    return html`<h2>${title}</h2>
      <p>${dataModel.documentation.description}</p>`;
  }
};

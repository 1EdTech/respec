// @ts-check
import { html } from "../../core/import-maps.js";

export default dataModel => {
  console.log("dataModel modelData", dataModel);
  if (dataModel) {
    return html`<h2>${dataModel.name} Data Model</h2>
      <p>${dataModel.documentation.description}</p>`;
  }
};

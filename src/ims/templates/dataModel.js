// @ts-check
import { html } from "../../core/import-maps.js";

export default modelData => {
  console.log("dataModel modelData", modelData);
  if (modelData) {
    return html`<h2>${modelData.name} Data Model</h2>
      <p>${modelData.documentation.description}</p>`;
  }
};

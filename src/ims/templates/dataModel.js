// @ts-check
import { html } from "../../core/import-maps.js";

export default modelData => {
  console.log("dataModel modelData", modelData);
  if (modelData) {
    return html`<p>${modelData.documentation.description}</p>`;
  }
};

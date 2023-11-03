// @ts-check
import { html } from "../../core/import-maps.js";

export default (keys, translations) => {
  return html`
  <dl>
  ${keys.map(key => html`
    <dt><dfn id="privacy-${key.toLowerCase()}">${translations[key + '_label']}</dfn></dt><dd>${translations[key + '_def']}</dd>
  `)}
  </dl>`;
};

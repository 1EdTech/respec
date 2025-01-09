// @ts-check
import { html } from "../../core/import-maps.js";
import { getIntlData } from "../../core/utils.js";

import localizationStrings from "../translations/footers.js";
const l10n = getIntlData(localizationStrings);

export default conf => {
  return html`<footer>
    <div id="endWarranty">
      <p>1EdTech&trade; Consortium, Inc. ("1EdTech") ${l10n.warranty_1}</p>
      <p>${l10n.warranty_2}</p>
      <p>${l10n.warranty_3}</p>
      <p>${l10n.warranty_4}</p>
      <p>${l10n.warranty_5}</p>
      <p>${l10n.warranty_6}</p>
      <p>
        ${l10n.contact_url} <a href="https://www.1edtech.org">www.1edtech.org</a>
      </p>
      <p>
        ${l10n.contact_document}: ${conf.specTitle.replace("<br/>", " ")}
        ${conf.specVersion}
      </p>
      <p>${l10n.contact_date}: ${conf.specDate}</p>
      <div></div>
    </div>
  </footer>`;
};

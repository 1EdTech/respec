// @ts-check
import { html } from "../../core/import-maps.js";

export default conf => {
  return html`<footer>
    <div id="endWarranty">
      <p>
        1EdTech Consortium, Inc. ("1EdTech") is publishing the information
        contained in this document ("Specification") for purposes of scientific,
        experimental, and scholarly collaboration only.
      </p>
      <p>
        1EdTech makes no warranty or representation regarding the accuracy or
        completeness of the Specification.
      </p>
      <p>This material is provided on an "As Is" and "As Available" basis.</p>
      <p>
        The Specification is at all times subject to change and revision without
        notice.
      </p>
      <p>
        It is your sole responsibility to evaluate the usefulness, accuracy, and
        completeness of the Specification as it relates to you.
      </p>
      <p>1EdTech would appreciate receiving your comments and suggestions.</p>
      <p>
        Please contact 1EdTech through our website at
        <a href="https://www.1edtech.org">www.1edtech.org</a>.
      </p>
      <p>
        Please refer to Document Name: ${conf.specTitle.replace("<br/>", " ")}
        ${conf.specVersion}
      </p>
      <p>Date: ${conf.specDate}</p>
      <div></div>
    </div>
  </footer>`;
};

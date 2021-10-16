/* eslint-disable prettier/prettier */
// @ts-check

/**
 * Add IMS boilerplate front matter to the document.
 */

import { html } from "../core/import-maps.js";
import { pub } from "../core/pubsubhub.js";

export const name = "ims/boilerplate";

/**
 * @param {*} conf
 */
function getStatusString(conf) {
  // specStatusString: an override of the default descriptions
  if (conf.specStatusString) {
    return conf.specStatusString;
  }
  // for generic docs, have a generic desc
  if (conf.specType === "doc") {
    return "This is an informative IMS Global document that may be revised at any time.";
  }
  if (conf.specType === "proposal") {
    return "This is a proposal that may be revised at any time.";
  }
  // specStatus: See ims/config.js for known values
  switch (conf.specStatus) {
    case "Proposal":
      return "This document is for review and comment by IMS Contributing Members.";
    case "IMS Base Document":
      return "This document is for review and comment by IMS Contributing Members.";
    case "IMS Candidate Final":
      return "This document is for review and adoption by the IMS membership.";
    case "IMS Candidate Final Public":
      return "This document is for review and adoption by the IMS membership.";
    case "IMS Final Release":
      return "This document is made available for adoption by the public community at large.";
    default:
      // ims/config.js will issue error for unknown values
      return `Unknown <code>specStatus: "${conf.specStatus}"</code>`;
  }
}

function showLink(link) {
  if (!link.key) {
    const msg =
      "Found a link without `key` attribute in the configuration. See dev console.";
    pub("warn", msg);
    console.warn("warn", msg, link);
    return;
  }
  return html`
    <tr class="${link.class ? link.class : null}">
      <td>${link.key}:</td>
      ${link.data ? link.data.map(showLinkData) : showLinkData(link)}
    </tr>
  `;
}

function showLinkData(data) {
  return html` <td class="${data.class ? data.class : null}">
    ${data.href
      ? html`<a href="${data.href}">${data.value || data.href}</a>`
      : data.value}
  </td>`;
}

/**
 * @param {*} conf
 */
export async function run(conf) {
  document.title = `${conf.specTitle} ${conf.specVersion ?? ""} ${
    conf.specStatus ?? ""
  }`;

  const body = document.body;

  const header = document.createElement("header");
  const headerTop = document.createElement("div");
  headerTop.setAttribute("class", "header-top");

  const hd = html`<h1 class="title" id="title">${conf.specTitle}</h1>`;
  headerTop.appendChild(hd);

  const imgURL =
    "https://www.imsglobal.org/sites/default/files/IMSglobalreg2_2.png";
  const logo = html`<a href='https://www.imsglobal.org' id='ims-logo'><img src='${imgURL}' alt='IMS logo'></img></a>`;
  headerTop.appendChild(logo);

  header.appendChild(headerTop);

  if (conf.specType !== "doc" && conf.specType !== "proposal") {
    const release = html`<div class="subtitle">
      ${conf.specStatus}<br />Spec Version ${conf.specVersion}
    </div>`;
    header.appendChild(release);

    const statusClass = `statusPD${
      conf.specStatus === "IMS Final Release" ? " final" : ""
    }`;
    const statusPD = html`<span
      class="${statusClass}"
      data-content="${conf.specStatus}"
      >${conf.specStatus}</span
    >`;
    header.appendChild(statusPD);
  }

  // Display IMS document version (required for all doc types)

  const docVersion = html`<div class="subtitle">
    Doc Version ${conf.docVersion ?? "(MISSING)"}
  </div>`;
  header.appendChild(docVersion);

  const versionTable = html`<table
    id="version-table"
    title="Version/Release Details"
    summary="Details about the version and release."
      <tbody>
        <tr>
          <td>Date Issued:</td>
          <td>${conf.specDate}</td>
        </tr>
        <tr>
          <td>Status:</td>
          <td>${getStatusString(conf)}</td>
        </tr>
        <tr>
          <td>This version:</td>
          <td><a href='${conf.thisURL}'>${conf.thisURL}</a></td>
        </tr>
        ${
          conf.specNature === "normative"
            ? html` <tr>
                  <td>Latest version:</td>
                  <td><a href="${conf.latestURI}">${conf.latestURI}</a></td>
                </tr>
                <tr>
                  <td>Errata:</td>
                  <td><a href="${conf.errataURL}">${conf.errataURL}</a></td>
                </tr>`
            : null
        }
        ${conf.otherLinks ? conf.otherLinks.map(showLink) : ""}
      </tbody>
    </table>`;

  if (conf.specType !== "doc" && conf.specType !== "proposal") {
    header.appendChild(versionTable);
  } else {
    const genericDocTable = html` <table
      id="version-table"
      title="Version/Release Details"
      summary="Details about the version and release."
    >
      <tbody>
        <tr>
          <td>Date Issued:</td>
          <td>${conf.specDate}</td>
        </tr>
        <tr>
          <td>Status:</td>
          <td>${getStatusString(conf)}</td>
        </tr>
      </tbody>
    </table>`;
    header.appendChild(genericDocTable);
  }

  const copyright = html`<div id="cpr">
    <p>
      © ${new Date().getFullYear()} IMS Global Learning Consortium, Inc. All
      Rights Reserved.
    </p>
    <p>
      Trademark information:
      <a href="http://www.imsglobal.org/copyright.html"
        >http://www.imsglobal.org/copyright.html
      </a>
    </p>
  </div>`;

  const disclosure = html`<div id="disclosure">
    <p>
      Use of this specification to develop products or services is governed by
      the license with IMS found on the IMS website:
      <a href="http://www.imsglobal.org/speclicense.html">
        http://www.imsglobal.org/speclicense.html</a
      >.
    </p>
    <p>
      Permission is granted to all parties to use excerpts from this document as
      needed in producing requests for proposals.
    </p>
    <p>
      The limited permissions granted above are perpetual and will not be
      revoked by IMS or its successors or assigns.
    </p>
    <p>
      THIS SPECIFICATION IS BEING OFFERED WITHOUT ANY WARRANTY WHATSOEVER, AND
      IN PARTICULAR, ANY WARRANTY OF NONINFRINGEMENT IS EXPRESSLY DISCLAIMED.
      ANY USE OF THIS SPECIFICATION SHALL BE MADE ENTIRELY AT THE IMPLEMENTER'S
      OWN RISK, AND NEITHER THE CONSORTIUM, NOR ANY OF ITS MEMBERS OR
      SUBMITTERS, SHALL HAVE ANY LIABILITY WHATSOEVER TO ANY IMPLEMENTER OR
      THIRD PARTY FOR ANY DAMAGES OF ANY NATURE WHATSOEVER, DIRECTLY OR
      INDIRECTLY, ARISING FROM THE USE OF THIS SPECIFICATION.
    </p>
    <p>
      Public contributions, comments and questions can be posted here:
      <a
        href="http://www.imsglobal.org/forums/ims-glc-public-forums-and-resources"
      >
        http://www.imsglobal.org/forums/ims-glc-public-forums-and-resources
      </a>.
    </p>
  </div>`;

  const ipr = html`<div id="ipr">
    <h2>IPR and Distribution Notice</h2>
    <p>
      Recipients of this document are requested to submit, with their comments,
      notification of any relevant patent claims or other intellectual property
      rights of which they may be aware that might be infringed by any
      implementation of the specification set forth in this document, and to
      provide supporting documentation.
    </p>
    <p>
      IMS takes no position regarding the validity or scope of any intellectual
      property or other rights that might be claimed to pertain implementation
      or use of the technology described in this document or the extent to which
      any license under such rights might or might not be available; neither
      does it represent that it has made any effort to identify any such rights.
      Information on IMS's procedures with respect to rights in IMS
      specifications can be found at the IMS Intellectual Property Rights
      webpage:
      <a href="http://www.imsglobal.org/ipr/imsipr_policyFinal.pdf">
        http://www.imsglobal.org/ipr/imsipr_policyFinal.pdf
      </a>.
    </p>
  </div>`;

  const proposal = html`<div id="proposal">
    <h2>Proposals</h2>
    <p>
      Proposals are made available for the purposes of Project Group / Task
      Force only and should not be distributed outside of the IMS Contributing
      Membership without the express written consent of IMS GLC. Provision of
      any work documents outside of the project group/ task force will revoke
      all privileges as an Invited Guest. Any documents provided
      non-participants will be done by IMS GLC only on the IMS GLC public
      website when the documents become publicly available.
    </p>
  </div>`;

  if (conf.specType === "proposal") {
    header.appendChild(proposal);
    header.appendChild(copyright);
  } else {
    header.appendChild(ipr);

    if (conf.iprs) {
      header.appendChild(html`<p>
        The following participating organizations have made explicit license
        commitments to this specification:
      </p>`);
      let iprTable = `<table>
        <thead>
          <tr>
            <th>Org name</th>
            <th>Date election made</th>
            <th>Necessary claims</th>
            <th>Type</th>
          </th>
        </thead>
        <tbody>`;
      conf.iprs.forEach(element => {
        iprTable += `<tr>
            <td>${element.company}</td>
            <td>${element.electionDate}</td>
            <td>${element.necessaryClaims}</td>
            <td>${element.type}</td>
          </tr>`;
      });
      iprTable += `</tbody></table>`;
      const iprTableElement = document.createElement("div");
      iprTableElement.innerHTML = iprTable;
      header.appendChild(iprTableElement);
    }
    header.appendChild(disclosure);
    header.appendChild(copyright);
  }

  if (body.firstChild) {
    body.insertBefore(header, body.firstChild);
  } else {
    body.appendChild(header);
  }

  const footer = document.createElement("footer");

  const endWarranty = html`<div id="endWarranty">
    <p>
      IMS Global Learning Consortium, Inc. ("IMS Global") is publishing the
      information contained in this document ("Specification") for purposes of
      scientific, experimental, and scholarly collaboration only.
    </p>
    <p>
      IMS Global makes no warranty or representation regarding the accuracy or
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
    <p>IMS Global would appreciate receiving your comments and suggestions.</p>
    <p>
      Please contact IMS Global through our website at http://www.imsglobal.org.
    </p>
    <p>
      Please refer to Document Name: ${conf.specTitle.replace("<br/>", " ")}
      ${conf.specVersion}
    </p>
    <p>Date: ${conf.specDate}</p>
    <div></div>
  </div>`;
  footer.appendChild(endWarranty);

  document.body.appendChild(footer);
}

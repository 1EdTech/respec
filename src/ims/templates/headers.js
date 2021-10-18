/* eslint-disable prettier/prettier */
// @ts-check
import { html } from "../../core/import-maps.js";
import { showWarning } from "../../core/utils.js";

const name = "ims/templates/headers";

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
    showWarning(msg, name);
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

function renderSpecVersion(conf) {
  if (conf.specType !== "doc" && conf.specType !== "proposal") {
    return html`<div class="subtitle">
        ${conf.specStatus}<br />Spec Version ${conf.specVersion}
      </div>
      <div class="subtitle">
        Doc Version ${conf.docVersion ?? "(MISSING)"}
      </div>`;
  }
}

function renderSpecStatus(conf) {
  if (conf.specType !== "doc" && conf.specType !== "proposal") {
    return html`<span
      class="statusPD${conf.specStatus === "IMS Final Release" ? " final" : ""}"
      data-content="${conf.specStatus}"
      >${conf.specStatus}</span
    >`;
  }
}

function renderVersionTable(conf) {
  if (conf.specType !== "doc" && conf.specType !== "proposal") {
    return html`<table
  id="version-table"
  title="Version/Release Details"
  summary="Details about the version and release.">
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
          ? html`<tr>
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
  } else {
    return html`<table
      id="version-table"
      title="Version/Release Details"
      summary="Details about the version and release.">
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
  }
}

function renderCopyright() {
  return html`<div id="cpr">
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
}

function renderDisclosure(conf) {
  if (conf.specType === "proposal") {
    return html`<div id="disclosure">
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
  } else {
    return html`<div id="disclosure">
      <p>
        Use of this specification to develop products or services is governed by
        the license with IMS found on the IMS website:
        <a href="http://www.imsglobal.org/speclicense.html">
          http://www.imsglobal.org/speclicense.html</a
        >.
      </p>
      <p>
        Permission is granted to all parties to use excerpts from this document
        as needed in producing requests for proposals.
      </p>
      <p>
        The limited permissions granted above are perpetual and will not be
        revoked by IMS or its successors or assigns.
      </p>
      <p>
        THIS SPECIFICATION IS BEING OFFERED WITHOUT ANY WARRANTY WHATSOEVER, AND
        IN PARTICULAR, ANY WARRANTY OF NONINFRINGEMENT IS EXPRESSLY DISCLAIMED.
        ANY USE OF THIS SPECIFICATION SHALL BE MADE ENTIRELY AT THE
        IMPLEMENTER'S OWN RISK, AND NEITHER THE CONSORTIUM, NOR ANY OF ITS
        MEMBERS OR SUBMITTERS, SHALL HAVE ANY LIABILITY WHATSOEVER TO ANY
        IMPLEMENTER OR THIRD PARTY FOR ANY DAMAGES OF ANY NATURE WHATSOEVER,
        DIRECTLY OR INDIRECTLY, ARISING FROM THE USE OF THIS SPECIFICATION.
      </p>
      <p>
        Public contributions, comments and questions can be posted here:
        <a href="http://www.imsglobal.org/forums/ims-glc-public-forums-and-resources">
          http://www.imsglobal.org/forums/ims-glc-public-forums-and-resources
        </a>.
      </p>
    </div>`;
  }
}

function renderIpr(conf) {
  return html`<div id="ipr">
      <h2>IPR and Distribution Notice</h2>
      <p>
        Recipients of this document are requested to submit, with their
        comments, notification of any relevant patent claims or other
        intellectual property rights of which they may be aware that might be
        infringed by any implementation of the specification set forth in this
        document, and to provide supporting documentation.
      </p>
      <p>
        IMS takes no position regarding the validity or scope of any
        intellectual property or other rights that might be claimed to pertain
        implementation or use of the technology described in this document or
        the extent to which any license under such rights might or might not be
        available; neither does it represent that it has made any effort to
        identify any such rights. Information on IMS's procedures with respect
        to rights in IMS specifications can be found at the IMS Intellectual
        Property Rights webpage:
        <a href="http://www.imsglobal.org/ipr/imsipr_policyFinal.pdf">
          http://www.imsglobal.org/ipr/imsipr_policyFinal.pdf </a
        >.
      </p>
    </div>
    ${renderIprTable(conf)}`;
}

function renderIprTable(conf) {
  if (conf.iprs) {
    return html`<p>
        The following participating organizations have made explicit license
        commitments to this specification:
      </p>
      <table>
      <thead>
        <tr>
          <th>Org name</th>
          <th>Date election made</th>
          <th>Necessary claims</th>
          <th>Type</th>
        </th>
      </thead>
      <tbody>
      ${conf.iprs.map(renderIprRow)}
      </tbody>
      </table>`;
  }
}

function renderIprRow(element) {
  return html`<tr>
    <td>${element.company}</td>
    <td>${element.electionDate}</td>
    <td>${element.necessaryClaims}</td>
    <td>${element.type}</td>
  </tr>`;
}

export default conf => {
  return html`<header>
    <div class="header-top">
      <h1 class="title" id="title">${conf.specTitle}</h1>
      <a href="https://www.imsglobal.org" id="ims-logo">
        <img
          src="https://www.imsglobal.org/sites/default/files/IMSglobalreg2_2.png"
          alt="IMS logo"
        />
      </a>
    </div>
    ${renderSpecVersion(conf)} ${renderSpecStatus(conf)}
    ${renderVersionTable(conf)} ${renderIpr(conf)} ${renderDisclosure(conf)}
    ${renderCopyright()}
  </header>`;
};

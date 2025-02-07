/* eslint-disable prettier/prettier */
// @ts-check
import { html } from "../../core/import-maps.js";
import { getIntlData, showWarning } from "../../core/utils.js";

import localizationStrings from "../translations/headers.js";
const l10n = getIntlData(localizationStrings);

const name = "1edtech/templates/headers";

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
    return l10n.generic;
  }
  if (conf.specType === "proposal") {
    return l10n.proposal;
  }
  // specStatus: See 1edtech/config.js for known values
  switch (conf.specStatus) {
    case "Proposal":
      return l10n.proposal_status;
    case "Base Document":
      return l10n.base_doc_status;
    case "Candidate Final":
      return l10n.candidate_final_status;
    case "Candidate Final Public":
      return l10n.candidate_final_status;
    case "Final Release":
      return l10n.final_status;
    default:
      // 1edtech/config.js will issue error for unknown values
      return l10n.unknown_status.replace("{0}", conf.specStatus);
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
      <td>${link.key}</td>
      <td>
        <table style="margin:0;border:none">
          <tr>
            ${link.data ? link.data.map(showLinkData) : showLinkData(link)}
          </tr>
        </table>
      </td>
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
        ${conf.specStatus}<br />${l10n.spec_version.replace("{0}", conf.specVersion)}
      </div>`;
  }
}

function renderSpecStatus(conf) {
  if (conf.specType !== "doc" && conf.specType !== "proposal") {
    return html`<span
      class="statusPD${conf.specStatus === "Final Release" ? ` ${l10n.final}` : ""}"
      data-content="${conf.specStatus}"
      >${conf.specStatus}</span
    >`;
  }
}

function renderVersionTable(conf) {
  if (conf.specType !== "doc" && conf.specType !== "proposal") {
    return html`<table
  id="version-table"
  title="${l10n.version_table_title}">
    <tbody>
      <tr>
        <td>${l10n.document_version}:</td>
        <td>${conf.docVersion}</td>
      </tr>
      <tr>
        <td>${l10n.date_issued}:</td>
        <td>${conf.specDate}</td>
      </tr>
      <tr>
        <td>${l10n.status}:</td>
        <td>${getStatusString(conf)}</td>
      </tr>
      <tr>
        <td>${l10n.this_version}:</td>
        <td><a href='${conf.thisURL}'>${conf.thisURL}</a></td>
      </tr>
      ${conf.specNature === "normative"
        ? html`<tr>
                <td>${l10n.latest_version}:</td>
                <td><a href="${conf.latestURI}">${conf.latestURI}</a></td>
              </tr>
              <tr>
                <td>${l10n.errata}:</td>
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
      title="${l10n.version_table_title}">
      <tbody>
        <tr>
          <td>${l10n.date_issued}:</td>
          <td>${conf.specDate}</td>
        </tr>
        <tr>
          <td>${l10n.status}:</td>
          <td>${getStatusString(conf)}</td>
        </tr>
      </tbody>
    </table>`;
  }
}

function renderCopyright() {
  return html`<div id="cpr">
    <p>
      © ${new Date().getFullYear()} 1EdTech&trade; Consortium, Inc. ${l10n.copyright_tag}
    </p>
    <p>
      ${l10n.trademark_information}:
      <a href="https://www.1edtech.org/about/legal"
        >https://www.1edtech.org/about/legal
      </a>
    </p>
  </div>`;
}

function renderDisclosure(conf) {
  if (conf.specType === "proposal") {
    return html`<div id="disclosure">
      <h2>${l10n.proposals}</h2>
      <p>${l10n.proposals_disclosure}
      </p>
    </div>`;
  } else {
    return html`<div id="disclosure">
      <p>
        ${l10n.disclosure_license_link_text}:
        <a href="https://www.1edtech.org/standards/specification-license">
          https://www.1edtech.org/standards/specification-license</a
        >.
      </p>
      <p>
        ${l10n.disclosure_granted_permissions_text}
      </p>
      <p>
        ${l10n.disclosure_granted_permissions_time_text}
      </p>
      <p>
        ${l10n.disclosure_warranty_text}
      </p>
      <p>
        ${l10n.disclosure_contributions_text}
        <a href="mailto:support@1edtech.org">
          support@1edtech.org
        </a>.
      </p>
    </div>`;
  }
}

function renderIpr(conf) {
  return html`<div id="ipr">
      <h2>${l10n.ipr_header}</h2>
      <p>
        ${l10n.ipr_intro}
      </p>
      <p>
        ${l10n.ipr_text}:
        <a href="https://www.1edtech.org/sites/default/files/media/docs/2023/imsipr_policyFinal.pdf">
          https://www.1edtech.org/sites/default/files/media/docs/2023/imsipr_policyFinal.pdf </a
        >.
      </p>
    </div>
    ${renderIprTable(conf)}`;
}

function renderIprTable(conf) {
  if (conf.iprs) {
    return html`<p>
        ${l10n.ipr_table_intro}
      </p>
      <table>
      <thead>
        <tr>
          <th>${l10n.org_name}</th>
          <th>${l10n.date_election_made}</th>
          <th>${l10n.necessary_claims}</th>
          <th>${l10n.type}</th>
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
      <a href="https://www.1edtech.org" id="1edtech-logo" style="margin-left:27px">
        <img
          src="https://purl.imsglobal.org/respec/1edtech_logo_color_with_tagline.svg"
          width="300" height="105"
          alt="${l10n.logo_alt}"
        />
      </a>
    </div>
    ${renderSpecVersion(conf)} ${renderSpecStatus(conf)}
    ${renderVersionTable(conf)} ${renderIpr(conf)} ${renderDisclosure(conf)}
    ${renderCopyright()}
  </header>`;
};

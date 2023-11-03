// @ts-check
import { renderIssue, renderNote as renderNote } from "./templateUtils.js";
import { html } from "../../core/import-maps.js";

/**
 * Render the header, description, notes, and issues for a MPS RestOperation object.
 * @param {*} config The ReSpec config object.
 * @param {string} rootPath The root path for the service definition. For example, "ims/clr/v2p0".
 * @param {*} operation The RestOperation object from MPS.
 * @param {string?} title Optional title for the section. By default it will be the operation name.
 * @returns {HTMLElement[]} Information about the operation.
 */
export default (config, rootPath, operation, title) => {
  if (operation) {
    title = title ?? `${operation.name}`;
    return html`<h3>${title}</h3>
      <p>${operation.documentation.description}</p>
      ${operation.documentation.issues.map(renderIssue)}
      ${operation.documentation.notes.map(renderNote)}
      ${renderRequest(config, rootPath, operation)}
      ${renderResponses(config, operation)}`;
  }
};

/**
 * Render the operation request.
 * @param {*} config The ReSpec config object.
 * @param {string} rootPath The root path for the service definition. For example, "ims/clr/v2p0".
 * @param {*} operation The operation object from CDM/MPS.
 * @returns {HTMLElement[]} The rendered request as HTML elements.
 */
function renderRequest(config, rootPath, operation) {
  return html`<h5>Request</h5>
    ${renderUrl(rootPath, operation)}
    ${renderRequestParameters(config, operation)}
    ${renderRequestBodies(config, operation)}`;
}

/**
 * Render the request URL.
 * @param {string} rootPath The root path for the service definition. For example, "ims/clr/v2p0".
 * @param {*} operation The operation object from CDM/MPS.
 * @returns {HTMLParagraphElement} The rendered URL.
 */
function renderUrl(rootPath, operation) {
  let url = `${operation.method} ${rootPath}${operation.request.path}`;
  const queryParameters = operation.request.parameters.filter(
    parameter => parameter.type === "QUERY"
  );
  if (queryParameters) {
    for (let index = 0; index < queryParameters.length; index++) {
      const parameter = queryParameters[index];
      url += index == 0 ? "?" : "&";
      url += `${parameter.name}={${parameter.name}}`;
    }
  }
  return html`<p><code>${url}</code></p>`;
}

/**
 * Render the operation request parameters.
 * @param {*} config The ReSpec config object.
 * @param {*} operation The operation object from CDM/MPS.
 * @returns {HTMLTableElement} A table of information about the request parameters.
 */
function renderRequestParameters(config, operation) {
  if (Array.from(operation.request.parameters).length > 0) {
    return html`
      <table class="simple" style="caption-side:top">
        <caption style="display:table-caption;text-align:left">
          Request header, path, and query parameters
        </caption>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Parameter Type</th>
            <th>Description</th>
            <th>Required</th>
            ${config.showPrivacyAnnotations
              ? html`<th>Confidentiality Level</th>`
              : null}
          </tr>
        </thead>
        <tbody>
          ${operation.request.parameters.map(param =>
            renderParameter(config, param)
          )}
        </tbody>
      </table>
    `;
  }
}

/**
 * Render the operation request bodies (if any).
 * @param {*} config The ReSpec config object.
 * @param {*} operation The operation object from CDM/MPS.
 * @returns {HTMLTableElement} A table of information about the request bodies.
 */
function renderRequestBodies(config, operation) {
  if (Array.from(operation.request.bodies).length > 0) {
    return html`
      <table class="simple" style="caption-side:top">
        <caption style="display:table-caption;text-align:left">
          Allowed request content types
        </caption>
        <thead>
          <tr>
            <th>Content-Type Header</th>
            <th>Content Type</th>
            <th>Content Description</th>
            <th>Content Required</th>
            ${config.showPrivacyAnnotations
              ? html`<th>Confidentiality Level</th>`
              : null}
          </tr>
        </thead>
        <tbody>
          ${operation.request.bodies.map(body =>
            renderRequestBody(config, body)
          )}
        </tbody>
      </table>
    `;
  }
}

/**
 * Render a single request body.
 * @param {*} config The ReSpec config object.
 * @param {*} body The body object from CDM/MPS.
 * @returns {HTMLTableRowElement} A table row with information about the request body.
 */
function renderRequestBody(config, body) {
  return html`<tr>
    <td>${body.contentType}</td>
    <td>${renderBodyType(body)}</td>
    <td>
      ${body.documentation?.description}
      ${body.documentation?.issues.map(renderIssue)}
      ${body.documentation?.notes.map(renderNote)}
    </td>
    <td>${renderRequired(body)}</td>
    ${config.showPrivacyAnnotations ? renderConfidentialityCell(body) : null}
  </tr>`;
}

function renderParameter(config, parameter) {
  return html` <tr>
    <td>
      <code>${parameter.name}</code>
      <div>(${parameter.type.toLowerCase()})</div>
    </td>
    <td>${renderParmeterType(parameter)}</td>
    <td>
      ${parameter.documentation.description}
      ${parameter.documentation.issues.map(renderIssue)}
      ${parameter.documentation.notes.map(renderNote)}
    </td>
    <td>${renderRequired(parameter)}</td>
    ${config.showPrivacyAnnotations
      ? renderConfidentialityCell(parameter)
      : null}
  </tr>`;
}

function renderResponses(config, operation) {
  const responses = operation.responses.flatMap(mergeResponseBodies);
  return html`<h5>Responses</h5>
    <table class="simple" style="caption-side:top">
      <caption style="display:table-caption;text-align:left">
        Allowed response codes and content types
      </caption>
      <thead>
        <tr>
          <th>Status Code</th>
          <th>Content-Type Header</th>
          <th>Content Type</th>
          <th>Content Description</th>
          <th>Content Required</th>
          ${config.showPrivacyAnnotations
            ? html`<th>Confidentiality Level</th>`
            : null}
        </tr>
      </thead>
      <tbody>
        ${responses.map(resp => renderResponse(config, resp))}
      </tbody>
    </table>`;
}

function renderResponse(config, response) {
  return html`<tr>
    <td>${response.statusCode}</td>
    <td>${response.body?.contentType}</td>
    <td>${renderBodyType(response.body)}</td>
    <td>
      ${response.documentation?.description}
      ${response.body?.documentation?.description}
      ${response.body?.documentation?.issues.map(renderIssue)}
      ${response.body?.documentation?.notes.map(renderNote)}
    </td>
    <td>${renderRequired(response.body)}</td>
    ${config.showPrivacyAnnotations
      ? renderConfidentialityCell(response.body)
      : null}
  </tr>`;
}

function mergeResponseBodies(response) {
  const bodies = Array.from(response.bodies);
  if (bodies.length == 0) {
    return response;
  } else {
    const mergedResponses = new Array();
    for (let index = 0; index < bodies.length; index++) {
      const body = bodies[index];
      mergedResponses.push({
        ...response,
        body,
      });
    }
    return mergedResponses;
  }
}

function renderRequired(value) {
  if (value?.cardinality)
    return value.cardinality.value.includes("ZERO") ? "Optional" : "Required";
}

/**
 * Return a table cell with a string describing the privacy implications of a property.
 * @param {*} value The value object from CDM/MPS.
 * @returns {HTMLTableCellElement} A table cell with a string describing the privacy implications of a property.
 */
function renderConfidentialityCell(value) {
  if (value?.confidentiality) {
    return html`<td>
      <a href="#privacy-${value.confidentiality.value.toLowerCase()}">
        ${renderConfidentiality(value)}
      </a>
    </td>`;
  }
}
function renderConfidentiality(value) {
  if (value?.confidentiality) {
    return value.confidentiality.label;
  }
}

function renderParmeterType(parameter) {
  let name = parameter.value.name;
  if (parameter.cardinality.value.includes("MANY")) {
    name += "[]";
  }
  if (
    parameter.value.stereoType === "Enumeration" ||
    parameter.value.stereoType === "EnumExt"
  ) {
    name += " Enumeration";
  }
  name = html`<a href="#${parameter.value.id}"><samp>${name}</samp></a>`;
  return name;
}

function renderBodyType(body) {
  if (body?.type) {
    let name = body.type.name;
    if (body.cardinality.value.includes("MANY")) {
      name += "[]";
    }
    if (
      body.type.stereoType === "Enumeration" ||
      body.type.stereoType === "EnumExt"
    ) {
      name += " Enumeration";
    }
    name = html`<a href="#${body.type.id}"><samp>${name}</samp></a>`;
    return name;
  }
}

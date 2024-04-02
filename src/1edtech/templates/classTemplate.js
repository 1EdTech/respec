// @ts-check
import {
  renderIssue,
  renderNote,
  renderPrivacyImplicationDoc,
  renderType
} from "./templateUtils.js";
import { html } from "../../core/import-maps.js";

/**
 * Render the header, description, notes, and issues, and properties of an MPS Class object.
 * @param {*} config The ReSpec config object.
 * @param {*} classData The Class object.
 * @param {string?} title The preferred title for this section.
 * @returns {HTMLElement[]} An array of HTML elements.
 */
export default (config, classData, title) => {
  if (classData && classData.properties) {
    title = title ?? `${classData.name}`;
    return html`<h3>${title}</h3>
      <p>${classData.documentation.description}</p>
      ${classData.documentation.issues.map(renderIssue)}
      ${classData.documentation.notes.map(renderNote)}
      <table class="simple">
        <thead>
          <tr>
            <th>Property</th>
            <th>Type</th>
            <th>Description</th>
            <th>Multiplicity</th>
            ${config.showPrivacyAnnotations ? html`<th>Privacy</th>` : null}
          </tr>
        </thead>
        <tbody>
          ${classData.properties.map(prop => renderProperty(config, prop))}
          ${renderExtensibility(config, classData)}
        </tbody>
      </table>`;
  }
};

/**
 * Render text that indicates the class is extensible.
 * @param {*} config The ReSpec config object.
 * @param {*} classData The MPS Class object.
 * @returns {HTMLTableRowElement?} A table row that can be appended to the properties table.
 */
function renderExtensibility(config, classData) {
  if (classData.isExtensible) {
    return html` <tr>
      <td colspan="${config.showPrivacyAnnotations ? 5 : 4}">
        This class can be extended with additional properties.
      </td>
    </tr>`;
  } else {
    return html``;
  }
}

/**
 * Render property information.
 * @param {*} config The ReSpec config object.
 * @param {*} property The MPS Property object.
 * @returns {HTMLTableRowElement?} A table row with property information.
 */
function renderProperty(config, property) {
  return html` <tr>
    <td style="min-width: 150px; word-break: break-all;">${property.name}</td>
    <td>${renderType(property.type)}</td>
    <td>
      ${property.documentation.description}
      ${property.documentation.issues.map(renderIssue)}
      ${property.documentation.notes.map(renderNote)}
      ${renderPrivacyImplicationDoc(config, property.documentation.privacyDoc)}
    </td>
    <td>${renderCardinality(property)}</td>
    ${config.showPrivacyAnnotations
      ? renderPrivacyImplicationCell(property)
      : null}
  </tr>`;
}

/**
 * Return a string describing whether a property is required or not.
 * @param {*} property The MPS Property object.
 * @returns {string} A string describing whether a property is required or not.
 */
function renderCardinality(property) {
  switch (property.cardinality.value) {
    case "ONE":
      return "[1]";
    case "ZERO_OR_ONE":
      return "[0..1]";
    case "ZERO_OR_MANY":
      return "[0..*]";
    case "ONE_OR_MANY":
      return "[1..*]";
    case "TWO":
      return "[2]";
    default:
      break;
  }
}

/**
 * Return a table cell with a string describing the privacy implications of a property.
 * @param {*} property The MPS Property object.
 * @returns {HTMLTableCellElement} A table cell with a string describing the privacy implications of a property.
 */
function renderPrivacyImplicationCell(property) {
  return html`<td>
    <a href="#privacy-${property.privacyImplications.value.toLowerCase()}">
      ${renderPrivacyImplication(property)}
    </a>
  </td>`;
}

/**
 * Return a string describing the privacy implications of a property.
 * @param {*} property The MPS Property object.
 * @returns {string} A string describing the privacy implications of a property.
 */
function renderPrivacyImplication(property) {
  return html`${property.privacyImplications.label}`;
}

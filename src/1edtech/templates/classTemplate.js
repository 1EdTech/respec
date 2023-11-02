// @ts-check
import { renderIssue, renderNote, renderPrivacyImplicationDoc } from "./templateUtils.js";
import { html } from "../../core/import-maps.js";

/**
 * Render the header, description, notes, and issues, and properties of an MPS Class object.
 * @param {*} classData The Class object.
 * @param {string?} title The preferred title for this section.
 * @returns {HTMLElement[]} An array of HTML elements.
 */
export default (classData, title) => {
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
            <th>Privacy</th>
          </tr>
        </thead>
        <tbody>
          ${classData.properties.map(renderProperty)}
          ${renderExtensibility(classData)}
        </tbody>
      </table>`;
  }
};

/**
 * Render text that indicates the class is extensible.
 * @param {*} classData The MPS Class object.
 * @returns {HTMLTableRowElement?} A table row that can be appended to the properties table.
 */
function renderExtensibility(classData) {
  if (classData.isExtensible) {
    return html` <tr>
      <td colspan="4">
        This class can be extended with additional properties.
      </td>
    </tr>`;
  } else {
    return html``;
  }
}

/**
 * Render property information.
 * @param {*} property The MPS Property object.
 * @returns {HTMLTableRowElement?} A table row with property information.
 */
function renderProperty(property) {
  return html` <tr>
    <td>${property.name}</td>
    <td>${renderType(property)}</td>
    <td>
      ${property.documentation.description}
      ${property.documentation.issues.map(renderIssue)}
      ${property.documentation.notes.map(renderNote)}
      ${renderPrivacyImplicationDoc(property.documentation.privacyDoc)}
    </td>
    <td>${renderCardinality(property)}</td>
    <td>${renderPrivacyImplications(property)}</td>
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
 * Return a string describing the privacy implications of a property.
 * @param {*} property The MPS Property object.
 * @returns {string} A string describing the privacy implications of a property.
 */
function renderPrivacyImplications(property) {
  switch (property.privacyImplications.value) {
    case "ACCESSIBILITY":
      return "Accessibility";
    case "ANALYTICS":
      return "Analytics";
    case "CONTAINER":
      return "Container";
    case "CREDENTIALS":
      return "Credentials";
    case "CREDENTIALSIDREF":
      return "CredentialsIdRef";
    case "DEMOGRAPHICS":
      return "Demographics";
    case "EXTENSION":
      return "Extension";
    case "FINANCIAL":
      return "Financial";
    case "IDENTIFIER":
      return "Identifier";
    case "IDENTIFIERREF":
      return "IdentifierRef";
    case "INSURANCE":
      return "Insurance/Assurance";
    case "LEGAL":
      return "Legal";
    case "MEDICAL":
      return "Medical/Healthcare";
    case "NA":
      return "N/A";
    case "OTHER":
      return "Other";
    case "QUALIFICATION":
      return "Qualification/Certification";
    case "PERSONAL":
      return "Personal";
    case "SOURCEDID":
      return "SourcedId";
    case "SOURCEDIDREF":
      return "SourcedIdRef";
    default:
      break;
  }
}

/**
 * Return a clickable link to the property type definition.
 * @param {*} property The MPS Property object.
 * @returns {HTMLAnchorElement} Returns an anchor element that links to the property type definition.
 */
function renderType(property) {
  let name = property.type.name;
  if (
    property.type.stereoType === "Enumeration" ||
    property.type.stereoType === "EnumExt"
  ) {
    name += " Enumeration";
  }
  name = html`<a href="#${property.type.id}"><samp>${name}</samp></a>`;
  return name;
}

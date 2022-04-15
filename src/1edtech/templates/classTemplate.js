// @ts-check
import { renderIssue, renderNote } from "./templateUtils.js";
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
            <th>Required</th>
          </tr>
        </thead>
        <tbody>
          ${classData.properties.map(renderProperty)}
          ${classData.properties.map(renderExtensions)}
        </tbody>
      </table>`;
  }
};

/**
 * Render text that indicates the class is extensible.
 * @param {*} property The MPS Property object.
 * @returns {HTMLTableRowElement?} A table row that can be appended to the properties table.
 */
function renderExtensions(property) {
  if (
    property.type.name === "Namespace" ||
    property.type.name === "NamespaceLax"
  ) {
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
  if (
    property.type.name !== "Namespace" &&
    property.type.name !== "NamespaceLax"
  ) {
    return html``;
  } else {
    return html` <tr>
      <td>${property.name}</td>
      <td>${renderType(property)}</td>
      <td>
        ${property.documentation.description}
        ${property.documentation.issues.map(renderIssue)}
        ${property.documentation.notes.map(renderNote)}
      </td>
      <td>${renderRequired(property)}</td>
    </tr>`;
  }
}

/**
 * Return a string describing whether a property is required or not.
 * @param {*} property The MPS Property object.
 * @returns {string} A string describing whether a property is required or not.
 */
function renderRequired(property) {
  return property.cardinality.value.includes("ZERO") ? "Optional" : "Required";
}

/**
 * Return a clickable link to the property type definition.
 * @param {*} property The MPS Property object.
 * @returns {HTMLAnchorElement} Returns an anchor element that links to the property type definition.
 */
function renderType(property) {
  let name = property.type.name;
  if (property.cardinality.value.includes("MANY")) {
    name += "[]";
  }
  if (
    property.type.stereoType === "Enumeration" ||
    property.type.stereoType === "EnumExt"
  ) {
    name += " Enumeration";
  }
  name = html`<a href="#${property.type.id}"><samp>${name}</samp></a>`;
  return name;
}

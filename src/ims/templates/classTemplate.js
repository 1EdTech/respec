// @ts-check
import { renderIssue, renderNote } from "./templateUtils.js";
import { html } from "../../core/import-maps.js";

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

function renderExtensions(property) {
  if (property.name === "extensions") {
    return html` <tr>
      <td colspan="4">
        This class can be extended with additional properties.
      </td>
    </tr>`;
  } else {
    return html``;
  }
}

function renderProperty(property) {
  if (property.name === "extensions") {
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

function renderRequired(property) {
  return property.cardinality.value.includes("ZERO") ? "Optional" : "Required";
}

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

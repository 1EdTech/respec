// @ts-check
import { html } from "../../core/import-maps.js";

export default (classData, title) => {
  if (classData && classData.properties) {
    if (
      classData.stereoType === "Enumeration" ||
      classData.stereoType === "EnumExt"
    ) {
      title = title ?? `${classData.name} Enumeration`;
      return html`<h3>${title}</h3>
        <p>${classData.documentation.description}</p>
        ${classData.documentation.issues.map(renderIssue)}
        ${classData.documentation.notes.map(renderNote)}
        <table>
          <thead>
            <tr>
              <th>Term</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            ${classData.properties.map(renderTerm)}
            ${classData.stereoType === "EnumExt"
              ? html`<tr>
                  <td colspan="2">
                    This enumeration can be extended with new, proprietary
                    terms. The new terms must start with the substring 'ext:'.
                  </td>
                </tr>`
              : html``}
          </tbody>
        </table>`;
    } else {
      title = title ?? `${classData.name}`;
      return html`<h3>${title}</h3>
        <p>${classData.documentation.description}</p>
        ${classData.documentation.issues.map(renderIssue)}
        ${classData.documentation.notes.map(renderNote)}
        <table>
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

function renderIssue(issue) {
  return html`<div class="issue">${issue}</div>`;
}

function renderNote(note) {
  return html`<div class="note">${note}</div>`;
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

function renderTerm(term) {
  return html`<tr>
    <td>${term.name}</td>
    <td>
      ${term.documentation.description}
      ${term.documentation.issues.map(renderIssue)}
      ${term.documentation.notes.map(renderNote)}
    </td>
  </tr>`;
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
  name = html`<a href="#${property.type.id}">${name}</a>`;
  return name;
}

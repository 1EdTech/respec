// @ts-check
import { html } from "../../core/import-maps.js";

export default classData => {
  console.log("dataClass classData", classData);
  if (classData && classData.properties) {
    return html`<h3>${classData.name}</h3>
      <p>${classData.documentation.description}</p>
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
        </tbody>
      </table>`;
  }
};

function renderProperty(property) {
  if (property.name !== "extensions") {
    return html` <tr>
      <td>${property.name}</td>
      <td>${renderType(property)}</td>
      <td>${property.documentation.description}</td>
      <td>${renderRequired(property)}</td>
    </tr>`;
  } else {
    return html` <tr>
      <td colspan="4">This class can be extended.</td>
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
  name = html`<a href="#${property.type.id}">${name}</a>`;
  return name;
}

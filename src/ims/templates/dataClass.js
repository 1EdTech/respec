// @ts-check
import { html } from "../../core/import-maps.js";
// import { showWarning } from "../../core/utils.js";

// const name = "ims/templates/dataClass";

export default classData => {
  console.log("dataClass classData", classData);
  if (classData && classData.properties) {
    classData.properties.sort(compare);
    return html` <table>
      <thead>
        <tr>
          <th>Property</th>
        </tr>
      </thead>
      <tbody>
        ${classData.properties.map(renderProperty)}
      </tbody>
    </table>`;
  }
};

function renderProperty(property) {
  return html` <tr>
    <td>${property.name}</td>
  </tr>`;
}

function compare(a, b) {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
}

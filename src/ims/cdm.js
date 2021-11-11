// @ts-nocheck

/**
 * Module ims/cdm
 * Handles the optional Common Data Model processing.
 *
 * Markdown support is optional. It is enabled by setting the `data-format`
 * attribute of a section to 'cdm'.
 *
 * The HTML created by the CDM parser is a table for each data class.
 */
import { showError, showWarning } from "../core/utils.js";
import dataClassTemplate from "./templates/dataClass.js";
import dataModelTemplate from "./templates/dataModel.js";
import { html } from "../core/import-maps.js";

export const name = "ims/cdm";

if (typeof window.env === "undefined") {
  window.env = {};
}

function getApiKey() {
  if (window.env.API_KEY) {
    return window.env.API_KEY;
  }
  throw "No CDM API_KEY found";
}

async function getDataModel(id) {
  const query = JSON.stringify({
    query: `
    {
      modelByID(id: "${id}") {
        id
        name
        documentation {
          description
        }
        classes {
          id
          name
          stereoType
          documentation {
            description
          }
          properties {
            name
            type {
              name
              id
            }
            cardinality {
              value
            }
            documentation {
              description
            }
          }
        }
      }
    }
    `,
  });

  try {
    const res = await fetch("https://imsum2.herokuapp.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": getApiKey(),
      },
      body: query,
    });
    if (!res.ok) {
      showError(
        `Could not get CDM model for ${id}. Please see the developer console for details.`,
        name
      );
      return null;
    }
    const data = await res.json();
    console.log("fetched data", data);
    const dataModel = data.data.modelByID;
    if (!dataModel) {
      showError(`Unknown CDM for ${id}`, name);
      return null;
    }
    return dataModel;
  } catch (error) {
    showError(`Could not get CDM model for ${id}: ${error}`, name);
    return null;
  }
}

/**
 * Async function that returns a sample JSON object for a single
 * Common Data Model class.
 *
 * @param {string} id Common Data Model class id
 * @param {boolean} includeOptionalFields True if the sample should
 * include all optional fields (the default is false)
 * @returns The sample JSON object
 */
async function getDataSample(id, includeOptionalFields = false) {
  try {
    const res = await fetch(
      `https://imsum2.herokuapp.com/sample/${id}?includeOptionalFields=${includeOptionalFields}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": getApiKey(),
        },
      }
    );
    if (!res.ok) {
      showError(`Could not get sampledata for ${id}: ${res.status}`, name);
      return null;
    }
    const data = await res.json();
    console.log("fetched data", data);
    return data;
  } catch (error) {
    showError(`Could not get sample data for ${id}: ${error}`, name);
    return null;
  }
}

/**
 * Process a single data model class definition.
 *
 * @param {*} classModel The CDM class object.
 */
async function processDataClass(classModel) {
  const section = document.getElementById(classModel.id);
  if (classModel.stereoType === "PrimitiveType") {
    if (section) {
      showWarning(`Ignoring primitive class ${classModel.id}`, name);
      section.remove();
    }
    return;
  }
  if (classModel.stereoType === "DerivedType") {
    if (section) {
      showWarning(`Ignoring derived class ${classModel.id}`, name);
      section.remove();
    }
    return;
  }
  if (!section) {
    showError(`Missing class ${classModel.id}`, name);
  } else {
    let fullElem = dataClassTemplate(classModel);
    if (typeof window.dataClassTemplate === "function") {
      fullElem = window.dataClassTemplate(classModel);
    }
    if (fullElem) {
      let target = null;
      Array.from(fullElem.childNodes).forEach(element => {
        let thisElement = element;
        if (element.nodeName === "#text") {
          thisElement = document.createElement("text");
          thisElement.innerHTML = element.nodeValue;
        }
        if (target) {
          target.insertAdjacentElement("afterend", thisElement);
        } else {
          section.insertAdjacentElement("afterbegin", thisElement);
        }
        target = thisElement;
      });
    }
    const sampleElement = section.querySelector("[data-sample]");
    if (sampleElement) {
      const includeOptionalFields =
        sampleElement.getAttribute("data-include-optional-fields") ?? "false";
      const sampleData = await getDataSample(
        classModel.id,
        includeOptionalFields
      );
      if (sampleData) {
        sampleElement.append(html`<pre class="json">
          ${JSON.stringify(sampleData)}
          </pre
        >`);
      } else {
        sampleElement.append(
          html`<p>
            Could not get sample data. See developer console for details.
          </p>`
        );
      }
    }
  }
}

/**
 * Process a single data model definition.
 *
 * @param {string} id The CDM id for the model.
 */
async function processDataModel(id) {
  const section = document.getElementById(id);
  const dataModel = await getDataModel(section.id);
  if (dataModel) {
    let fullElem = dataModelTemplate(dataModel);
    if (typeof window.dataModelTemplate === "function") {
      fullElem = window.dataModelTemplate(dataModel);
    }
    if (fullElem) {
      let target = null;
      Array.from(fullElem.childNodes).forEach(element => {
        let thisElement = element;
        if (element.nodeName === "#text") {
          thisElement = document.createElement("text");
          thisElement.innerHTML = element.nodeValue;
        }
        if (target) {
          target.insertAdjacentElement("afterend", thisElement);
        } else {
          section.insertAdjacentElement("afterbegin", thisElement);
        }
        target = thisElement;
      });
    }
    Array.from(dataModel.classes).map(async classModel => {
      processDataClass(classModel);
    });
    processPrimitives(dataModel);
    processDerivatives(dataModel);
  } else {
    // If there is no data model, add a header to satisfy Respec
    section.insertAdjacentElement("afterbegin", html`<h3>${id}</h3>`);
  }
}

function processDerivatives(dataModel) {
  if (!dataModel) return;
  const derivatives = Array.from(dataModel.classes).filter(classModel => {
    return classModel.stereoType === "DerivedType";
  });
  if (derivatives.length === 0) return;

  const appendix = html`<section class="appendix">
    <h1>${dataModel.name} Derived Types</h1>
    <table>
      <thead>
        <tr>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        ${derivatives.map(model => {
          return html`<tr>
            <td id="${model.id}">${model.name}</td>
          </tr>`;
        })}
      </tbody>
    </table>
  </section>`;
  document.body.append(appendix);
}

function processPrimitives(dataModel) {
  if (!dataModel) return;
  const primitives = Array.from(dataModel.classes).filter(classModel => {
    return classModel.stereoType === "PrimitiveType";
  });
  if (primitives.length === 0) return;

  const appendix = html`<section class="appendix">
    <h1>${dataModel.name} Primitive Types</h1>
    <table>
      <thead>
        <tr>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        ${primitives.map(model => {
          return html`<tr>
            <td id="${model.id}">${model.name}</td>
          </tr>`;
        })}
      </tbody>
    </table>
  </section>`;
  document.body.append(appendix);
}

/**
 * Convert <section data-model> and <section data-class> elements into
 * a normative data model definition using information from the Common
 * Data Model.
 */
export async function run() {
  const dataModelSections = document.querySelectorAll("section[data-model]");
  if (dataModelSections) {
    const promises = Array.from(dataModelSections).map(
      async dataModelSection => {
        try {
          await processDataModel(dataModelSection.id);
        } catch (error) {
          showError(`Cannot process model ${dataModelSection.id}: ${error}`);
        }
      }
    );
    await Promise.all(promises);
  }
}

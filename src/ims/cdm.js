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
import dataClassTmpl from "./templates/dataClass.js";
import dataModelTmpl from "./templates/dataModel.js";
import { html } from "../core/import-maps.js";
import { showError } from "../core/utils.js";

export const name = "ims/cdm";

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
        // eslint-disable-next-line no-undef
        "X-Api-Key": env.API_KEY,
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
  } catch {
    showError(
      `Could not get CDM model for ${id}. Please see the developer console for details.`,
      name
    );
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
          // eslint-disable-next-line no-undef
          "X-Api-Key": env.API_KEY,
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
 * @param {*} dataClass The CDM class object.
 */
async function processDataClass(dataClass) {
  const section = document.getElementById(dataClass.id);
  if (!section) {
    showError(`Missing class ${dataClass.id}`, name);
  } else {
    const fullElem = dataClassTmpl(dataClass);
    let target = null;
    Array.from(fullElem.childNodes).forEach(element => {
      if (!target) {
        section.insertAdjacentElement("afterbegin", element);
      } else {
        target.insertAdjacentElement("afterend", element);
      }
      target = element;
    });
    const sampleElement = section.querySelector("[data-sample]");
    if (sampleElement) {
      const includeOptionalFields =
        sampleElement.getAttribute("data-include-optional-fields") ?? "false";
      const sampleData = await getDataSample(
        dataClass.id,
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
  const dataModel = await getDataModel(id);
  if (!dataModel) return;

  const section = document.getElementById(dataModel.id);
  const fullElem = dataModelTmpl(dataModel);
  if (fullElem) {
    let target = null;
    Array.from(fullElem.childNodes).forEach(element => {
      if (target) {
        target.insertAdjacentElement("afterend", element);
      } else {
        section.insertAdjacentElement("afterbegin", element);
      }
      target = element;
    });
  }

  Array.from(dataModel.classes).map(async dataClass => {
    processDataClass(dataClass);
  });
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
          console.log("Check for API_KEY");
          // eslint-disable-next-line no-undef
          if (env.API_KEY) {
            await processDataModel(dataModelSection.id);
          }
        } catch (error) {
          showError(`Cannot read from CDM (no API_KEY defined): ${error}`);
        }
      }
    );
    await Promise.all(promises);
  }
}

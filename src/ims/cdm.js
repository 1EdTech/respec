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
import { sub } from "../core/pubsubhub.js";

export const name = "ims/cdm";

if (typeof window.env === "undefined") {
  window.env = {};
}

/**
 * Get the CDM API KEY from the configuration.
 *
 * @param {*} config The respecConfig
 * @returns The CDM API KEY.
 */
function getApiKey(config) {
  if (config.cdm.apiKey) {
    return config.cdm.apiKey;
  }
  throw "No CDM API KEY found";
}

/**
 * Get the CDM server URL from the configuration.
 *
 * @param {*} config The respecConfig
 * @returns The CDM server URL.
 */
function getBaseUrl(config) {
  if (config.cdm.serverUrl) {
    return config.cdm.serverUrl;
  }
  throw "No CDM server URL found";
}

/**
 * Execute the API call to retrieve the CDM model.
 *
 * @param {*} config The respecConfig
 * @param {string} id The id of the CDM model to retrieve
 * @returns The data model as an object
 */
async function getDataModel(config, id) {
  const query = JSON.stringify({
    query: `
    {
      modelByID(id: "${id}", source: ${config.cdm.source ?? "CORE"}) {
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
    const res = await fetch(`${getBaseUrl(config)}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": getApiKey(config),
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
    // console.log("fetched data", data);
    const dataModel = data.data.modelByID;
    if (!dataModel) {
      showError(
        `Unknown model ${id} at ${getBaseUrl(config)}, source: ${
          config.cdm.source ?? "CORE"
        }`,
        name
      );
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
 * @param {*} config The respecConfig
 * @param {string} id Common Data Model class id
 * @param {boolean} includeOptionalFields True if the sample should
 * include all optional fields (the default is false)
 * @returns The sample JSON object
 */
async function getDataSample(config, id, includeOptionalFields = false) {
  try {
    const res = await fetch(
      `${getBaseUrl(
        config
      )}/sample/${id}?includeOptionalFields=${includeOptionalFields}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": getApiKey(config),
        },
      }
    );
    if (!res.ok) {
      showError(`Could not get sampledata for ${id}: ${res.status}`, name);
      return null;
    }
    const data = await res.json();
    // console.log("fetched data", data);
    return data;
  } catch (error) {
    showError(`Could not get sample data for ${id}: ${error}`, name);
    return null;
  }
}

/**
 * Async function that returns the schema for a class.
 *
 * @param {*} config The respecConfig
 * @param {string} id Common Data Model class id
 * @returns The schema
 */
async function getSchema(config, id) {
  try {
    const res = await fetch(`${getBaseUrl(config)}/jsonschema/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": getApiKey(config),
      },
    });
    if (!res.ok) {
      showError(`Could not get the schema for ${id}: ${res.status}`, name);
      return null;
    }
    const data = await res.json();
    // console.log("fetched data", data);
    return data;
  } catch (error) {
    showError(`Could not get the schema for ${id}: ${error}`, name);
    return null;
  }
}

/**
 * Process a single data model class definition.
 *
 * @param {*} config The respecConfig
 * @param {*} classModel The CDM class object
 */
async function processDataClass(config, classModel) {
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
    showError(
      `Class ${classModel.id} is defined in the data model, but not included in the document`,
      name
    );
  } else {
    if (typeof config.cdm.dataClassTemplate !== "function") {
      config.cdm.dataClassTemplate = dataClassTemplate;
    }
    const wrapper = config.cdm.dataClassTemplate(classModel);
    if (wrapper) {
      let target = null;
      Array.from(wrapper.childNodes).forEach(element => {
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
        config,
        classModel.id,
        includeOptionalFields
      );
      if (sampleData) {
        // eslint-disable-next-line prettier/prettier
        const sample = html`
<pre class="nohighlight">
${JSON.stringify(sampleData, null, 2)}
</pre>`;
        sampleElement.append(sample);
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
 * @param {*} config The respecConfig.
 * @param {string} id The CDM id for the model.
 */
async function processDataModel(config, id) {
  const section = document.getElementById(id);
  const dataModel = await getDataModel(config, section.id);
  if (dataModel) {
    if (typeof config.cdm.dataModelTemplate !== "function") {
      config.cdm.dataModelTemplate = dataModelTemplate;
    }
    const wrapper = config.cdm.dataModelTemplate(dataModel);
    if (wrapper) {
      let target = null;
      Array.from(wrapper.childNodes).forEach(element => {
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
      processDataClass(config, classModel);
    });
    processDerivatives(dataModel);
    processPrimitives(dataModel);
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
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        ${derivatives.map(model => {
          return html`<tr>
            <td id="${model.id}">${model.name}</td>
            <td>${model.documentation.description}</td>
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
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        ${primitives.map(model => {
          return html`<tr>
            <td id="${model.id}">${model.name}</td>
            <td>${model.documentation.description}</td>
          </tr>`;
        })}
      </tbody>
    </table>
  </section>`;
  document.body.append(appendix);
}

/**
 * Validate the JSON in a <pre> element. The schema is identified
 * by a data-schema attribute.
 *
 * @param {*} config The respecConfig
 * @param {HTMLPreElement} pre The <pre> element that contains the JSON to be validated
 */
async function validateExample(config, pre) {
  const schemaId = pre.getAttribute("data-schema");
  if (schemaId === "") {
    showError("Example is missing a schema id", name);
    return;
  }
  const schemaDef = await getSchema(config, schemaId);
  if (schemaDef === null) return;
  try {
    const data = JSON.parse(pre.innerText);

    const Ajv = window.ajv2019;
    const ajv = new Ajv({
      allErrors: true,
      validateFormats: false,
    });

    const validate = ajv.compile(schemaDef);
    const valid = validate(data);
    if (!valid) {
      console.error(
        `Schema validation errors for ${schemaId}:`,
        validate.errors
      );
      showError(
        `Invalid example JSON for ${schemaId}. See console for details`,
        name
      );
    }
  } catch (error) {
    showError(`Cannot parse example JSON for ${schemaId}: ${error}`, name);
    return;
  }
}

/**
 * Convert <section data-model> and <section data-class> elements into
 * a normative data model definition using information from the Common
 * Data Model.
 *
 * @param {*} config respecConfig
 */
export async function run(config) {
  const dataModelSections = document.querySelectorAll("section[data-model]");
  if (dataModelSections) {
    const promises = Array.from(dataModelSections).map(
      async dataModelSection => {
        try {
          await processDataModel(config, dataModelSection.id);
        } catch (error) {
          showError(
            `Cannot process model ${dataModelSection.id}: ${error}`,
            name
          );
        }
      }
    );
    await Promise.all(promises);
  }

  if (typeof window.ajv2019 !== "undefined") {
    const examples = document.querySelectorAll("pre[data-schema]");
    if (examples) {
      const promises = Array.from(examples).map(async example => {
        try {
          await validateExample(config, example);
        } catch (error) {
          showError(`Cannot validate example ${example}: ${error}`, name);
        }
      });
      await Promise.all(promises);
    }
  }

  // Remove CDM config from initialUserConfig so API_KEY is not exposed
  sub("end-all", () => {
    const script = document.getElementById("initialUserConfig");
    const userConfig = JSON.parse(script.innerHTML);
    if ("cdm" in userConfig) {
      delete userConfig.cdm;
      script.innerHTML = JSON.stringify(userConfig, null, 2);
    }
  });
}

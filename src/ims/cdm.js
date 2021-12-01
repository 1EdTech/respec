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
import { addFormats } from "./ajv-formats.js";
import dataClassTemplate from "./templates/dataClass.js";
import dataModelTemplate from "./templates/dataModel.js";
import { html } from "../core/import-maps.js";
import { sub } from "../core/pubsubhub.js";

export const name = "ims/cdm";

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
async function processClass(config, classModel) {
  const section = document.querySelector(
    `section[data-class="${classModel.id}"]`
  );
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
      `Class ${classModel.id} is defined in the data model, but does not appear in the document`,
      name
    );
  } else {
    section.removeAttribute("data-class");
    let id = section.getAttribute("id");
    if (id === null) id = classModel.id;
    section.setAttribute("id", id);
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
  }
}

/**
 * Process a single data model definition.
 *
 * @param {*} config The respecConfig.
 * @param {string} modelId The CDM id for the model.
 */
async function processModel(config, modelId) {
  const section = document.querySelector(`section[data-model="${modelId}"]`);
  const dataModel = await getDataModel(config, modelId);
  if (dataModel) {
    let id = section.getAttribute("id");
    if (id === null) id = modelId;
    section.setAttribute("id", id);
    if (typeof config.cdm.dataModelTemplate !== "function") {
      config.cdm.dataModelTemplate = dataModelTemplate;
    }
    const wrapper = config.cdm.dataModelTemplate(dataModel);
    if (wrapper) {
      section.removeAttribute("data-model");
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
      processClass(config, classModel);
    });
    processDerivatives(dataModel);
    processPrimitives(dataModel);
  } else {
    // If there is no data model, add a header to satisfy Respec
    section.insertAdjacentElement("afterbegin", html`<h3>${modelId}</h3>`);
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
 * Generate a sample. The schema is identified by the data-sample attribute.
 *
 * @param {*} config The respecConfig
 * @param {HTMLElement} parentElem The element that will contain the generated sample
 */
async function processSample(config, parentElem) {
  const classId = parentElem.getAttribute("data-sample");
  if (classId === "") {
    showError("Example is missing a schema id", name);
    return;
  }
  let id = parentElem.getAttribute("id");
  if (id === null) id = `example-${classId}`;
  parentElem.setAttribute("id", id);
  parentElem.removeAttribute("data-sample");
  const includeOptionalFields =
    parentElem.getAttribute("data-include-optional-fields") ?? "false";
  const sampleData = await getDataSample(
    config,
    classId,
    includeOptionalFields
  );
  if (sampleData) {
    // eslint-disable-next-line prettier/prettier
      const sample = html`
<pre class="nohighlight">
${JSON.stringify(sampleData, null, 2)}
</pre>`;
    parentElem.append(sample);
  } else {
    parentElem.append(
      html`<p>Could not get sample data. See developer console for details.</p>`
    );
  }
}

/**
 * Validate the JSON in a <pre> element. The schema is identified
 * by a data-schema attribute.
 *
 * @param {*} config The respecConfig
 * @param {Object} ajv An instance of ajv2019
 * @param {HTMLPreElement} pre The <pre> element that contains the JSON to be validated
 */
async function validateExample(config, ajv, pre) {
  const schemaId = pre.getAttribute("data-schema");
  if (schemaId === "") {
    showError("Example is missing a schema id", name);
    return;
  }
  const schemaDef = await getSchema(config, schemaId);
  if (schemaDef === null) return;
  try {
    const data = JSON.parse(pre.innerText);
    const validate = ajv.compile(schemaDef);
    const valid = validate(data);
    if (!valid) {
      console.error(
        `Schema validation errors for ${schemaId}:`,
        validate.errors
      );
      pre.insertAdjacentElement(
        "beforebegin",
        html`<div class="admonition warning">
          <p>NOTE: This example contains invalid JSON for ${schemaId}.</p>
          <ul>
            ${validate.errors.map(error => {
              if (error.instancePath === "") error.instancePath = "class";
              let message = `${error.instancePath}: ${error.message}`;
              switch (error.keyword) {
                case "additionalProperties":
                  message += ` (additional property: "${error.params.additionalProperty})"`;
                  break;
              }
              return `<li>${message}</li>`;
            })}
          </ul>
        </div>`
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
  const promises = new Array();
  if (dataModelSections) {
    promises.push(
      ...Array.from(dataModelSections).map(async dataModelSection => {
        const modelId = dataModelSection.getAttribute("data-model");
        try {
          await processModel(config, modelId);
        } catch (error) {
          showError(`Cannot process model ${modelId}: ${error}`, name);
        }
      })
    );
  }

  const samples = document.querySelectorAll("[data-sample]");
  if (samples) {
    promises.push(
      ...Array.from(samples).map(async sample => {
        const classId = sample.getAttribute("data-sample");
        try {
          await processSample(config, sample);
        } catch (error) {
          showError(`Cannot generate sample ${classId}: ${error}`, name);
        }
      })
    );
  }

  if (typeof window.ajv2019 === "function") {
    const ajv = new window.ajv2019({
      allErrors: true,
    });
    addFormats(ajv);
    const examples = document.querySelectorAll("pre[data-schema]");
    if (examples) {
      promises.push(
        ...Array.from(examples).map(async example => {
          const classId = example.getAttribute("data-schema");
          try {
            await validateExample(config, ajv, example);
          } catch (error) {
            showError(`Cannot validate example ${classId}: ${error}`, name);
          }
        })
      );
    }
  }

  await Promise.all(promises);

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

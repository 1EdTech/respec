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
import enumerationClassTemplate from "./templates/enumerationClass.js";
import { html } from "../core/import-maps.js";
import primitiveClassTemplate from "./templates/primitiveTypeClass.js";
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
 * @param {string} source The source (CORE or SANDBOX) of the model
 * @param {string} id The id of the CDM model to retrieve
 * @returns The data model as an object
 */
async function getDataModel(config, source, id) {
  const key = `${source}-${id}`;
  const json = sessionStorage.getItem(key);
  if (json) return JSON.parse(json);
  const query = JSON.stringify({
    query: `
    {
      modelByID(id: "${id}", source: ${source ?? "CORE"}) {
        id
        name
        documentation {
          description
          notes
          issues
        }
        classes {
          id
          name
          stereoType
          documentation {
            description
            notes
            issues
            packageName
          }
          properties {
            name
            type {
              id
              name
              stereoType
            }
            cardinality {
              value
            }
            documentation {
              description
              notes
              issues
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
    sessionStorage.setItem(key, JSON.stringify(dataModel));
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
 * @param {HTMLElement} classSection The class section element
 * @param {*} classModel The CDM class object
 */
async function processClass(classSection, classModel) {
  const id = classSection.getAttribute("id") ?? classModel.id;
  classSection.setAttribute("id", id);
  const title = classSection.getAttribute("title");
  classSection.removeAttribute("data-class");
  // classSection.removeAttribute("title");
  let wrapper;
  switch (classModel.stereoType) {
    case "DerivedType":
      wrapper = primitiveClassTemplate(classModel, title);
      break;
    case "Enumeration":
    case "EnumExt":
      wrapper = enumerationClassTemplate(classModel, title);
      break;
    case "PrimitiveType":
      wrapper = primitiveClassTemplate(classModel, title);
      break;
    default:
      wrapper = dataClassTemplate(classModel, title);
      break;
  }

  if (wrapper) {
    let target = null;
    Array.from(wrapper.childNodes).forEach(element => {
      if (element.nodeName !== "#comment") {
        let thisElement = element;
        if (element.nodeName === "#text") {
          thisElement = document.createElement("text");
          thisElement.innerHTML = element.nodeValue;
        }
        if (target) {
          target.insertAdjacentElement("afterend", thisElement);
        } else {
          classSection.insertAdjacentElement("afterbegin", thisElement);
        }
        target = thisElement;
      }
    });
  }
}

/**
 * Check that every class of every model in the document has been defined.
 * @param {*} config The respecConfig which has the CDM source.
 * @param {HTMLElement[]} sections An array of data-model sections.
 */
function auditModels(config, sections) {
  const models = new Array();
  sections.forEach(section => {
    const modelId = section.getAttribute("data-model") ?? "";
    const source = section.getAttribute("data-source") ?? config.cdm.source;
    const key = `${source}-${modelId}`;
    if (models.indexOf(key) === -1) {
      models.push(key);
      const model = JSON.parse(sessionStorage.getItem(key));
      model.classes.forEach(classModel => {
        const section = document.getElementById(classModel.id);
        if (section === null) {
          showError(
            `AUDIT: Class definition for ${classModel.id} not found.`,
            name
          );
        }
      });
    }
  });
}

/**
 * Process a single data model section. A model can be split
 * across multiple sections (e.g. one section in the main content
 * and one in the appendices). The data-package attribute, if
 * present, acts as a filter for the section. Only classes in
 * the named package will be expected or generated.
 *
 * @param {*} config The respecConfig.
 * @param {HTMLElement} section The model section element.
 */
async function processModel(config, section) {
  // The model id
  const modelId = section.getAttribute("data-model") ?? "";

  // The CDM source (CORE|SANDBOX)
  const source = section.getAttribute("data-source") ?? config.cdm.source;
  if (source !== "CORE" && source !== "SANDBOX") {
    showError(`Invalid source ${source} for model ${modelId}`);
    return;
  }

  // True if missing class definitions should be generated
  const generateClasses =
    section.getAttribute("data-generate") === "" ||
    !!section.getAttribute("data-generate");

  // The preferred section title
  const title = section.getAttribute("title");

  // The section's unique id (used to calculate a unique header id)
  const id = section.getAttribute("id");

  // The package name filter, if any
  const packageName = section.getAttribute("data-package") ?? "";

  // The stereotype filter, if any
  const stereoType = section.getAttribute("data-stereotype") ?? "";

  // Remove all the attributes
  // section.removeAttribute("data-source");
  // section.removeAttribute("data-generate");

  const dataModel = await getDataModel(config, source, modelId);
  if (dataModel) {
    const wrapper = dataModelTemplate(dataModel, title, id);
    if (wrapper) {
      // section.removeAttribute("data-model");
      let target = null;
      Array.from(wrapper.childNodes).forEach(element => {
        if (element.nodeName !== "#comment") {
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
        }
      });
    }

    let classes = Array.from(dataModel.classes);

    if (packageName !== "") {
      classes = classes.filter(
        classModel => classModel.documentation.packageName === packageName
      );
    }

    if (stereoType !== "") {
      classes = classes.filter(
        classModel => classModel.stereoType === stereoType
      );
    }

    classes.forEach(async classModel => {
      let classSection = section.querySelector(
        `section[data-class="${classModel.id}"]`
      );
      if (classSection) {
        processClass(classSection, classModel);
      } else {
        if (generateClasses) {
          classSection = html`<section></section>`;
          processClass(classSection, classModel);
          section.insertAdjacentElement("beforeend", classSection);
        } else {
          const message = `Class ${classModel.id} is defined in the data model, but does not
          appear in the document`;
          showWarning(message, name, { elements: [section] });
          section.childNodes[0].insertAdjacentElement(
            "afterend",
            html`<div class="admonition warning">${message}.</div>`
          );
        }
      }
    });

    const unknownSections = section.querySelectorAll("section[data-class]");
    if (unknownSections) {
      Array.from(unknownSections).forEach(unknownSection => {
        const classId = unknownSection.getAttribute("data-class");
        const message = `Unknown or duplicate class ${classId}`;
        showWarning(message, name, { elements: [unknownSection] });
        unknownSection.insertAdjacentHTML(
          "afterbegin",
          `<h3>${classId}</h3>
            <div class="issue">${message}.</div>`
        );
      });
    }
  } else {
    // If there is no data model, add a header to satisfy Respec
    section.insertAdjacentElement("afterbegin", html`<h3>${modelId}</h3>`);
  }
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
  const id = parentElem.getAttribute("id") ?? `example-${classId}`;
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
    if (ajv.refs[schemaDef.$id] === undefined) {
      ajv.compile(schemaDef);
    }
    const validate = ajv.refs[schemaDef.$id].validate;
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
  const sections = document.querySelectorAll("section[data-model]");
  const promises = new Array();
  let index = 0;
  if (sections) {
    promises.push(
      ...Array.from(sections).map(async section => {
        const modelId = section.getAttribute("data-model") ?? "";
        if (modelId === "") {
          section.insertAdjacentElement(
            "afterbegin",
            html`<h2>Missing model id</h2>`
          );
          showError(
            "Cannot process data-model section without the data model id",
            name,
            { elements: [section] }
          );
        } else {
          section.setAttribute("id", `${modelId}.${index}`);
          index++;
          try {
            await processModel(config, section);
          } catch (error) {
            showError(`Cannot process model ${modelId}: ${error}`, name);
          }
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

  auditModels(config, sections);

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

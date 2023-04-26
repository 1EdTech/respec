// @ts-nocheck

/**
 * Module 1edtech/mps
 * Handles the optional Model Processing Service.
 */
import { addFormats } from "./ajv-formats.js";
import classTemplate from "./templates/classTemplate.js";
import dataModelTemplate from "./templates/dataModelTemplate.js";
import enumerationTemplate from "./templates/enumerationTemplate.js";
import { html } from "../core/import-maps.js";
import interfaceTemplate from "./templates/interfaceTemplate.js";
import jsonSchemaTemplate from "./templates/jsonSchemaTemplate.js";
import jsonSchemasTemplate from "./templates/jsonSchemasTemplate.js";
import openApiSchemaTemplate from "./templates/openApiSchemaTemplate.js";
import operationTemplate from "./templates/operationTemplate.js";
import serviceModelTemplate from "./templates/serviceModelTemplate.js";
import { showError } from "../core/utils.js";
import stereoTypeTemplate from "./templates/stereoTypeTemplate.js";
import { sub } from "../core/pubsubhub.js";

export const name = "1edtech/mps";

/**
 * Get the MPS API KEY from the configuration.
 *
 * @param {object} config The respecConfig
 * @returns {string} The MPS API KEY.
 */
function getApiKey(config) {
  if (config.mps.apiKey) {
    return config.mps.apiKey;
  }
  throw "No MPS API KEY found";
}

/**
 * Get the MPS server URL from the configuration.
 *
 * @param {object} config The respecConfig
 * @returns {string} The MPS server URL.
 */
function getBaseUrl(config) {
  if (config.mps.serverUrl) {
    return config.mps.serverUrl;
  }
  throw "No MPS server URL found";
}

/**
 * Async function that returns a sample JSON object for a single MPS Class.
 *
 * @param {object} config The respecConfig.
 * @param {string} id MPS Class id.
 * @param {boolean} includeOptionalFields True if the sample should include all optional fields (the default is false).
 * @returns {object} The sample JSON object.
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
    return data;
  } catch (error) {
    showError(`Could not get sample data for ${id}: ${error}`, name);
    return null;
  }
}

/**
 * Async function that returns the JSON Schema for an MPS Class.
 *
 * @param {object} config The respecConfig.
 * @param {string} id MPS Class id.
 * @param {boolean} allowAdditionalProperties If true or omitted, the generated schema will reflect the MPS model. If false, the generated schema will never allow additional properties. Use false to check examples for typos.
 * @returns {object} The JSON Schema object.
 */
async function getJsonSchema(config, id, allowAdditionalProperties = true) {
  try {
    const res = await fetch(
      `${getBaseUrl(
        config
      )}/jsonschema/${id}?allowAdditionalProperties=${allowAdditionalProperties}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": getApiKey(config),
        },
      }
    );
    if (!res.ok) {
      showError(`Could not get the schema for ${id}: ${res.status}`, name);
      return null;
    }
    const data = await res.json();
    return data;
  } catch (error) {
    showError(`Could not get the schema for ${id}: ${error}`, name);
    return null;
  }
}

// execute the API to retrieve the MPS class diagram (/classdiagram/{id})
async function getClassDiagram(config, id, omitProperties = false, hideTitle = false, title = null, packages = null, classes = null) {
  try {
    // create a query string from all the parameters
    let query = `?omitProperties=${omitProperties}&hideTitle=${hideTitle}`;
    if (title) query += `&title=${title}`;
    if (packages) query += `&packages=${packages}`;
    if (classes) query += `&classes=${classes}`;

    // execute the API call
    const res = await fetch(
      `${getBaseUrl(
        config
      )}/classdiagram/${id}${query}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "text/markdown",
          "X-Api-Key": getApiKey(config),
        },
      }
    );
    if (!res.ok) {
      showError(`Could not get the class diagram for ${id}: ${res.status}`, name);
      return null;
    }
    const data = await res.text();
    return data;
  } catch (error) {
    showError(`Could not get the class diagram for ${id}: ${error}`, name);
    return null;
  }
}

/**
 * Execute the API call to retrieve MPS Model Classes and Services.
 *
 * @param {object} config The respecConfig.
 * @param {string} source The source (CORE or SANDBOX) of the Model.
 * @param {string} id The id of the MPS Model to retrieve.
 * @returns {object} The model as an object.
 */
async function getModel(config, source, id) {
  const key = `${source}-${id}`;
  const json = sessionStorage.getItem(key);
  if (json) return JSON.parse(json);
  const query = JSON.stringify({
    query: `
    {
      modelByID(id: "${id}", source: ${source ?? "CORE"}) {
        id
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
            parentClass {
              id
              name
            }
          }
          isExtensible
        }
        services {
          ... on RestService {
            id
            type
            documentation {
              description
              notes
              issues
            }
            rootPath
            interfaces {
              id
              name
              documentation {
                description
                notes
                issues
              }
              operations {
                id
                name
                documentation {
                  description
                  notes
                  issues
                }
                method
                request {
                  id
                  documentation {
                    description
                    notes
                    issues
                  }
                  path
                  bodies {
                    documentation {
                      description
                      notes
                      issues
                    }
                    type {
                      id
                      name
                    }
                    cardinality {
                      value
                    }
                    contentType
                  }
                  parameters {
                    id
                    name
                    documentation {
                      description
                      notes
                      issues
                    }
                    type
                    cardinality {
                      value
                    }
                    value {
                      id
                      name
                      stereoType
                    }
                  }
                }
                responses {
                  id
                  documentation {
                    description
                    notes
                    issues
                  }
                  statusCode
                  bodies {
                    documentation {
                      description
                      notes
                      issues
                    }
                    type {
                      id
                      name
                      stereoType
                    }
                    cardinality {
                      value
                    }
                    contentType
                  }
                  parameters {
                    id
                    name
                    documentation {
                      description
                      notes
                      issues
                    }
                    type
                    cardinality {
                      value
                    }
                    value {
                      id
                      name
                      stereoType
                    }
                  }
                }
              }
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
        `Could not get MPS model for ${id}. Please see the developer console for details.`,
        name
      );
      return null;
    }
    const data = await res.json();
    const model = data.data.modelByID;
    if (!model) {
      showError(
        `Unknown model ${id} at ${getBaseUrl(config)}, source: ${
          config.mps.source ?? "CORE"
        }`,
        name
      );
      return null;
    }
    sessionStorage.setItem(key, JSON.stringify(model));
    return model;
  } catch (error) {
    showError(`Could not get MPS model for ${id}: ${error}`, name);
    return null;
  }
}

/**
 * Async function that returns the OpenAPI Schema for an MPS Model.
 *
 * @param {object} config The respecConfig.
 * @param {string} id MPS Model id.
 * @param {string} binding The OpenAPI Schema file format (YAML or JSON).
 * @returns {object} The OpenAPI Schema text.
 */
async function getOpenApiSchema(config, id, binding) {
  binding = binding ?? "yaml";
  try {
    const res = await fetch(
      `${getBaseUrl(
        config
      )}/openapischema/${id}?binding=${binding.toLowerCase()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": getApiKey(config),
        },
      }
    );
    if (!res.ok) {
      showError(
        `Could not get the OpenAPI schema for ${id}: ${res.status}`,
        name
      );
      return null;
    }
    const data = await res.text();
    return data;
  } catch (error) {
    showError(`Could not get the OpenAPI schema for ${id}: ${error}`, name);
    return null;
  }
}
/**
 * Process a single MPS Class model.
 *
 * @param {HTMLElement} section The class section element.
 * @param {object} classModel The MPS Class object.
 */
async function processClass(section, classModel) {
  section.setAttribute("id", classModel.id);
  const title = section.getAttribute("title");
  let wrapper;
  switch (classModel.stereoType) {
    case "Enum":
    case "EnumeratedList":
    case "Enumeration":
    case "EnumExt":
    case "Vocabulary":
      wrapper = enumerationTemplate(classModel, title);
      break;
    default:
      wrapper = classTemplate(classModel, title);
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
          section.insertAdjacentElement("afterbegin", thisElement);
        }
        target = thisElement;
      }
    });
  }
}

/**
 * Process a single data model section. A model can be split across multiple sections (e.g. one section
 * in the main content and one in the appendices). The data-package attribute, if present, acts as a
 * filter for the section. Only classes in the named package will be expected or generated.
 *
 * @param {object} config The respecConfig.
 * @param {HTMLElement} section The model section element.
 * @param {string} modelId The MPS Model id.
 */
async function processDataModel(config, section, modelId) {
  // The MPS/MPS source (CORE|SANDBOX)
  const source = section.getAttribute("data-source") ?? config.mps.source;
  if (source !== "CORE" && source !== "SANDBOX") {
    showError(`Invalid source ${source} for model ${modelId}`);
    return;
  }

  // The preferred section title
  const title = section.getAttribute("title");

  // The section's unique id (used to calculate a unique header id)
  const id = section.getAttribute("id");

  // The package name filter, if any
  const packageName = section.getAttribute("data-package") ?? "";

  const dataModel = await getModel(config, source, modelId);
  if (dataModel) {
    const wrapper = dataModelTemplate(dataModel, title, id);
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
            section.insertAdjacentElement("afterbegin", thisElement);
          }
          target = thisElement;
        }
      });
    }

    let classes = Array.from(dataModel.classes).filter(
      classModel =>
        classModel.stereoType !== "PrimitiveType" &&
        classModel.stereoType !== "DerivedType"
    );

    if (packageName !== "") {
      classes = classes.filter(
        classModel => classModel.documentation.packageName === packageName
      );
    }

    classes.forEach(async classModel => {
      let classSection = section.querySelector(
        `section[data-class="${classModel.id}"]`
      );
      if (classSection) {
        processClass(classSection, classModel);
      } else {
        // Auto-generate the class definition
        classSection = html`<section data-class="${classModel.id}"></section>`;
        processClass(classSection, classModel);
        section.insertAdjacentElement("beforeend", classSection);
      }
    });
  } else {
    // If there is no data model, add a header to satisfy Respec
    section.insertAdjacentElement("afterbegin", html`<h3>${modelId}</h3>`);
  }
}

/**
 * Process a single service interface model.
 *
 * @param {HTMLElement} section The service interface section element.
 * @param {object} serviceInterface The MPS Interface object.
 */
async function processInterface(section, serviceInterface) {
  const preferredId = section.getAttribute("id");
  section.setAttribute("id", serviceInterface.id);
  const title = section.getAttribute("title");
  const wrapper = interfaceTemplate(serviceInterface, title, preferredId);
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
          section.insertAdjacentElement("afterbegin", thisElement);
        }
        target = thisElement;
      }
    });

    const operations = Array.from(serviceInterface.operations);
    operations.forEach(async operation => {
      let operationSection = section.querySelector(
        `section[data-operation="${operation.id}"]`
      );
      if (operationSection) {
        processOperation(
          operationSection,
          serviceInterface.rootPath,
          operation
        );
      } else {
        // Auto-generate the operation section
        operationSection = html`<section
          data-operation="${operation.id}"
        ></section>`;
        processOperation(
          operationSection,
          serviceInterface.rootPath,
          operation
        );
        section.insertAdjacentElement("beforeend", operationSection);
      }
    });
  }
}

/**
 * Process the JSON Schema for single MPS Class model.
 *
 * @param {HTMLElement} section The class section element.
 * @param {object} classModel The MPS Class object.
 */
async function processJsonSchema(config, section, classModel) {
  section.setAttribute("id", `${classModel.id}-schema`);
  const title = section.getAttribute("title");
  const schema = await getJsonSchema(config, classModel.id);
  const wrapper = jsonSchemaTemplate(classModel, schema, title);
  if (schema && wrapper) {
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
}

/**
 * Process a JSON Schemas schemas section. Schemas can be split across multiple sections (e.g. one section
 * in the main content and one in the appendices). The data-package attribute, if present, acts as a
 * filter for the section. Only classes in the named package will be expected or generated.
 *
 * @param {object} config The respecConfig.
 * @param {HTMLElement} section The schema section element.
 * @param {string} modelId The MPS Model id.
 */
async function processJsonSchemas(config, section, modelId) {
  // The MPS/MPS source (CORE|SANDBOX)
  const source = section.getAttribute("data-source") ?? config.mps.source;
  if (source !== "CORE" && source !== "SANDBOX") {
    showError(`Invalid source ${source} for model ${modelId}`);
    return;
  }

  // The preferred section title
  const title = section.getAttribute("title");

  // The section's unique id (used to calculate a unique header id)
  const id = section.getAttribute("id");

  // The package name filter, if any
  const packageName = section.getAttribute("data-package") ?? "";

  const dataModel = await getModel(config, source, modelId);
  if (dataModel) {
    const wrapper = jsonSchemasTemplate(dataModel, title, id);
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
            section.insertAdjacentElement("afterbegin", thisElement);
          }
          target = thisElement;
        }
      });
    }

    let classes = Array.from(dataModel.classes).filter(
      classModel =>
        classModel.stereoType !== "PrimitiveType" &&
        classModel.stereoType !== "DerivedType"
    );

    if (packageName !== "") {
      classes = classes.filter(
        classModel => classModel.documentation.packageName === packageName
      );
    }

    classes.forEach(async classModel => {
      let classSection = section.querySelector(
        `section[data-class="${classModel.id}"]`
      );
      if (classSection) {
        processJsonSchema(config, classSection, classModel);
      } else {
        // Auto-generate the class definition
        classSection = html`<section data-class="${classModel.id}"></section>`;
        processJsonSchema(config, classSection, classModel);
        section.insertAdjacentElement("beforeend", classSection);
      }
    });
  } else {
    // If there is no data model, add a header to satisfy Respec
    section.insertAdjacentElement("afterbegin", html`<h3>${modelId}</h3>`);
  }
}

/**
 * Process an OpenAPI Schema section.
 *
 * @param {object} config The respecConfig.
 * @param {HTMLElement} section The schema section element.
 * @param {string} modelId The MPS Model id.
 */
async function processOpenApiSchema(config, section, modelId) {
  // The MPS/MPS source (CORE|SANDBOX)
  const source = section.getAttribute("data-source") ?? config.mps.source;
  if (source !== "CORE" && source !== "SANDBOX") {
    showError(`Invalid source ${source} for model ${modelId}`);
    return;
  }

  // The preferred section title
  const title = section.getAttribute("title");

  // The section's unique id (used to calculate a unique header id)
  const id = section.getAttribute("id");

  // The preferred schema binding
  const binding = section.getAttribute("data-binding");

  const dataModel = await getModel(config, source, modelId);

  const schema = await getOpenApiSchema(config, modelId, binding);

  if (dataModel && schema) {
    const wrapper = openApiSchemaTemplate(dataModel, schema, title, id);
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
            section.insertAdjacentElement("afterbegin", thisElement);
          }
          target = thisElement;
        }
      });
    }
  } else {
    // If there is no schema, add a header to satisfy Respec
    section.insertAdjacentElement("afterbegin", html`<h3>${modelId}</h3>`);
  }
}

/**
 * Process a single MPS Operation model.
 *
 * @param {HTMLElement} section The operation section element.
 * @param {string} rootPath The services root path.
 * @param {object} operation The MPS Operation object.
 */
async function processOperation(section, rootPath, operation) {
  section.setAttribute("id", operation.id);
  const title = section.getAttribute("title");
  const wrapper = operationTemplate(rootPath, operation, title);
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
          section.insertAdjacentElement("afterbegin", thisElement);
        }
        target = thisElement;
      }
    });
  }
}

/**
 * Generate a sample. The schema is identified by the data-sample attribute.
 *
 * @param {object} config The respecConfig.
 * @param {HTMLElement} parentElem The element that will contain the generated sample.
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
 * Process a single ServiceModel section. A ServiceModel can be split
 * across multiple sections (e.g. one section in the main content
 * and one in the appendices). The data-interface-filter attribute, if
 * present, acts as a filter for the section. Only operations in
 * the identified interface will be generated.
 *
 * @param {object} config The respecConfig.
 * @param {HTMLElement} section The model section element.
 * @param {string?} preferredId The preferred id for this section. This be moved to the header.
 */
async function processServiceModel(config, section, preferredId) {
  const modelId = section.getAttribute("data-model");
  const serviceModelId = section.getAttribute("data-service-model");
  const source = section.getAttribute("data-source") ?? config.mps.source;
  if (source !== "CORE" && source !== "SANDBOX") {
    showError(`Invalid source ${source} for model ${modelId}`);
    return;
  }

  // The preferred section title
  const title = section.getAttribute("title");

  const serviceModels = await getModel(config, source, modelId);
  const serviceModel = serviceModels.services.find(
    service => service.id === serviceModelId
  );
  if (serviceModel) {
    const wrapper = serviceModelTemplate(serviceModel, title, preferredId);
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
            section.insertAdjacentElement("afterbegin", thisElement);
          }
          target = thisElement;
        }
      });
    }

    // Merge service rootPath property into each interface for convenience
    let serviceInterfaces = [];
    serviceModel.interfaces.forEach(serviceInterface => {
      serviceInterface.rootPath = serviceModel.rootPath;
      serviceInterfaces.push(serviceInterface);
    });

    // The interface filter, if any
    const interfaceId = section.getAttribute("data-interface-filter") ?? "";
    if (interfaceId !== "") {
      serviceInterfaces = serviceInterfaces.filter(
        serviceInterface => serviceInterface.id === interfaceId
      );
    }

    // Process each interface
    serviceInterfaces.forEach(async serviceInterface => {
      let interfaceSection = section.querySelector(
        `section[data-interface="${serviceInterface.id}"]`
      );
      if (interfaceSection) {
        processInterface(interfaceSection, serviceInterface);
      } else {
        // Auto-generate the service definition
        interfaceSection = html`
          <section data-interface="${serviceInterface.id}"></section>
        `;
        processInterface(interfaceSection, serviceInterface);
        section.insertAdjacentElement("beforeend", interfaceSection);
      }
    });
  } else {
    // If there is no data model, add a header to satisfy Respec
    section.insertAdjacentElement("afterbegin", html`<h3>${modelId}</h3>`);
  }
}

/**
 * Process classes with a particular stereotype. Only the name and documentation of each class will be listed in a table.
 * Typically used to render the DerivedTypes and PrimitiveTypes.
 *
 * @param {object} config The respecConfig.
 * @param {HTMLElement} section The model section element.
 * @param {string} The MPS Model id.
 * @param {string} The MPS StereoType.
 */
async function processStereoType(config, section, modelId, stereoType) {
  // The MPS/MPS source (CORE|SANDBOX)
  const source = section.getAttribute("data-source") ?? config.mps.source;
  if (source !== "CORE" && source !== "SANDBOX") {
    showError(`Invalid source ${source} for model ${modelId}`);
    return;
  }

  // The preferred section title
  const title = section.getAttribute("title");

  // The section's unique id (used to calculate a unique header id)
  const id = section.getAttribute("id");

  const dataModel = await getModel(config, source, modelId);
  if (dataModel) {
    const wrapper = dataModelTemplate(dataModel, title, id);
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
            section.insertAdjacentElement("afterbegin", thisElement);
          }
          target = thisElement;
        }
      });
    }
    const typeList = stereoTypeTemplate(dataModel, stereoType);
    if (typeList) {
      section.insertAdjacentElement("beforeend", typeList);
    }
  } else {
    // If there is no data model, add a header to satisfy Respec
    section.insertAdjacentElement("afterbegin", html`<h3>${modelId}</h3>`);
  }
}

/**
 * Validate the JSON in a <pre> element. The schema is identified
 * by a data-schema attribute.
 *
 * @param {object} config The respecConfig.
 * @param {Object} ajv An instance of ajv2019.
 * @param {HTMLPreElement} pre The <pre> element that contains the JSON to be validated.
 */
async function validateExample(config, ajv, pre) {
  const schemaId = pre.getAttribute("data-schema");
  const allowAdditionalProperties =
    pre.getAttribute("data-allowAdditionalProperties") ?? true;
  if (schemaId === "") {
    showError("Example is missing a schema id", name);
    return;
  }
  const schemaDef = await getJsonSchema(
    config,
    schemaId,
    allowAdditionalProperties
  );
  if (schemaDef === null) return;
  try {
    // Remove comments from example
    let preText = pre.innerText;
    preText = preText.replace(/\/\/ .*$/gm, "");
    const data = JSON.parse(preText);
    if (ajv.refs[schemaDef.$id] === undefined) {
      ajv.compile(schemaDef);
    }
    const validate = ajv.refs[schemaDef.$id].validate;
    const valid = validate(data);
    if (!valid) {
      pre.insertAdjacentElement(
        "beforebegin",
        html`<div class="issue" title="Invalid JSON">
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
      showError(`Invalid example JSON for ${schemaId}.`, name);
    }
  } catch (error) {
    showError(`Cannot parse example JSON for ${schemaId}: ${error}`, name);
    return;
  }
}

/**
 * Render Model Processing Service objects.
 *
 * @param {object} config respecConfig.
 */
export async function run(config) {
  let promises = new Array();
  let index = 0;

  // Find all unique Model sections.
  const modelSections = Array.from(
    document.querySelectorAll("section[data-model]")
  );
  if (modelSections.length === 0) return;

  // Preload the models so later async threads don't need to
  const models = modelSections
    .map(section => {
      const modelId = section.getAttribute("data-model");
      const source = section.getAttribute("data-source") ?? config.mps.source;
      return `${source}-${modelId}`;
    })
    .filter((value, index, self) => self.indexOf(value) === index);
  promises.push(
    ...Array.from(
      models.map(model => {
        const params = model.split("-");
        return getModel(config, params[0], params[1]);
      })
    )
  );
  await Promise.all(promises);
  promises = new Array();

  // Divide the Model sections into DataModel sections, ServiceModel sections
  // and simple type lists.
  const dataModelSections = modelSections.filter(
    elem =>
      !elem.getAttribute("data-service-model") &&
      !elem.getAttribute("data-stereotype") &&
      !elem.getAttribute("data-schema-format")
  );
  const stereoTypeSections = modelSections.filter(elem =>
    elem.getAttribute("data-stereotype")
  );
  const serviceModelSections = modelSections.filter(elem =>
    elem.getAttribute("data-service-model")
  );
  const schemaSections = modelSections.filter(elem =>
    elem.getAttribute("data-schema-format")
  );

  // Process the DataModel sections.
  if (dataModelSections.length > 0) {
    promises.push(
      ...Array.from(dataModelSections).map(async section => {
        const modelId = section.getAttribute("data-model") ?? "";
        if (modelId === "") {
          section.insertAdjacentElement(
            "afterbegin",
            html`<h2>Missing Model id</h2>`
          );
          showError(
            "Cannot process DataModel sections without the Model id",
            name,
            { elements: [section] }
          );
        } else {
          section.setAttribute("id", `${modelId}.${index}`);
          index++;
          try {
            await processDataModel(config, section, modelId);
          } catch (error) {
            showError(`Cannot process DataModel ${modelId}: ${error}`, name);
          }
        }
      })
    );
  }

  // Process the StereoType sections.
  if (stereoTypeSections.length > 0) {
    promises.push(
      ...Array.from(stereoTypeSections).map(async section => {
        const modelId = section.getAttribute("data-model") ?? "";
        const stereoType = section.getAttribute("data-stereotype") ?? "";
        if (modelId === "") {
          section.insertAdjacentElement(
            "afterbegin",
            html`<h2>Missing Model id</h2>`
          );
          showError(
            "Cannot process SteroType sections without the Model id",
            name,
            { elements: [section] }
          );
        } else if (stereoType === "") {
          section.insertAdjacentElement(
            "afterbegin",
            html`<h2>Missing StereoType</h2>`
          );
          showError(
            "Cannot process SteroType sections without the StereoType",
            name,
            { elements: [section] }
          );
        } else {
          section.setAttribute("id", `${modelId}.${index}`);
          index++;
          try {
            await processStereoType(config, section, modelId, stereoType);
          } catch (error) {
            showError(
              `Cannot process StereoType ${modelId} ${stereoType}: ${error}`,
              name
            );
          }
        }
      })
    );
  }

  // Process the Schema sections.
  if (schemaSections.length > 0) {
    promises.push(
      ...Array.from(schemaSections).map(async section => {
        const modelId = section.getAttribute("data-model") ?? "";
        const schemaFormat =
          section.getAttribute("data-schema-format")?.toLowerCase() ?? "";
        if (modelId === "") {
          section.insertAdjacentElement(
            "afterbegin",
            html`<h2>Missing Model id</h2>`
          );
          showError(
            "Cannot process Schema sections without the Model id",
            name,
            { elements: [section] }
          );
        } else {
          section.setAttribute("id", `${modelId}.${index}`);
          index++;
          try {
            if (schemaFormat === "" || schemaFormat === "json") {
              await processJsonSchemas(config, section, modelId);
            } else {
              await processOpenApiSchema(config, section, modelId);
            }
          } catch (error) {
            showError(`Cannot process Schema for ${modelId}: ${error}`, name);
          }
        }
      })
    );
  }

  // Process the ServiceModel sections.
  if (serviceModelSections.length > 0) {
    promises.push(
      ...Array.from(serviceModelSections).map(async section => {
        const modelId = section.getAttribute("data-model") ?? "";
        const serviceModelId = section.getAttribute("data-service-model") ?? "";
        if (modelId === "") {
          section.insertAdjacentElement(
            "afterbegin",
            html`<h2>Missing Model id</h2>`
          );
          showError(
            "Cannot process ServiceModel section without the Model id",
            name,
            { elements: [section] }
          );
        } else if (serviceModelId === "") {
          section.insertAdjacentElement(
            "afterbegin",
            html`<h2>Missing ServiceModel id</h2>`
          );
          showError(
            "Cannot process ServiceModel section without the ServiceModel id",
            name,
            { elements: [section] }
          );
        } else {
          const preferredId = section.getAttribute("id");
          section.setAttribute("id", `${modelId}.${index}`);
          index++;
          try {
            await processServiceModel(config, section, preferredId);
          } catch (error) {
            showError(`Cannot process ServiceModel ${modelId}: ${error}`, name);
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

  // Clear the data model cache
  Array.from(document.querySelectorAll("section[data-model]"))
    .map(
      section => `${config.mps.source}-${section.getAttribute("data-model")}`
    )
    .forEach(key => {
      sessionStorage.removeItem(key);
    });

  // Remove MPS config from initialUserConfig so API_KEY is not exposed
  sub("end-all", () => {
    const script = document.getElementById("initialUserConfig");
    const userConfig = JSON.parse(script.innerHTML);
    if ("mps" in userConfig) {
      delete userConfig.mdm;
      script.innerHTML = JSON.stringify(userConfig, null, 2);
    }
  });
}

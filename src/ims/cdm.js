// @ts-check

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

/**
 * Process a single data model class definition.
 *
 * @param {string} id The CDM id for the class.
 */
async function processDataClass(id) {
  const query = JSON.stringify({
    query: `
    {
      classByID(id: "${id}") {
        id
        name
        documentation {
          description
        }
        properties {
          name
          type {
            id
            name
          }
          cardinality {
            value
          }
          documentation {
            description
          }
        }
      }
    }`,
  });

  fetch("https://imsum2.herokuapp.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": env.API_KEY,
    },
    body: query,
  })
    .then(res => res.json())
    .then(data => {
      console.log("fetched data", data);
      const payload = data.data.classByID;
      const section = document.getElementById(payload.id);
      const header = section.querySelector("h3");
      if (header) {
        // Replace the placeholder text with the class name
        const headerText = payload.name;
        let textChanged = false;
        header.childNodes.forEach(node => {
          if (node.nodeType === 3) {
            if (textChanged) {
              node.remove();
            } else {
              node.nodeValue = headerText;
              textChanged = true;
            }
          }
        });
        // Replace the TOC placeholder text with the same name
        const tocxref = document.querySelector(
          `a.tocxref[href='#${header.id}']`
        );
        if (tocxref) {
          let textChanged = false;
          tocxref.childNodes.forEach(node => {
            if (node.nodeType === 3) {
              if (textChanged) {
                node.remove();
              } else {
                node.nodeValue = headerText;
                textChanged = true;
              }
            }
          });
        }
        const fullElem = dataClassTmpl(payload);
        if (fullElem) {
          section.append(...fullElem.childNodes);
        }
      }
    });
}

/**
 * Process a single data model definition.
 *
 * @param {string} id The CDM id for the model.
 */
async function processDataModel(id) {
  const query = JSON.stringify({
    query: `
    {
      modelByID(id: "${id}") {
        id
        name
        classes {
          id
        }
        documentation {
          description
        }
      }
    }`,
  });

  fetch("https://imsum2.herokuapp.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": env.API_KEY,
    },
    body: query,
  })
    .then(res => res.json())
    .then(data => {
      console.log("fetched data", data);
      const payload = data.data.modelByID;
      const section = document.getElementById(payload.id);
      const header = section.querySelector("h2");
      if (header) {
        // Replace the placeholder text with the model name
        const headerText = `Data Model`;
        let textChanged = false;
        header.childNodes.forEach(node => {
          if (node.nodeType === 3) {
            if (textChanged) {
              node.remove();
            } else {
              node.nodeValue = headerText;
              textChanged = true;
            }
          }
        });

        // Replace the TOC placeholder text with the same name
        const tocxref = document.querySelector(
          `a.tocxref[href='#${header.id}']`
        );
        if (tocxref) {
          let textChanged = false;
          tocxref.childNodes.forEach(node => {
            if (node.nodeType === 3) {
              if (textChanged) {
                node.remove();
              } else {
                node.nodeValue = headerText;
                textChanged = true;
              }
            }
          });
        }
        const fullElem = dataModelTmpl(payload);
        if (fullElem) {
          header.insertAdjacentElement("afterend", fullElem);
        }
      }

      // Audit classes
      payload.classes.forEach(element => {
        const dataClass = section.querySelector(
          `section#${element.id.replaceAll(".", "\\.")}[data-class]`
        );
        if (!dataClass) {
          showError(`Missing class ${element.id}`, name);
        }
      });
    });
}

/**
 * Process all the <dataclass> elements in the document.
 *
 * @param {*} dataClasses Array of matching <dataclass> elements.
 */

function processDataClasses(dataClasses) {
  // Insert a place holder for this class. It will
  // be replaced asynchronously
  dataClasses.forEach(dataClass => {
    dataClass.prepend(html`<h3>${dataClass.id}</h3>`);
  });

  // Queue filling in the details
  dataClasses.forEach(dataClass => {
    processDataClass(dataClass.id);
  });
}

function processDataModels(dataModels) {
  dataModels.forEach(dataModel => {
    dataModel.prepend(html`<h2>${dataModel.id}</h2>`);
    const dataClasses = dataModel.querySelectorAll("section[data-class]");
    if (dataClasses) {
      processDataClasses(dataClasses);
    }
  });

  // Queue filling in the details
  dataModels.forEach(dataModel => {
    processDataModel(dataModel.id);
  });
}

/**
 * Convert <dataclass> elements into a normative data model
 * definition using information from the Common Data Model.
 */
export async function run() {
  const dataModels = document.querySelectorAll("section[data-model]");
  if (dataModels) {
    processDataModels(dataModels);
  }
}

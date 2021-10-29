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
import dataClassTmpl from "./templates/dataClass.js";
import dataModelTmpl from "./templates/dataModel.js";
import { html } from "../core/import-maps.js";

export const name = "ims/cdm";

/**
 * Replaces the heading text and the TOC entry.
 *
 * @param {HTMLHeadingElement} header The heading element to change
 * @param {String} headerText The new text
 */
function replaceHeaderText(header, headerText) {
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
  const tocxref = document.querySelector(`a.tocxref[href='#${header.id}']`);
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
    const header = section.querySelector("h3");
    replaceHeaderText(header, dataClass.name);
    const fullElem = dataClassTmpl(dataClass);
    if (fullElem) {
      let targetElem = header;
      fullElem.childNodes.forEach(element => {
        targetElem = targetElem.insertAdjacentElement("afterend", element);
      });
    }
  }
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

  fetch("https://imsum2.herokuapp.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // eslint-disable-next-line no-undef
      "X-Api-Key": env.API_KEY,
    },
    body: query,
  })
    .then(res => res.json())
    .then(data => {
      console.log("fetched data", data);
      const dataModel = data.data.modelByID;
      if (!dataModel) {
        showError(`Unknown CDM ${id}`, name);
        return;
      }
      const section = document.getElementById(dataModel.id);
      const header = section.querySelector("h2");
      replaceHeaderText(header, `${dataModel.name} Data Model`);

      const fullElem = dataModelTmpl(dataModel);
      if (fullElem) {
        header.insertAdjacentElement("afterend", fullElem);
      }

      dataModel.classes.forEach(dataClass => {
        processDataClass(dataClass);
      });
    });
}

/**
 * Process all of the <section data-model> elements in the document.
 *
 * @param {HTMLElement[]} dataModelSections An array of data-model sections
 */
function processDataModels(dataModelSections) {
  dataModelSections.forEach(dataModelSection => {
    // Insert placeholder headings to be replaced when
    // the fetch from CDM finishes.
    dataModelSection.prepend(html`<h2>${dataModelSection.id}</h2>`);
    const dataClassSections = dataModelSection.querySelectorAll(
      "section[data-class]"
    );
    if (dataClassSections) {
      dataClassSections.forEach(dataClassSection => {
        dataClassSection.prepend(html`<h3>${dataClassSection.id}</h3>`);
      });
    } else {
      showWarning(
        `No <section data-class> found for data-model ${dataModelSection.id}`,
        name
      );
    }
  });

  // Queue filling in the details
  try {
    // eslint-disable-next-line no-undef
    if (env.API_KEY) {
      dataModelSections.forEach(dataModelSection => {
        processDataModel(dataModelSection.id);
      });
    }
  } catch {
    showError("Cannot read from CDM (no API_KEY defined)");
  }
}

/**
 * Convert <section data-model> and <section data-class> elements into
 * a normative data model definition using information from the Common
 * Data Model.
 */
export async function run() {
  const dataModels = document.querySelectorAll("section[data-model]");
  if (dataModels) {
    processDataModels(dataModels);
  }
}

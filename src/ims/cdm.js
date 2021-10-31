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
      showError(`Could not get CDM for ${id}: ${res.status}`, name);
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
    showError(`Could not get CDM for ${id}: ${error}`, name);
    return null;
  }
}

/**
 * Replaces the heading text and the TOC entry.
 *
 * @param {HTMLHeadingElement} header The heading element to change
 * @param {String} headerText The new text
 */
// function replaceHeaderText(header, headerText) {
//   let textChanged = false;
//   header.childNodes.forEach(node => {
//     if (node.nodeType === 3) {
//       if (textChanged) {
//         node.remove();
//       } else {
//         node.nodeValue = headerText;
//         textChanged = true;
//       }
//     }
//   });
//   // Replace the TOC placeholder text with the same name
//   const tocxref = document.querySelector(`a.tocxref[href='#${header.id}']`);
//   if (tocxref) {
//     let textChanged = false;
//     tocxref.childNodes.forEach(node => {
//       if (node.nodeType === 3) {
//         if (textChanged) {
//           node.remove();
//         } else {
//           node.nodeValue = headerText;
//           textChanged = true;
//         }
//       }
//     });
//   }
// }

/**
 * Process a single data model class definition.
 *
 * @param {*} dataClass The CDM class object.
 */
function processDataClass(dataClass) {
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
    // const sample = section.querySelector("[data-sample]");
    // if (sample) {
    //   const includeOptionalFields =
    //     sample.getAttribute("data-include-optional-fields") ?? "false";
    //   fetch(
    //     `https://imsum2.herokuapp.com/sample/${dataClass.id}?includeOptionalFields=${includeOptionalFields}`,
    //     {
    //       method: "GET",
    //       headers: {
    //         // "Content-Type": "application/json",
    //         // eslint-disable-next-line no-undef
    //         "X-Api-Key": env.API_KEY,
    //       },
    //     }
    //   )
    //     .then(res => {
    //       if (res.ok) {
    //         res.json().then(data => {
    //           sample.append(html`<pre class="json">
    //         ${JSON.stringify(data)}
    //         </pre
    //           >`);
    //         });
    //       } else {
    //         throw res;
    //       }
    //     })
    //     .catch(() => {
    //       showError(`Cannot fetch sample for ${dataClass.id}`, name);
    //       sample.append(html`<p>Error: Cannot fetch sample</p>`);
    //     });
    // }
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
 * Process all of the <section data-model> elements in the document.
 *
 * @param {HTMLElement[]} dataModelSections An array of data-model sections
 */
// const processDataModels = async function (dataModelSections) {
//   dataModelSections.forEach(dataModelSection => {
//     // Insert placeholder headings to be replaced when
//     // the fetch from CDM finishes.
//     dataModelSection.prepend(html`<h2>${dataModelSection.id}</h2>`);
//     const dataClassSections = dataModelSection.querySelectorAll(
//       "section[data-class]"
//     );
//     if (dataClassSections) {
//       dataClassSections.forEach(dataClassSection => {
//         dataClassSection.prepend(html`<h3>${dataClassSection.id}</h3>`);
//       });
//     } else {
//       showWarning(
//         `No <section data-class> found for data-model ${dataModelSection.id}`,
//         name
//       );
//     }
//   });

//   // Queue filling in the details
//   try {
//     // eslint-disable-next-line no-undef
//     if (env.API_KEY) {
//       dataModelSections.forEach(async dataModelSection => {
//         await processDataModel(dataModelSection.id);
//       });
//     }
//   } catch (error) {
//     showError(`Cannot read from CDM (no API_KEY defined): ${error}`);
//   }
// };

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

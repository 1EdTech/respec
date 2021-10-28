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
import env from "../../env.js";
import { html } from "../core/import-maps.js";

export const name = "ims/cdm";

/**
 * Process a single data model class definition.
 *
 * @param {string} id The CDM id for the class.
 */
async function processClass(id) {
  const query = JSON.stringify({
    query: `{
        classByID(id: "${id}") {
        id
        name
        properties {
            name
            cardinality {
            label
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
      "X-Api-Key": env().API_KEY,
    },
    body: query,
  })
    .then(res => res.json())
    .then(data => {
      console.log("fetched data", data);
      const payload = data.data.classByID;
      const section = document.getElementById(payload.id);
      const header = section.getElementsByTagName("h3")[0];
      if (header) {
        // Replace the placeholder text with the class name
        const headerText = payload.name;
        header.childNodes.forEach(node => {
          if (node.nodeType === 3) {
            node.nodeValue = headerText;
          }
        });
        // Replace the TOC placeholder text with the same name
        const tocxrefs = document.getElementsByClassName("tocxref");
        Array.from(tocxrefs).forEach(tocxref => {
          const href = tocxref.getAttribute("href");
          const headerId = `#${header.id}`;
          if (href === headerId) {
            tocxref.childNodes.forEach(node => {
              if (node.nodeType === 3) {
                node.nodeValue = headerText;
              }
            });
          }
        });
      }
      const fullElem = dataClassTmpl(payload);
      if (fullElem) {
        section.append(fullElem);
      }
    });
}

/**
 * Process all the <dataclass> elements in the document.
 * 
 * @param {*} classes Array of matching <dataclass> elements.
 */

function processDataClasses(classes) {
  // Insert a place holder for this class. It will
  // be replaced asynchronously
  classes.forEach(element => {
    element.replaceWith(
      html`<section id="${element.id}"><h3>${element.id}</h3></section>`
    );
  });

  // Queue filling in details
  classes.forEach(element => {
    const id = element.id;
    processClass(id);
  });
}

/**
 * Convert <dataclass> elements into a normative data model
 * definition using information from the Common Data Model.
 */
export async function run() {
  const classes = document.querySelectorAll("dataclass");

  if (!classes) {
    return;
  }

  processDataClasses(classes);
}

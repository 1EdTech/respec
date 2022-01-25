// @ts-check
import { html } from "../../core/import-maps.js";

/**
 * Render a CDM issue as a Respec issue.
 * @param {String} issue A CDM issue ("q:" in a .lines file).
 * @returns The issue wrapped in a div with class="issue".
 */
export function renderIssue(issue) {
  return html`<div class="issue">${issue}</div>`;
}

/**
 * Render a CDM note as a Respec note.
 * @param {String} note A CDM note ("n:" in a .lines file).
 * @returns The note wrapped in a div with class="note".
 */
export function renderNote(note) {
  return html`<div class="note">${note}</div>`;
}

/**
 * Render a term as HTML.
 * @param {*} term A CDM model for a property representing an enumeration
 * or vocabulary term.
 * @returns A table row with information about the term.
 */
export function renderTerm(term) {
  return html`<tr>
    <td id="${term.name.toLowerCase()}">${term.name}</td>
    <td>
      ${term.documentation.description}
      ${term.documentation.issues.map(renderIssue)}
      ${term.documentation.notes.map(renderNote)}
    </td>
  </tr>`;
}

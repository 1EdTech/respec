// @ts-check
import { html } from "../../core/import-maps.js";

/**
 * Render a MPS issue as a Respec issue.
 * @param {String} issue A MPS issue ("q:" in a .lines file).
 * @returns The issue wrapped in a div with class="issue".
 */
export function renderIssue(issue) {
  return html`<div class="issue" title="${issue}"></div>`;
}

/**
 * Render a MPS note as a Respec note.
 * @param {String} note A MPS note ("n:" in a .lines file).
 * @returns The note wrapped in a div with class="note".
 */
export function renderNote(note) {
  return html`<div class="note">${note}</div>`;
}

/**
 * Render a MPS privacy doc as a Respec note.
 * @param {*} config The ReSpec config object.
 * @param {String} doc A MPS privacy doc ("pd:" in a .lines file).
 * @returns The doc wrapped in a div with class="note".
 */
export function renderPrivacyImplicationDoc(config, doc) {
  if (config.showPrivacyAppendix && doc) {
    return html`<div class="advisement">Privacy implication: ${doc}</div>`;
  }
}
/**
 * Render a term as HTML.
 * @param {*} term A MPS model for a property representing an enumeration
 * or vocabulary term.
 * @returns A table row with information about the term.
 */
export function renderTerm(term) {
  const id = `${term.parentClass.name}.${term.name}`.toLowerCase();
  return html`<tr>
    <td id="${id}">${term.name}</td>
    <td>
      ${term.documentation.description}
      ${term.documentation.issues.map(renderIssue)}
      ${term.documentation.notes.map(renderNote)}
    </td>
  </tr>`;
}

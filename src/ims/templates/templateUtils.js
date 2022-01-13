// @ts-check
import { html } from "../../core/import-maps.js";

export function renderIssue(issue) {
  return html`<div class="issue">${issue}</div>`;
}

export function renderNote(note) {
  return html`<div class="note">${note}</div>`;
}

export function renderTerm(term) {
  return html`<tr>
    <td>${term.name}</td>
    <td>
      ${term.documentation.description}
      ${term.documentation.issues.map(renderIssue)}
      ${term.documentation.notes.map(renderNote)}
    </td>
  </tr>`;
}

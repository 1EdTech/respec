// @ts-check
import { html } from "../../core/import-maps.js";

export default (dataModel, title) => {
  if (dataModel) {
    title = title ?? `${dataModel.name} Data Model`;
    return html`<h2>${title}</h2>
      <p>${dataModel.documentation.description}</p>
      ${dataModel.documentation.issues.map(renderIssue)}
      ${dataModel.documentation.notes.map(renderNote)}`;
  }
};

function renderIssue(issue) {
  return html`<div class="issue">${issue}</div>`;
}

function renderNote(note) {
  return html`<div class="note">${note}</div>`;
}

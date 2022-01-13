// @ts-check
import { renderIssue, renderNote } from "./templateUtils.js";
import { html } from "../../core/import-maps.js";

export default (classData, title) => {
  if (classData) {
    title = title ?? `${classData.name}`;
    return html`<h3>${title}</h3>
      <p>${classData.documentation.description}</p>
      ${classData.documentation.issues.map(renderIssue)}
      ${classData.documentation.notes.map(renderNote)}`;
  }
};

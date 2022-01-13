// @ts-check
import { renderIssue, renderNote, renderTerm } from "./templateUtils.js";
import { html } from "../../core/import-maps.js";

export default (classData, title) => {
  if (classData && classData.properties) {
    const suffix =
      classData.stereoType === "Vocabulary" ? "Vocabulary" : "Enumeration";
    title = title ?? `${classData.name} ${suffix}`;
    return html`<h3>${title}</h3>
      <p>${classData.documentation.description}</p>
      ${classData.documentation.issues.map(renderIssue)}
      ${classData.documentation.notes.map(renderNote)}
      <table>
        <thead>
          <tr>
            <th>Term</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${classData.properties.map(renderTerm)}
          ${classData.stereoType === "EnumExt"
            ? html`<tr>
                <td colspan="2">
                  This enumeration can be extended with new, proprietary terms.
                  The new terms must start with the substring 'ext:'.
                </td>
              </tr>`
            : html``}
        </tbody>
      </table>`;
  }
};

// @ts-check

import { toHTMLNode } from "./utils.js";

export const name = "1edtech/contrib";

export async function run(conf) {
  if (!conf.contributors) return;

  if (conf.specType !== "errata") {
    const useRoles = hasRoles(conf.contributors);
    const contrib = toHTMLNode(`<section id='contributors' class="appendix">
    <h2>List of Contributors</h2>
    <p>The following individuals contributed to the development of this document:</p>
    <table class="contributors" title="List of Contributors"
      summary="The list of contributors to this work.">
      <thead>
        <th>Name</th>
        <th>Organization</th>
        ${useRoles ? `<th>Role</th>` : ``}
      </thead>
      <tbody>
          ${personsToTableRows(conf.contributors, useRoles)}
      </tbody>
    </table>
    </section>`);
    document.body.appendChild(contrib);
  }
}

function personsToTableRows(arr, useRoles) {
  // use incoming sort
  let ret = "";
  arr.forEach(entry => {
    ret += `<tr><td class='name'>${entry.name}</td>`;
    ret += "<td class='co'>";
    if (entry.company) ret += entry.company;
    ret += "</td>";
    if (useRoles) {
      ret += "<td class='role'>";
      if (entry.role) ret += entry.role;
      ret += "</td>";
    }
    ret += "</tr>";
  });
  return ret;
}

function hasRoles(arr) {
  let hasRoles = false;
  arr.forEach(entry => {
    if (entry.role && entry.role.trim().length > 0) {
      hasRoles = true;
    }
  });
  return hasRoles;
}

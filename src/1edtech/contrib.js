// @ts-check

import { toHTMLNode } from "./utils.js";
import { getIntlData } from "../core/utils.js";

import localizationStrings from "./translations/contrib.js";
const l10n = getIntlData(localizationStrings);

export const name = "1edtech/contrib";

export async function run(conf) {
  if (!conf.contributors) return;

  if (conf.specType !== "errata") {
    const useRoles = hasRoles(conf.contributors);
    const contrib = toHTMLNode(`<section id='contributors' class="appendix">
    <h2>${l10n.title}</h2>
    <p>${l10n.intro}</p>
    <table class="contributors" title="${l10n.title}"
      summary="${l10n.summary}">
      <thead>
        <th>${l10n.name}</th>
        <th>${l10n.organization}</th>
        ${useRoles ? `<th>${l10n.role}</th>` : ``}
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

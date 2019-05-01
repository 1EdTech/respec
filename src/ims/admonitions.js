import { pub } from "core/pubsubhub";
import { toHTMLNode } from "ims/utils";
import { addId } from "core/utils";

export const name =  "ims/admonitions";

/*
* Handles admonitions, adding a top bar and a11y attrs
* Types currently supported:
* aside.note
* aside.ednote
* aside.warning
* aside.issue (will yield error if status is final, warning if CF)
*
* Alternate syntax is div.aside.note|warning|issue
*
* This replaces core/issues-notes.js, which has github features we can't utilize
* because of our non-open repos.
*/

export async function run(conf) {

  //check and warn for issue admons in late process stages
  var issues = document.body.querySelectorAll("aside.issue, div.aside.issue");
  if (issues.length > 0) {
    if(conf.specStatus == "IMS Final Release") {
        pub("error", "Issue asides must not be present when the status is 'IMS Final Release'");
      }
    else if(conf.specStatus == "IMS Candidate Final") {
        pub("warn", "Issue asides should not be present when the status is 'IMS Final Release'");
      }
    }

  //prep the output element
  var admons = document.body.querySelectorAll("aside.note, aside.ednote, aside.warning, aside.issue, "
  +" div.aside.note, div.aside.ednote div.aside.warning, div.aside.issue");

  //console.log("admons length: " + admons.length);

  admons.forEach((aside) => {
      var type = getAdmonType(aside);
      aside.setAttribute("role", "note");
      aside.classList.add("admonition");
      if (!aside.hasAttribute("id")) {
        addId(aside);
      }
      var topBar = toHTMLNode(`<div class='admon-top'>${type}</div>`);
      topBar.classList.add(type + "-title");
      aside.insertAdjacentElement('afterbegin', topBar);
  });
}

function getAdmonType(aside) {
  if(aside.classList.contains('note')) {
    return "note";
  } else if(aside.classList.contains('warning')) {
    return "warning";
  } else if(aside.classList.contains('issue')) {
    return "issue";
  }
  return "info";
}

// @ts-check

import { toHTMLNode } from "../ims/utils.js";

export const name = "ims/tooltips";

/**
 * Attach tooltips script.
 */
export async function run() {
  document.body.appendChild(
    toHTMLNode(
      `<script src='https://unpkg.com/tippy.js@2.5.4/dist/tippy.all.min.js'></script>`
    )
  );
  document.body.appendChild(toHTMLNode(`<script>tippy('[title]')</script>`));
}

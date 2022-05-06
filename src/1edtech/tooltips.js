// @ts-check

import { toHTMLNode } from "./utils.js";

export const name = "1edtech/tooltips";

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

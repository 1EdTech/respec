// @ts-check
/**
 * Module ims/style
 *
 * Inserts IMS stylesheet and replaces w3c/style.
 *
 * The CSS documents are pulled from known locations so the spec documents
 * can be located anywhere. Overrides are available via respecConfig.
 *
 * CONFIGURATION
 *
 * - overrideCSSLocation: by default ims-base.css will be loaded from
 *   https://purl.imsglobal.org/spec/ims-base.css
 */

import { linkCSS, toKeyValuePairs } from "../core/utils.js";

export const name = "ims/style";

/**
 * From w3c/style
 *
 * Make a best effort to attach meta viewport at the top of the head.
 * Other plugins might subsequently push it down, but at least we start
 * at the right place. When ReSpec exports the HTML, it again moves the
 * meta viewport to the top of the head - so to make sure it's the first
 * thing the browser sees. See js/ui/save-html.js.
 */
function attachMetaViewport() {
  const meta = document.createElement("meta");
  meta.name = "viewport";
  const contentProps = {
    width: "device-width",
    "initial-scale": "1",
    "shrink-to-fit": "no",
  };
  meta.content = toKeyValuePairs(contentProps).replace(/"/g, "");
  document.head.insertBefore(meta, document.head.firstChild);
}

/**
 * From w3c/style
 *
 * Ignores specStatus and always loads base.css.
 */
function linkW3cCSS() {
  linkCSS(document, "https://www.w3.org/StyleSheets/TR/2016/base.css");
}

/**
 * @param {*} conf respecConfig
 */
export async function run(conf) {
  // From w3c/style
  attachMetaViewport();
  linkW3cCSS();

  // Link to IMS stylesheet
  let cssURL = "https://purl.imsglobal.org/spec/ims-base.css";
  if (conf.overrideCSSLocation) {
    cssURL = conf.overrideCSSLocation;
  }
  linkCSS(document, cssURL);
}

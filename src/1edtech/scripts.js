// @ts-check
export const name = "ims/scripts";

/**
 * Attach fixup script.
 *
 * @param {*} conf respecConfig
 */
export async function run(conf) {
  if (!conf.noSideBarTOC) {
    // IMS canonical location
    let fixupURL = "https://purl.imsglobal.org/spec/fixup.js";
    if (conf.overrideFixupLocation) {
      fixupURL = conf.overrideFixupLocation;
    }
    attachScript(fixupURL);
  } else {
    document.body.className += " toc-inline";
  }
}

/**
 * Append the script to the document.
 *
 * @param {string} url the URL of the script to attach
 */
function attachScript(url) {
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.addEventListener(
    "load",
    () => {
      if (window.location.hash) {
        // eslint-disable-next-line
        window.location = window.location;
      }
    },
    { once: true }
  );
  script.src = url;
  document.body.appendChild(script);
}

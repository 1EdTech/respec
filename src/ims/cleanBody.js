// @ts-check
export const name = "ims/cleanBody";

/**
 * A snapshot-time body merciless script and inline css remover. Intended to
 * be used only by admins. The activators are conf.cleanBodyScripts,
 * conf.cleanBodyCSS, alternatively conf.cleanBodyAll
 *
 * @param {*} conf respecConfig
 */
export async function run(conf) {
  if (conf.cleanBodyAll || conf.cleanBodyScripts) {
    const scripts = document.body.querySelectorAll("script");
    scripts.forEach(script => {
      script.parentNode.removeChild(script);
    });
  }

  if (conf.cleanBodyAll || conf.cleanBodyCSS) {
    const styleElems = document.querySelectorAll("*[style]");
    styleElems.forEach(styleElem => {
      styleElem.removeAttribute("style");
    });
  }
}

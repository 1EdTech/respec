export const name = "1edtech/focus-code";

/**
 * @param {*} conf
 */
export async function run(conf) {
  const codes = document.body.querySelectorAll("pre code");
  codes.forEach(code => {
    code.tabIndex = 0;
  });
}


// @ts-check
/**
 * Sets the defaults for 1EdTech specs
 */
export const name = "1edtech/defaults";
import { coreDefaults } from "../core/defaults.js";

const imsDefaults = {};

export function run(conf) {
  // assign the defaults
  const lint =
    conf.lint === false
      ? false
      : {
          ...coreDefaults.lint,
          ...imsDefaults.lint,
          ...conf.lint,
        };
  Object.assign(conf, {
    ...coreDefaults,
    ...imsDefaults,
    ...conf,
    lint,
  });
}

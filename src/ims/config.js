// @ts-check

/**
 * check config and inform user if required ones are missing
 */

import { showError, toShortIsoDate } from "../core/utils.js";

export const name = "ims/config";

/**
 * Returns true if value is not null or empty.
 *
 * @param { string } value
 */
function check(value) {
  return value != undefined && value.trim().length > 0;
}

/**
 * @param {*} conf
 */
export async function run(conf) {
  if (!check(conf.specTitle)) {
    showError(
      "head config must have the <code>specTitle</code> property set: " +
        "title of the document, excluding version",
      name
    );
    conf.specTitle = "@@@FIXME (conf.specTitle)";
  }

  if (!check(conf.docVersion)) {
    showError(
      "head config must have the <code>docVersion</code> property set, e.g. 'June 28, 2019'",
      name
    );
    conf.docVersion = "@@@FIXME (conf.docVersion)";
  }

  if (!check(conf.specDate)) {
    if (conf.specStatus === "IMS Base Document") {
      conf.specDate = toShortIsoDate(new Date());
    } else {
      showError(
        "head config must have the <code>specDate</code> property set, e.g. 'June 28, 2019'",
        name
      );
      conf.specDate = "@@@FIXME(conf.specDate)";
    }
  }

  if (!check(conf.specNature)) {
    showError(
      "head config must have the <code>specNature</code> property set: one of 'normative' or 'informative'",
      name
    );
    conf.specNature = "informative";
  }

  if (!check(conf.specType)) {
    showError(
      "head config must have the <code>specType</code> property set: One of 'spec', 'cert', 'impl', 'errata', 'doc' ",
      name
    );
    conf.specType = "spec";
  }

  if (conf.specType === "doc" || conf.specType === "proposal") {
    return;
  }

  if (!check(conf.shortName)) {
    showError(
      "head config must have the <code>shortName</code> property set: " +
        "list at urls-names.md#shortnames",
      name
    );
    conf.shortName = "FIXME";
  }

  if (!check(conf.specStatus)) {
    showError(
      "head config must have the <code>specStatus</code> property set to " +
        "one of 'IMS Base Document', 'IMS Candidate Final', IMS Candidate Final Public', " +
        "or 'IMS Final Release'",
      name
    );
    conf.specStatus = "@@@FIXME(conf.specStatus)";
  }

  const statusValues = [
    "IMS Base Document",
    "IMS Candidate Final",
    "IMS Candidate Final Public",
    "IMS Final Release",
    "Proposal",
  ];
  if (statusValues.indexOf(conf.specStatus) == -1) {
    showError(
      "head config must have the <code>specStatus</code> property set to " +
        "one of 'IMS Base Document', 'IMS Candidate Final', 'IMS Candidate Final Public', " +
        "'IMS Final Release', or 'Proposal'",
      name
    );
  }

  if (!check(conf.specVersion)) {
    showError(
      "head config must have the <code>specVersion</code> property set, e.g. '1.1'",
      name
    );
    conf.specVersion = "@@@FIXME(conf.specVersion)";
  }
}

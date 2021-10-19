// @ts-check

/**
 * check config and inform user if required ones are missing
 */

import { pub } from "../core/pubsubhub.js";
import { toShortIsoDate } from "../core/utils.js";

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
    pub(
      "error",
      "head config must have the <code>specTitle</code> property set: " +
        "title of the document, excluding version"
    );
    conf.specTitle = "@@@FIXME (conf.specTitle)";
  }

  if (!check(conf.specDate)) {
    if (conf.specStatus === "IMS Base Document") {
      conf.specDate = toShortIsoDate(new Date());
    } else {
      pub(
        "error",
        "head config must have the <code>specDate</code> property set, e.g. 'June 28, 2019'"
      );
      conf.specDate = "@@@FIXME(conf.specDate)";
    }
  }

  if (!check(conf.specNature)) {
    pub(
      "error",
      "head config must have the <code>specNature</code> property set: one of 'normative' or 'informative'"
    );
    conf.specNature = "informative";
  }

  if (!check(conf.specType)) {
    pub(
      "error",
      "head config must have the <code>specType</code> property set: One of 'spec', 'cert', 'impl', 'errata', 'doc' "
    );
    conf.specType = "spec";
  }

  if (conf.specType === "doc" || conf.specType === "proposal") {
    return;
  }

  if (!check(conf.shortName)) {
    pub(
      "error",
      "head config must have the <code>shortName</code> property set: " +
        "list at urls-names.md#shortnames"
    );
    conf.shortName = "FIXME";
  }

  if (!check(conf.specStatus)) {
    pub(
      "error",
      "head config must have the <code>specStatus</code> property set to " +
        "one of 'IMS Base Document', 'IMS Candidate Final', IMS Candidate Final Public', " +
        "or 'IMS Final Release'"
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
    pub(
      "error",
      "head config must have the <code>specStatus</code> property set to " +
        "one of 'IMS Base Document', 'IMS Candidate Final', 'IMS Candidate Final Public', " +
        "or 'IMS Final Release'"
    );
  }

  if (!check(conf.specVersion)) {
    pub(
      "error",
      "head config must have the <code>specVersion</code> property set, e.g. '1.1'"
    );
    conf.specVersion = "@@@FIXME(conf.specVersion)";
  }
}

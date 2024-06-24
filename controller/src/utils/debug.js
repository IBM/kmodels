/* Copyright contributors to the Kmodels project */

"use strict";

const metadata = require("../services/metadata");
const {logger} = require("./logger");

/**
 * Dump KModels information for debugging purposes
 */
function dump() {
  logger.debug("** Dump **");
  logger.debug(`Metadata list: ${metadata.list()}`);
}

module.exports = {
  dump,
}
/* Copyright contributors to the Kmodels project */

"use strict";

const store = require("../controllers/store");
const logger = require("./logger");
const { StoreError } = require("./error");

/**
 * List all aviliable templates
 *
  * @returns Templates
 */
async function list() {
  const templates = store.get(process.env.STORE_URL, `templates`);
  return templates;
}

/**
 * Get a template version
 *
 * @param {*} name Template name
 * @param {*} version Template version
 *
  * @returns Template
 */
async function get(name, version) {
  logger.debug(`get ${name} ${version}`, {module: 'Templates'});
  try {
    return await store.get(process.env.STORE_URL, `template/${name}/versions/${version}`);
  } catch (error) {
    logger.error(error.message, {module: 'Templates'});
    throw new StoreError(`Store: failed to get template ${name}. Is store avilable?`);
  }
}

/**
 * Get template information
 *
 * @param {*} name Template name
 *
  * @returns Template information
 */
async function info(name) {
  logger.debug(`info ${name}`, {module: 'Templates'});
  try {
    return await store.get(process.env.STORE_URL, `template/${name}/info`)
  } catch (error) {
    logger.error(error.message, {module: 'Templates'});
    throw new StoreError(`Store: failed to get template ${name}`);
  }
}

module.exports = {
  list,
  get,
  info,
}
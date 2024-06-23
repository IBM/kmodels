"use strict";

const minio = require("../services/minio");
const {logger} = require("./logger");

/**
 * List all pipelines artifacts
 *
 * @returns Artifacts list
 */
async function list() {
  return await minio.listObjects('mlpipeline', 'artifacts');
}

/**
 * Remove artifact by model id
 *
 * @param {*} id Model unique id
 */
async function remove(id) {
  logger.debug(`remove`, {id, module: 'Artifacts'});
  for (const artifact of await list()) {
    if (artifact.name.indexOf(`artifacts/${id}`) === 0) {
      await minio.deleteObject('mlpipeline', artifact.name);
    }
  }
}

module.exports = {
  list,
  remove,
}
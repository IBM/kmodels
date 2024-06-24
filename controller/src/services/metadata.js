/* Copyright contributors to the Kmodels project */

"use strict";

const minio = require("./minio");
const {NotFoundError} = require('./error');
const logger = require("./logger");

// Reduce writes to storage
const cache = {};

/**
 * Write metadata to persistent storage and update cache
 *
 * @param {*} id Model unique id
 * @param {*} data Data to write
 *
 * @returns
 */
async function write(id, data) {
  logger.debug(`write`, {module: 'Metadata', id});
  await minio.putObject(id, process.env.METDATA_NAME || `metadata.json`, data);
  cache[id] = data;
  return cache[id];
}

/**
 * Read metadata from persistent storage and update cache.
 *
 * @param {String} id Model unique id
 * @param {Boolean} passthrough - Force read from storage
 *
 * @returns Model metadata
 */
async function read(id, passthrough=false) {
  logger.debug(`read`, {module: 'Metadata', id});
  if (!cache[id] || passthrough) {
    const data = await minio.getJsonObject(id, process.env.METDATA_NAME || `metadata.json`);
    if (data) {
      cache[id] = await minio.getJsonObject(id, process.env.METDATA_NAME || `metadata.json`);
    } else {
      throw new NotFoundError(`Metadata doesn't exists for ${id}`);
    }
    logger.debug(`cache updated [r]`, {module: 'Metadata', id});
  }
  return cache[id];
}

/**
 * Remove model metadata from cache
 *
 * @param {*} id Model unique id
 */
async function remove(id) {
  logger.info(`remove`, {module: 'Metadata', id});
  if (!(id in cache)) {
    logger.warn(`remove non existing cache entry`, {module: 'Metadata', id});
    return;
  }
  delete cache[id];
}

/**
 * Write metadata and update time
 *
 * @param {*} id Model unique id
 * @param {*} data
 */
async function update(id, data) {
  logger.info(`update`, {module: 'Metadata', id});
  logger.debug(`update ${JSON.stringify(data)}`, {module: 'Metadata', id});
  return await write(id, Object.assign(data, {
    updated: new Date().toISOString().replace(/\..+/, ''),
  }));
}

/**
 * Create and init model metadata
 *
 * @param {*} id Model unique id
 * @param {*} data Model metadata
 */
async function create(id, data) {
  logger.info(`create ${JSON.stringify(data)}`, {module: 'Metadata', id});
  return await write(id, data);
}

/**
 * Add event, keep last n events
 *
 * @param {*} id Model unique id
 * @param {*} event The event string
 * @param {*} n Total number of last events to keep
 */
async function event(id, event, n = 30) {
  logger.debug(`event ${event}`, {module: 'Metadata', id});
  const datetime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  const data = await read(id);
  data.events.push(`${datetime} ${event}`);
  if (data.events.length > n) {
    data.events.splice(0, data.events.length - n);
  }
  await write(id, data);
}

/**
 * Returns true if metadata exists for the specified id
 *
 * @param {*} id
 */
function exists(id) {
  return cache[id] ? true : false;
}

/**
 *
 * @param {*} id
 */
async function clone(id) {
  logger.debug(`clone`, {module: 'Metadata', id});
  const meta = JSON.parse(JSON.stringify(await read(id)));
  delete meta.id;
  return meta;
}

/**
 * Returns all cahce ids
 */
function list() {
  return Object.keys(cache);
}

module.exports = {
  write,
  read,
  update,
  remove,
  create,
  event,
  exists,
  clone,
  list,
}
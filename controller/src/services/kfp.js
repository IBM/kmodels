/* Copyright contributors to the Kmodels project */

"use strict";

const got = require("got");
const {logger} = require("./logger");

/**
 * Helper
 *
 * @param {*} url
 * @param {*} path
 * @returns
 */
 async function get(url, path, params = {}) {
  url = `${url}/${path}`;
  if (Object.keys(params).length) {
    const qs = Object.keys(params).map(
      key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
    ).join("&");
    url = `${url}?${qs}`;
  }
  logger.debug(`GET ${url}`, {module: 'Kfp'});
  const { body } = await got.get(url);
  return JSON.parse(body);
}

/**
 * Helper
 *
 * @param {*} url
 * @param {*} path
 * @param {*} body
 */
async function post(url, path, params, data) {
  url = `${url}/${path}`;
  // Add query parameters
  if (Object.keys(params).length) {
    const qs = Object.keys(params).map(
      key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
    ).join("&");
    url = `${url}?${qs}`;
  }
  // Post
  //  logger.info(`POST ${url} body:${JSON.stringify(data)}`);
  logger.debug(`POST ${url}`, {module: 'Kfp'});
  const { body } = await got.post(url, data);
  return JSON.parse(body);
}

/**
 * Helper
 *
 * @param {*} url
 * @param {*} path
 * @returns
 */
async function del(url, path) {
  url = `${url}/${path}`;
  logger.debug(`DELETE ${url}`, {module: 'Kfp'});
  const { body } = await got.delete(url);
  return JSON.parse(body);
}

module.exports = {
  get,
  post,
  del,
}

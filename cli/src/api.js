// Copyright contributors to the Kmodels project

"use strict";

const got = require("got");

/**
 * Helper
 *
 * @param {String} url
 * @param {String} path
 * @param {Object} params
 * @param {Object} data
 */
async function post(url, path, params, data) {
  // Build url
  url = `${url}/${path}`;
  // Default params
  params = params || {};
  // Remove undefined
  Object.keys(params).forEach(key => {
    if (params[key] === undefined) {
      delete params[key];
    }
  });
  // Add query parameters
  if (Object.keys(params).length) {
    const qs = Object.keys(params).map(
      key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
    ).join("&");
    url = `${url}?${qs}`;
  }
  try {
    const {body} = await got.post(url, {
      json: data,
    });
    return body;
  } catch (error) {
    throw error.response ? error.response.body : error;
  }
}

/**
 *
 * @param {*} url
 * @param {*} path
 * @param {*} params
 * @param {*} data
 * @returns
 */
async function put(url, path, params, data) {
  // Build url
  url = `${url}/${path}`;
  // Default params
  params = params || {};
  // Remove undefined
  Object.keys(params).forEach(key => {
    if (params[key] === undefined) {
      delete params[key];
    }
  });
  // Add query parameters
  if (Object.keys(params).length) {
    const qs = Object.keys(params).map(
      key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
    ).join("&");
    url = `${url}?${qs}`;
  }
  try {
    const {body} = await got.put(url, {
      json: data,
    });
    return body;
  } catch (error) {
    throw error.response ? error.response.body : error;
  }
}

/**
 *
 * @param {*} url
 * @param {*} path
 * @param {*} params
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
  const {body} = await got.get(url);
  return body;
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
  const {body} = await got.delete(url);
  return body;
}

module.exports = {
  post,
  put,
  get,
  del,
}
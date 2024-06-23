"use strict";

const got = require("got");
const {logger} = require("./logger");

/**
 *
 * @param {*} url
 * @param {*} data
 *
 * @returns
 */
async function post(url, data) {
  data = Object.assign({
    instances: [{}]
  }, data);
  logger.debug(`POST ${url} body:${JSON.stringify(data).substring(0, 60)}`, {module: 'Infer'});
  const { statusCode, body } = await got.post(url, {
      json: data,
    }
  );
  logger.debug(`POST response ${body.substring(0, 30)} ...`, {module: 'Infer'});
  return JSON.parse(body);
}

/**
 * Predict
 *
 * @param {*} url - Inference service predictor endpoint
 * @param {*} instances - Input
 *
 * @returns
 */
async function predict(url, instances) {
  return await post(url, { instances });
}

/**
 * Explain
 *
 * @param {*} url - Inference service explainer endpoint
 * @param {*} instances - Input
 *
 * @returns
 */
async function explain(url, instances) {
  return await post(url, { instances });
}

module.exports = {
  predict,
  explain,
}
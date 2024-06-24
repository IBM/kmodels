/* Copyright contributors to the Kmodels project */

"use strict";

const minio = require("../services/minio");
const metadata = require("../services/metadata");
const {toarray} = require("./helpers");

/**
 * List all deployed models. Exclude known non model buckets. Bucket is a model bucket
 * if it contain metadata object.
 *
 * @param {string} tags Comma seperated string list
 * @param {string} namespace Models namespace
 *
 * @returns Models names
 */
async function list(tags, namespace) {
  const buckets = await minio.listBuckets();
  const models = [];
  const exclude = process.env.NON_MODELS_BUCKETS || ['archive', 'mlpipeline', 'models-store']
  for (const bucket of buckets) {
    if (exclude.indexOf(bucket.name) === -1) {
      const exists = await minio.objectExists(bucket.name, 'metadata.json');
      if (exists) {
        if (tags) {
          tags = toarray(tags);
          const meta = await metadata.read(bucket.name);
          if (meta.tags.filter(t => tags.includes(t)).length > 0) {
            models.push({
              id: bucket.name
            });
          }
        } else {
          models.push({
            id: bucket.name
          });
        }
      }
    }
  }
  return models;
}

/**
 * Returns the total number of models
 *
 * @param {*} namespace
 */
async function total(namespace) {
  return (await list(undefined, namespace)).length;
}

module.exports = {
  list,
  total,
}
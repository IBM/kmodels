/* Copyright contributors to the Kmodels project */

"use strict";

const pipelines = require("../services/pipelines");
const runs = require("./runs");
const minio = require("../services/minio");
const artifacts = require("../models/artifacts");
const kserve = require("../services/kserve");
const {logger} = require("./logger");

/**
 * Remove all unused model resources
 */
async function sync(namespace) {
  logger.info(`start sync`, {module: 'Models', user: namespace});
  namespace = namespace || process.env.DEFAULT_USER;
  let result = { buckets: 0, models: 0, pipelines: 0, runs: 0, artifacts: 0, };
  try {
    // Get all deployed models
    const models = await kserve.list(namespace, ['splitter', 'ensemble', 'predictor']);
    // Sync models buckets
    let buckets = await minio.listBuckets();
    for (let bucket of await buckets) {
      // Skip non model buckets.
      if (['mlpipeline', 'models-store', 'pretrained'].find(b => b === bucket.name)) {
        continue;
      }
      // Delete orphan bucket (bucket without model)
      if (!models.find(m => m.id === bucket.name)) {
        logger.info(`Models: delete floating model bucket ${bucket.name}`);
        minio.deleteBucket(bucket.name, true);
        result.buckets += 1;
      }
    }
    // Remove orphan models (models without bucket)
    for (const m of await models) {
      if (!buckets.find(b => m.id === b.name)) {
        logger.info(`Models: orphan model ${m.id} detetced`);
        await kserve.remove(m.id, namespace);
        result.models += 1;
      }
    }
    // Pipelines
    for (const pipeline of await pipelines.list()) {
      if (!models.find(m => m.id === pipeline)) {
        logger.info(`Models: delete floating pipeline ${pipeline}`);
        pipelines.remove(pipeline);
        result.pipelines += 1;
      }
    }
    // Runs
    for (const run of await runs.list()) {
      if (!models.find(m => m.id === run.name)) {
        logger.info(`Models: delete floating run ${run.name}`);
        runs.remove(run.name);
        result.runs += 1;
      }
    }
    // Sync kfp artifacts
    for (const artifact of await artifacts.list()) {
      const name = artifact.name.substring(artifact.name.indexOf('artifacts/') + 'artifacts/'.length,
        artifact.name.indexOf("-"));
      if (!models.find(m => m.id === name)) {
        logger.info(`Models: delete floating artifact object ${artifact.name}`);
        await minio.deleteObject('mlpipeline', artifact.name);
        result.artifacts += 1;
      }
    }
    logger.info(`sync done`, {module: 'Models', user: namespace});
  } catch (e) {
    logger.warn(`sync failed ${e.message}`, {module: 'Models', user: namespace});
  }
  return result;
}

module.exports = {
  sync,
}

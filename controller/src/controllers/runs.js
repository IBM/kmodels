/* Copyright contributors to the Kmodels project */

"use strict";

const kfp = require("../services/kfp");
const {NotFoundError, KfpError} = require('./error');
const {logger} = require("./logger");

/**
 * Create a new run.
 * https://www.kubeflow.org/docs/components/pipelines/v1/reference/api/kubeflow-pipeline-api-spec/#operation--apis-v1beta1-pipelines-post
 * https://www.kubeflow.org/docs/components/pipelines/v1/reference/api/kubeflow-pipeline-api-spec/#operation--apis-v1beta1-runs-post
 *
 * @param {*} pipeline Pipe line id
 * @param {*} name Name not unique
 * @param {*} parameters
 *
 * @returns
 */
async function create(pipeline, name, parameters = []) {
  // List all pipelines
  const {pipelines} = await kfp.get(process.env.KFP_URL, `apis/${process.env.KFP_API_VERSION}/pipelines`);
  // Find pipeline
  const p = pipelines.find(p => p.name === pipeline);
  // Run
  if (p) {
    logger.debug(`create ${name || pipeline} args: ${JSON.stringify(parameters)}`, {module: 'Runs'});
    try {
      const response = await kfp.post(process.env.KFP_URL, `apis/${process.env.KFP_API_VERSION}/runs`, {}, {
        json: {
          name: name || pipeline,
          pipeline_spec: {
            pipeline_id: p.id,
            parameters
          }
        }
      })
      return response;
    } catch (error) {
      throw new KfpError(`Failed to create pipeline ${pipeline}. Make sure tekton installed properly.`);
    }
  } else {
    throw new NotFoundError(`Pipeline ${pipeline} not found`);
  }
}

/**
 * Delete a run
 * https://www.kubeflow.org/docs/components/pipelines/v1/reference/api/kubeflow-pipeline-api-spec/#operation--apis-v1beta1-runs--id--delete
 *
 * @param {*} name - Pipeline name
 */
async function remove(name) {
  // List all runs (returns undefined if none)
  const {runs} = await kfp.get(process.env.KFP_URL, `apis/${process.env.KFP_API_VERSION}/runs`);
  for (const run of runs || []) {
    logger.debug(`delete ${run.name} ${run.id}`, {module: 'Runs'});
    if (run.name === name) {
      await kfp.del(process.env.KFP_URL, `apis/${process.env.KFP_API_VERSION}/runs/${run.id}`);
    }
  }
}

/**
 * Keep last n pipeline runs
 *
 * @param {*} id Model unique id (this is the pipeline run name)
 * @param {*} n Number of n last runs to keep
 */
async function keep(id, n = 0) {
  logger.debug(`keep ${n}`, {id: id, module: 'Runs'});
  const runs = await list(id);
  runs.sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at);
  });
  for (let i = n; i < runs.length; i = i + 1) {
    logger.debug(`delete ${runs[i].name} ${runs[i].id}`, {module: 'Runs'});
    await kfp.del(process.env.KFP_URL, `apis/${process.env.KFP_API_VERSION}/runs/${runs[i].id}`);
  }
}

/**
 *
 * @param {*} id Run id
 */
async function archive(id) {
  try {
    const rersponse = await kfp.post(process.env.KFP_URL, `apis/${process.env.KFP_API_VERSION}/runs/${id}:archive`);
    return rersponse;
  } catch (error) {
    throw new NotFoundError(`Run ${id} doesn't exists`);
  }
}

/**
 * Find run by id
 * https://www.kubeflow.org/docs/components/pipelines/v1/reference/api/kubeflow-pipeline-api-spec/#operation--apis-v1beta1-runs--run_id--get
 *
 * @param {*} id Run id
 *
 * @returns
 */
async function find(id) {
  try {
    const {run} = await kfp.get(process.env.KFP_URL, `apis/${process.env.KFP_API_VERSION}/runs/${id}`);
    return run;
  } catch (error) {
    throw new NotFoundError(`Run ${id} doesn't exists`);
  }
}

/**
 * Run status
 * https://www.kubeflow.org/docs/components/pipelines/v1/reference/api/kubeflow-pipeline-api-spec/#/definitions/apiRun
 *
 * @param {*} id Run id
 */
async function status(id) {
  const run = await find(id);
  logger.debug(`status ${run.status}`, {module: 'Runs'});
  return run.status.toLowerCase();
}

/**
 * List all runs
 * https://www.kubeflow.org/docs/components/pipelines/v1/reference/api/kubeflow-pipeline-api-spec/#operation--apis-v1beta1-runs-get
 *
 * @param {*} name - Pipeline name (optional)
 *
 * @returns
 */
async function list(name) {
  let {runs} = await kfp.get(process.env.KFP_URL, `apis/${process.env.KFP_API_VERSION}/runs`);
  runs = runs || [];
  if (name) {
    runs = runs.filter(run => run.pipeline_spec.pipeline_name === name);
  }
  return runs.map(run => { return {
      id: run.id,
      name: run.name,
      created_at: run.created_at,
      finished_at: run.finished_at,
    }
  });
}

module.exports = {
  create,
  remove,
  keep,
  archive,
  find,
  status,
  list,
}
"use strict";

const jsYaml = require('js-yaml');
const FormData = require('form-data');
const kfp = require("./kfp");
const {logger} = require("./logger");
const {KfpError} = require('./error');

/**
 * Check if pipelines service exists on startup
 */
(async () => {
  await alive();
})();

/**
 * Returns true if service exists, false otherwise
 */
async function alive() {
  try {
    await kfp.get(process.env.KFP_URL, `apis/${process.env.KFP_API_VERSION}/healthz`);
    logger.info(`service exists`, {module: 'Pipelines'});
    return true;
  } catch (e) {
    logger.warn(`service doesn't exists`, {module: 'Pipelines'});
    return false;
  }
}

/**
 * Format pipeline. Rename, replace image registry and add common variables.
 *
 * @param {*} id Model unique id
 * @param {*} pipeline Template pipeline (yaml)
 * @param {*} config Optional configuration {env}
 *
 * @returns Pipeline in json after formating
 */
function prepare(id, pipeline, config = {}) {
  logger.debug(`prepare pipeline`, {module: 'Pipelines', id});
  // Rename pipeline
  let yaml = jsYaml.load(pipeline);
  logger.debug(`rename pipeline ${yaml.metadata.name}`, {module: 'Pipelines', id});
  yaml = jsYaml.load(pipeline.replace(new RegExp(yaml.metadata.name, 'g'), `${id}-pipeline`));
  // Format images
  for (const task of yaml.spec.pipelineSpec.tasks) {
    for (const step of task.taskSpec.steps) {
      if (step.image.indexOf('$REGISTRY/') === 0) {
        let registry = process.env.DOCKER_SERVER || '';
        if (registry.length) {
          if (registry.slice(-1) != '/') {
            registry += '/';
          }
          step.image = `${registry}${step.image.replace(/\$REGISTRY\//, '')}`;
        } else {
          step.image = step.image.replace(/\$REGISTRY\//, '');
        }
      }
    }
  }
  // Add env
  for (const task of yaml.spec.pipelineSpec.tasks) {
    for (const step of task.taskSpec.steps) {
      // Exclude system steps
      if (step.image !== 'busybox') {
        for (const e of config.env || []) {
          // Step might not have env variable.
          step.env = step.env || [];
          if (step.env.find(i => i.name === e.name) === undefined) {
            if (e.type === 'secret') {
              step.env.push({
                "name": e.name,
                "valueFrom": {
                  "secretKeyRef": {
                    "key": e.key,
                    "name": e.value
                  }
                }
              })
            }
          }
        }
      }
    }
  }
  logger.debug(`pipeline ${JSON.stringify(yaml)}`, {module: 'Pipelines', id});
  return yaml;
}

/**
 * Create model pipeline from template
 *
 * @param {*} id Model unique id
 * @param {*} pipeline
 * @param {*} namespace Name space where to run pipelines
 */
async function create(id, pipeline, namespace) {
  logger.debug(`create pipeline`, {module: 'Pipelines', id});
  // Upload pipeline
  const formData = new FormData()
  formData.append('uploadfile', Buffer.from(jsYaml.dump(pipeline), "utf-8"), 'pipeline.yaml');
  // Upload pipeline package
  try {
    return await kfp.post(process.env.KFP_URL, `apis/${process.env.KFP_API_VERSION}/pipelines/upload`, {
      name: id,
      description: "Auto generated by KModels"
    }, {
      body: formData
    });
  } catch (e) {
    logger.error(e.message, {module: 'Pipelines'});
    throw new KfpError(`pipelines: failed to create pipeline ${id}`);
  }
}

/**
 * Delete model pipeline
 *
 * @param {*} id Model unique id
 */
async function remove(id) {
  logger.debug(`remove pipeline`, {module: 'Pipelines', id});
  let response;
  // List all pipelines
  const {pipelines} = await kfp.get(process.env.KFP_URL, `apis/${process.env.KFP_API_VERSION}/pipelines`);
  if (pipelines) {
    // Find pipeline
    const pipeline = pipelines.find(p => p.name === id);
    // Run
    if (pipeline) {
      response = await kfp.del(process.env.KFP_URL, `apis/${process.env.KFP_API_VERSION}/pipelines/${pipeline.id}`);
    }  else {
      logger.warn(`doesn't exists`, {module: 'Pipelines', id});
    }
  }
  return response;
}

/**
 * Returns true if pipeline exists, false otherwise
 *
 * @param {*} id Model unique id
 */
async function exists(id) {
  const pipelines = await list();
  return (pipelines.indexOf(id) >= 0) ? true : false;
}

/**
 * List all pipelines
 *
 * @returns
 */
 async function list() {
  const {pipelines} = await kfp.get(process.env.KFP_URL, `apis/${process.env.KFP_API_VERSION}/pipelines`);
  // Undefined is returned if no ppipeline exists
  if (pipelines) {
    return pipelines.map(p => p.name);
  }
  return [];
}

module.exports = {
  alive,
  prepare,
  create,
  remove,
  exists,
  list,
}
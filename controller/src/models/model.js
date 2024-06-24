/* Copyright contributors to the Kmodels project */

"use strict";

const {v1: uuidv1} = require('uuid');
const merge = require('deepmerge');
const constants = require("./constants");
const kserve = require("../services/kserve");
const pipelines = require("../services/pipelines");
const artifacts = require("./artifacts");
const runs = require("../controllers/runs");
const isvc = require("../utils/isvc");
const metadata = require("../services/metadata");
const templates = require("./templates");
const connector = require("./connector");
const monitor = require("../services/monitor");
const metrics = require("../services/metrics");
const inference = require("../services/inference");
const minio = require("../services/minio");
const argoments = require("./arguments");
const archiver = require("./archiver");
const {toarray} = require("./helpers");
const {HttpRequestError, ModelError} = require('./error');
const {logger} = require("./logger");

/**
 * Create model metadata info
 *
 * @param {String} id Model unique id
 * @param {String} user KModels user
 * @param {Object} args
 * @param {Object} template Model template
 *
 * @returns Model metadata
 */
function metainfo(id, user, args, template) {
  const meta = {}
  meta.id = id;
  meta.kind = constants.MODEL_KIND;
  meta.version = "1.0.0";
  meta.user = user;
  meta.tags = toarray(args.tags);
  meta.owner = process.env.KMODELS_ID;
  meta.state = "init";
  meta.status = "running";
  meta.ready = false;
  meta.created = new Date().toISOString().replace(/\..+/, '');
  meta.configuration = merge({
    serve: {
      readiness: 900,
    },
    pipeline: {
      keep: 0,
    },
    connector: [],
    monitor: [],
    links: [],
  }, args.configuration);
  meta.template = {
    info: template.info,
    version: template.version,
    manifest: template.manifest,
    trainable: template.pipeline ? true : false,
  };
  //
  meta.events = [];
  // Store runs information
  meta.pipeline = {};
  // Inference service endpoints
  meta.service = {}
  if (template.manifest.kserve.transformer) {
    meta.service.predictor = `http://${meta.id}-transformer.${meta.user}/v1/models/${meta.id}:predict`;
    if (meta.service.explainer) {
      meta.service.explainer = `http://${meta.id}-transformer.${meta.user}/v1/models/${meta.id}:explain`;
    }
  } else {
    meta.service.predictor = `http://${meta.id}-predictor.${meta.user}/v1/models/${meta.id}:predict`;
    if (meta.service.explainer) {
      meta.service.explainer = `http://${meta.id}-explainer.${meta.user}/v1/models/${meta.id}:explain`
    }
  }
  // Controller metadata
  meta.controller = {
    version: require('../../package.json').version
  }
  return meta;
}

/**
 * Instansiate a model from template
 *
 * @param {Object} arg Create model arguments, including template, configuration etc.
 *
 * @returns Model unique id (generated or given)
 */
async function init(args) {
  logger.info(`-------------------------| NEW MODEL |------------------------`);
  logger.info(`init ${JSON.stringify(args)}`, {module: 'Model', id: args.id, user: args.user});
  // Model namesapce, will be used as user anme.
  const namespace = args.user || process.env.DEFAULT_USER;
  // Get template. If doesn't exists, excpetion will be thrown and model will not be created
  const template = await templates.get(args.template, args.version);
  // Generate model unqiue id
  let id = args.id;
  if (id && metadata.exists(id)) {
    throw new HttpRequestError(`Model ${id} already exists`);
  }
  while (!id || metadata.exists(id)) {
    id = `m${uuidv1().split('-')[0]}`;
  }
  // Create model, cleanup on failure
  try {
    // Create bucket
    await minio.createBucket(id);
    // Init metadata
    await metadata.create(id, metainfo(id, namespace, args, template));
    await metadata.event(id, "start model instansiation");
  } catch {
    // Clean up on failure
    await remove(id);
    throw new ModelError(`Failed to create model ${args.template}`);
  }
  // Return model unique id
  return id;
}

/**
 * Start model instansiation.
 *
 * @param {String} id Model unique id
 */
async function create(id) {
  const meta = await metadata.read(id);
  logger.info(`create`, {module: 'Model', id, user: meta.user});
  if (meta.template.trainable) {
    // Create pipeline, apply configuration
    const template = await templates.get(meta.template.info.name, meta.template.version);
    const env = [
      { name: "MINIO_URL", type: "secret", key: "host", value: "mlpipeline-minio-artifact" },
      { name: "MINIO_PORT", type: "secret", key: "port", value: "mlpipeline-minio-artifact" },
      { name: "MINIO_SECRET_KEY", type: "secret", key: "secretkey", value: "mlpipeline-minio-artifact" },
      { name: "MINIO_ACCESS_KEY", type: "secret", key: "accesskey", value: "mlpipeline-minio-artifact" },
    ]
    await pipelines.create(id, pipelines.prepare(id, template.pipeline, {env}), meta.user);
    // Start connectors. Must have at least one connector for trainable model.
    if (meta.configuration.connector.length !== 0) {
      for (const config of (meta.configuration.connector)) {
        connector.create(id, meta.user, config);
        await metadata.event(id, 'connector started');
      }
    } else {
      logger.error(`No connector was defined for trainable model.`, {module: 'Model', id, user: meta.user});
      throw new ModelError(`Missing connector`);
    }
    // Start monitors
    for (const config of (meta.configuration.monitor)) {
      monitor.create(id, meta.user, config);
      await metadata.event(id, 'monitor started')
    }
  } else {
    // No training, start inferencing using pretrained model
    await serve(id);
  }
}

/**
 * Remove all model allocated resources
 *
 * @param {String} id Model unique id
 */
async function remove(id) {
  const meta = await metadata.read(id);
  logger.info(`remove`, {module: 'Model', id, user: meta.user});
  if (meta.kind === 'model') {
    // TBI - Check that it is not linked to graph
  }
  await kserve.remove(id, meta.user);
  await pipelines.remove(id);
  await artifacts.remove(id);
  await runs.remove(id);
  await connector.remove(id, meta.user);
  await monitor.remove(id, meta.user);
  await metadata.remove(id);
  await archiver.remove(id);
  if (await minio.bucketExists(id)) {
    await minio.deleteBucket(id, true);
  }
}

/**
 * Get new data for model (data state)
 *
 * @param {String} id Model unique id
 */
async function data(id) {
  const meta = await metadata.read(id);
  logger.info(`data`, {module: 'Model', id, user: meta.user});
  // Get connector configuration (if exists)
  for (const config of (meta.configuration.connector || [])) {
    // Clear latest monitor results
    await monitor.clear(id);
    // Clear if exists (e.g., can happen after failure)
    await connector.remove(id, meta.user);
    await connector.create(id, meta.user, config);
    // Add event
    await metadata.event(id, 'connector started');
  }
}

/**
 * Train model on data (train state)
 *
 * @param {String} id Model unique id
 */
async function train(id) {
  const meta = await metadata.read(id);
  logger.info(`train`, {module: 'Model', id, user: meta.user});
  // Create pipeline run
  if (await pipelines.exists(id)) {
    // Set pipeline arguments
    const args = argoments.get('kfp', meta.configuration, meta.template.manifest);
    // Add model id, models path (model bucket sub path) and storage type
    args.push({name: "model_id", value: id});
    args.push({name: "models_path", value: constants.MODELS_PATH});
    args.push({name: "storage", value: 'minio'});
    // Create a new pipeline run.
    const {run} = await runs.create(id, id, args);
    meta.pipeline.run = run.id;
    await metadata.update(id, meta);
    await metadata.event(id, 'training started');
  } else {
    logger.error(`pipeline doesn't exists`, {module: 'Model', id, user: meta.user});
  }
}

/**
 * Archive model after training
 *
 * @param {String} id
 */
async function archive(id) {
  const meta = await metadata.read(id);
  logger.info(`archive`, {module: 'Model', id, user: meta.user});
  // Archive
  if (meta.configuration.archiver && meta.configuration.archiver.keep) {
    await archiver.archive(id)
    await archiver.keep(id, meta.configuration.archiver.keep);
  }
  // Clear run flag
  delete meta.pipeline.run;
  await metadata.update(id, meta);
  // Clean runs
  await runs.keep(id, meta.configuration.pipeline.keep);
  // Log event
  await metadata.event(id, "model archived");
}

/**
 * Restore model from archive.
 *
 * @param {String} id Model unique id (model to restore from)
 * @param {String} build Model build id
 */
async function restore(id, build) {
  // Source model
  let sid = id;
  let meta = await metadata.read(sid);
  logger.info(`restore ${build}`, {module: 'Model', id, user: meta.user});
  // Init new model
  id = await init({
    template: meta.template.info.name,
    version: meta.template.version,
    configuration: meta.configuration,
    user: meta.user,
    tags: meta.tags
  });
  // Overwrite metadata
  meta = await metadata.read(id);
  meta.sid = sid;
  meta.template.trainable = false;
  delete meta.configuration.connector;
  delete meta.configuration.monitor;
  await metadata.update(id, meta);
  // Restore
  connector.create(id, meta.user, {
    id: process.env.CONNECTOR_RESTORE || "restore",
    version: "latest",
    arguments: {
      id: sid,
      build,
    }
  });
  return id;
}

/**
 * Serve a model. Create inference service if not exists, otherwise, restart it.
 *
 * @param {String} id Model unique id
 */
async function serve(id) {
  const meta = await metadata.read(id);
  logger.info(`serve`, {module: 'Model', id, user: meta.user});
  // If model inference doesn't exists, create it, otheriwse, restart it.
  if (await kserve.exists(id, meta.user) === false) {
    // Generate inference service resource
    const resource = isvc.build(meta.template, id);
    // Common
    for (const component of isvc.getComponents()) {
      const container = isvc.getContainer(resource, component);
      if (container) {
        isvc.addImagePullSecret(
          isvc.getComponent(resource, component), process.env.DOCKER_SECRETS_NAME || "regcred"
        );
        isvc.addServiceAccount(
          isvc.getComponent(resource, component), "s3-secret-sa"
        ),
        isvc.addArguments(container, argoments.get(component, meta.configuration, meta.template.manifest));
        isvc.setResources(container, meta.configuration.serve.resources);
      }
    }
    // Predictor
    const predictor = isvc.getComponent(resource, 'predictor');
    if (predictor) {
      const container = isvc.getContainer(resource, 'predictor');
      isvc.setReadinessProbe(container, 5, 10, meta.configuration.serve.readiness / 10);
      // Add logger
      if (meta.configuration.logger === true) {
        isvc.addLogger(predictor,
          `http://broker-ingress.knative-eventing/${meta.user}/broker`
        )
      }
      // Add batcher
      if (meta.configuration.batcher) {
        isvc.addBatcher(predictor,
          meta.configuration.batcher.size, meta.configuration.latency
        )
      }
    }
    // For istio
    isvc.addAnnotations(resource, {
      "sidecar.istio.io/inject": "true",
      "sidecar.istio.io/rewriteAppHTTPProbers": "true",
      "serving.knative.openshift.io/enablePassthrough": "true",
    });
    // Create model inference servers
    await kserve.create(resource, meta.user);
    // Log event
    await metadata.event(id, "create inference server");
  } else {
    await kserve.restart(id, meta.user);
    await metadata.event(id, "restart inference server");
  }
}

/**
 * Model is ready/not ready for inferencing. If not ready we check with kserve
 *
 * @param {String} id Model unique id
 * @param {Boolean} ready ready state
 *
 */
async function ready(id, ready) {
  const meta = await metadata.read(id);
  if (ready === false) {
    ready = await kserve.ready(id, meta.user);
  }
  if (meta.ready !== ready) {
    await metadata.event(id, `model ${ready ? "ready": "not ready"}`);
  }
  logger.info(`${ready ? "ready": "not ready"}`, {module: 'Model', id, user: meta.user});
  meta.ready = ready;
  meta.storage = await minio.bucketUsage(id);
  // Add event
  await metadata.update(id, meta);
}

/**
 * Set model state, transform from resource (container state) to model state. Model
 * state depends on component type.
 *
 * @param {String} id Model unique id
 * @param {String} component Predictor / transformer / explainer / connector / monitor (optional)
 * @param {String} status Component status
 *
 * @returns Model state
 */
async function state(id, component, status) {
  const meta = await metadata.read(id);
  logger.info(`state:${component || ''} status:${status || ''}`, {module: 'Model', id});
  // Update model component status (if changed)
  try {
    let state = meta.state;
    // Set state
    if (component === "connector") {
      if (status === "running") {
        state = 'data';
      } else if (status === "failed") {
        state = 'failed';
      }
    } else if (component === "pipeline") {
      if ((status === "pending") || (status === "running")) {
        state = 'train';
      } else if (status === "failed") {
        state = 'failed';
      }
    } else if (component === "predictor") {
      if ((status === "pending") || (status === "running")) {
        state = 'serve';
      }
    } else if (component === "splitter") {
      if (status === "running") {
        state = 'serve';
      }
    } else if (component === "ensemble") {
      if (status === "running") {
        state = 'serve';
      }
    }
    // Update state / ready
    if ((state !== meta.state) || (status !== meta.status)) {
      logger.debug(`update state:${state} status:${status}`, {module: 'Model', id});
      meta.state = state;
      meta.status = status;
      await metadata.update(id, meta);
    }
    return meta.state;
  } catch (e) {
    logger.warn(`failed to set state ${status}, is model exists?`, {module: 'Model', id});
  }
}

/**
 * Request prediction from model
 *
 * @param {String} id Model unique id
 * @param {Object} request Instances to predict { instances: [ {}, {} ... ] }
 */
async function predict(id, request) {
  const meta = await metadata.read(id);
  return await inference.predict(meta.service.predictor, request.instances);
}

/**
 * Request explanation from model
 *
 * @param {String} id Model unique id
 * @param {Object} request Instances to explain { instances: [ {}, {} ... ]}
 */
async function explain(id, request) {
  const meta = await metadata.read(id);
  return await inference.explain(meta.service.explainer, request.instances);
}

/**
 * Returns model information
 *
 * @param {String} id Model unique id
 *
 * @returns Model information
 */
async function info(id) {
  const meta = await metadata.read(id);
  meta["metrics"] = await metrics.get(id);
  meta["monitor"] = await monitor.get(id);
  meta["history"] = await archiver.list(id);
  meta["links"] = await links(id);
  return meta;
}

/**
 * Returns true if model exists and it is healty.
 *
 * @param {String} id Model unique id
 *
 * @returns true if model exists, false otherwise
 */
function exists(id) {
  if (! metadata.exists(id)) {
    return false;;
  }
  return true;
}

/**
 * Update existing model
 *
 * @param {String} id Model unique id
 * @returns
 */
async function update(id, configuration) {
  logger.warn(`base model cannot be updated`, {module: 'Model', id});
}

/**
 * Returns model kind
 *
 * @param {String} id Model unique id
 *
 * @returns Returns model / graph
 */
async function kind(id) {
  const meta = await metadata.read(id);
  return meta.kind;
}

/**
 * Returns all models which id model is linked to.
 *
 * @param {String} id Model unique id
 */
async function links(id) {
  const links = [];
  for (const oid of metadata.list()) {
    const meta = await metadata.read(oid);
    if (meta.kind === constants.GRAPH_KIND) {
      for (const node of meta.configuration.nodes) {
        if (node.id === id) {
          links.push(oid);
        }
      }
    }
  }
  return links;
}

module.exports = {
  init,
  create,
  remove,
  serve,
  data,
  train,
  archive,
  restore,
  state,
  ready,
  predict,
  explain,
  info,
  update,
  exists,
  kind,
}

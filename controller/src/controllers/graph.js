"use strict";

const {v1: uuidv1} = require('uuid');
const merge = require('deepmerge');
const constants = require("./constants");
const metadata = require("../services/metadata");
const minio = require("../services/minio");
const kserve = require("../services/kserve");
const ig = require("../models/ig");
const {toarray} = require("./helpers");
const {HttpRequestError} = require('./error');
const {logger} = require("./logger");

/**
 * Create graph metadata info
 *
 * @param {*} id Graph unique id
 * @param {*} user KModels user
 * @param {*} args
 *
 * @returns Graph metadata
 */
function metainfo(id, user, args) {
  const meta = {}
  meta.id = id;
  meta.kind = constants.GRAPH_KIND;
  meta.version = "1.0.0";
  meta.user = user;
  meta.tags = toarray(args.tags);
  meta.owner = process.env.KMODELS_ID;
  meta.state = "init";
  meta.ready = false;
  meta.created = new Date().toISOString().replace(/\..+/, '');
  meta.configuration = merge({
    // Defaults
  }, args.configuration);
  meta.events = [];
  // Store runs information
  meta.pipeline = {};
  // Inference service endpoints
  meta.service = {}
  meta.service.predictor = `http://${meta.id}.${meta.user}/v1/models/${meta.id}:predict`;
  // Controller metadata
  meta.controller = {
    version: require('../../package.json').version
  }
  return meta;
}

/**
 * Create inference graph
 *
 * @param {*} args Create graph arguments
 *
 * @returns Graph unique id
 */
async function init(args) {
  logger.info(`-------------------------| NEW GRAPH |------------------------`);
  logger.info(`init ${JSON.stringify(args)}`, {module: 'Graph', id: args.id, user: args.user});
  // Model namesapce, will be used as user name.
  const namespace = args.user || process.env.DEFAULT_USER;
  // Generate graph unqiue id
  let id = args.id;
  if (id && metadata.exists(id)) {
    throw new HttpRequestError(`Graph ${id} already exists`);
  }
  while (!id || metadata.exists(id)) {
    id = `m${uuidv1().split('-')[0]}`;
  }
  // Create bucket
  await minio.createBucket(id);
  // Init metadata
  await metadata.create(id, metainfo(id, namespace, args));
  await metadata.event(id, "create graph");
  // Return graph unique id
  return id;
}

/**
 * Create new graph
 *
 * @param {*} id
 */
async function create(id) {
  const meta = await metadata.read(id);
  logger.info(`create`, {module: 'Graph', id, user: meta.user});
  serve(id);
}

/**
 * Update existing graph
 *
 * @param {*} id
 * @param {*} configuration
 */
async function update(id, configuration) {
  const meta = await metadata.read(id);
  logger.info(`update ${JSON.stringify(configuration)}`, {module: 'Graph', id, user: meta.user});
  meta.configuration.nodes = configuration;
  await metadata.update(id, meta);
  serve(id)
}

/**
 *
 * @param {*} id
 */
async function serve(id) {
  const meta = await metadata.read(id);
  logger.info(`serve`, {module: 'Graph', id, user: meta.user});
  const resource = ig.build(meta.configuration, id);
  // For istio
  ig.addAnnotations(resource, {
    "sidecar.istio.io/inject": "true",
    "sidecar.istio.io/rewriteAppHTTPProbers": "true",
    "serving.knative.openshift.io/enablePassthrough": "true",
  });
  // Create / update inference graph
  if (meta.state !== 'init') {
    await kserve.update(resource, meta.user, "/spec/nodes/root/steps");
  } else {
    await kserve.create(resource, meta.user);
  }
}

module.exports = {
  init,
  create,
  update,
}
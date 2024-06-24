/* Copyright contributors to the Kmodels project */

"use strict";

const constants = require("./constants");
const model = require("../models/model");
const models = require("../models/models");
const graph = require("./graph");
const feedback = require("./feedback");
const templates = require("./templates");
const events = require("./events");
const debug = require("./debug");
const {sync} = require("./synchronize");
const {StatusCodes} = require("http-status-codes");
const {NotFoundError, StoreError, ModelError} = require("./error");
const logger = require("./logger");

async function getVersion() {
  try {
    return { body: require('../../package.json').version, status: StatusCodes.OK };
  } catch (error) {
    logger.error(error);
    return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
  }
}

async function postModel({template, version, id, tags, user, configuration}) {
  logger.debug(`POST /model ${template} ${version} ${JSON.stringify(configuration)} ${id ? id : ''} ${tags ? tags : ''}`, {module: 'Api'});
  try {
    if (await models.total() >= parseInt(process.env.MAX_MODELS || constants.MAX_MODELS)) {
      throw new ModelError(`Exceeds number of max models`);
    }
    id = await model.init({template, version, configuration, id, user, tags});
    await model.create(id);
    return { body: id, status: StatusCodes.CREATED };
  } catch (error) {
    logger.error(error);
    await model.state(id, undefined, "failure");
    return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
  }
}

async function getModel({ id }) {
  logger.debug(`GET /model/${id}`, {module: 'Api'});
  try {
    return { body: await model.info(id), status: StatusCodes.OK };
  } catch (error) {
    logger.error(error);
    return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
  }
}

async function deleteModel({id}) {
  logger.debug(`DELETE /model/${id}`, {module: 'Api'});
  try {
    await model.remove(id);
    return { body: {}, status: StatusCodes.OK };
  } catch (error) {
    logger.error(error);
    return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
  }
}

async function postModelInferPredict({ id, body }) {
  logger.debug(`POST /model/${id}/inference/predict ${JSON.stringify(body).substring(0, 60)}`, {module: 'Api'});
  try {
    return { body: await model.predict(id, body), status: StatusCodes.OK }
  } catch (error) {
    logger.error(error);
    if (error instanceof NotFoundError) {
      return { body: error.message, status: StatusCodes.NOT_FOUND };
    } else {
      return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
    }
  }
}

async function postModelInferExplain({ id, body }) {
  logger.debug(`POST /model/${id}/inference/explain ${JSON.stringify(body).substring(0, 60)}`, {module: 'Api'});
  try {
    return { body: await model.explain(id, body), status: StatusCodes.OK }
  } catch (error) {
    logger.error(error);
    if (error instanceof NotFoundError) {
      return { body: error.message, status: StatusCodes.NOT_FOUND };
    } else {
      return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
    }
  }
}

async function postModelRestore({ id, build }) {
  logger.debug(`POST /model/${id}/restore ${build}`, {module: 'Api'});
  try {
    return { body: await model.restore(id, build), status: StatusCodes.OK };
  } catch (error) {
    logger.error(error);
    return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
  }
}

async function postModelFeedback({ id, body }) {
  logger.debug(`POST /model/${id}/feedback ${JSON.stringify(body)}`, {module: 'Api'});
  try {
    await feedback.add(id, body);
    return { body: {}, status: StatusCodes.OK };
  } catch (error) {
    logger.error(error);
    return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
  }
}

async function getModelFeedback({ id }) {
  logger.debug(`GET /model/${id}/feedback`, {module: 'Api'});
  try {
    return { body: await feedback.get(id), status: StatusCodes.OK };
  } catch (error) {
    logger.error(error);
    return { body: error.message, status: StatusCodes.BAD_REQUEST };
  }
}

async function deleteModelFeedback({ id }) {
  logger.debug(`DELETE /model/${id}/feedback`, {module: 'Api'});
  try {
    return { body: await feedback.remove(id), status: StatusCodes.OK }
  } catch (error) {
    logger.error(error);
    return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
  }
}

async function postModelRetrain({ id }) {
  logger.debug(`POST /model/${id}/retrain`, {module: 'Api'});
  try {
    await model.data(id);
    return { body: {}, status: StatusCodes.OK };
  } catch (error) {
    logger.error(error);
    if (error instanceof NotFoundError) {
      return { body: error.message, status: StatusCodes.NOT_FOUND };
    } else {
      return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
    }
  }
}

async function getModelReady({ id }) {
  logger.debug(`GET /model/${id}/status`, {module: 'Api'});
  try {
    const {ready} = await model.info(id);
    return { body: ready, status: StatusCodes.OK };
  } catch (error) {
    logger.error(error);
    if (error instanceof NotFoundError) {
      return { body: error.message, status: StatusCodes.NOT_FOUND };
    } else {
      return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
    }
  }
}

async function getModels({tags}) {
  logger.debug(`GET /models ${tags ? tags : ''}`, {module: 'Api'})
  try {
    return { body: await models.list(tags), status: StatusCodes.OK };
  } catch (error) {
    logger.error(error);
    return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
  }
}

async function postGraphSplitter({id, body, user}) {
  logger.debug(`POST /graph/splitter`, {module: 'Api'});
  try {
    id = await graph.init({id, user, configuration: {type: 'splitter', nodes: body}});
    await graph.create(id);
    return { body: id, status: StatusCodes.CREATED };
  } catch (error) {
    logger.error(error);
    await graph.remove(id);
    if (error instanceof StoreError) {
      return { body: error.message, status: StatusCodes.NOT_FOUND };
    } else {
      return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
    }
  }
}

async function putGraphSplitter({ id, body }) {
  logger.debug(`PUT /model/${id}`, {module: 'Api'});
  try {
    return { body: await graph.update(id, body), status: StatusCodes.OK };
  } catch (error) {
    logger.error(error);
    return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
  }
}

async function postGraphEnsemble({id, body, user}) {
  logger.debug(`POST /graph/ensemble`, {module: 'Api'});
  try {
    id = await graph.init({id, user, configuration: {type: 'ensemble', nodes: body}});
    await graph.create(id);
    return { body: id, status: StatusCodes.CREATED };
  } catch (error) {
    logger.error(error);
    await graph.remove(id);
    if (error instanceof StoreError) {
      return { body: error.message, status: StatusCodes.NOT_FOUND };
    } else {
      return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
    }
  }
}

async function putGraphEnsemble({ id, body }) {
  logger.debug(`PUT /model/${id}`, {module: 'Api'});
  try {
    return { body: await graph.update(id, body), status: StatusCodes.OK };
  } catch (error) {
    logger.error(error);
    return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
  }
}

async function getStoreTemplates() {
  logger.debug(`GET /store/templates`, {module: 'Api'})
  try {
    return { body: await templates.list(), status: StatusCodes.OK };
  } catch (error) {
    logger.error(error);
    return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
  }
}

async function getStoreTemplateInfo({ name }) {
  logger.debug(`GET /store/template/${name}/info`, {module: 'Api'});
  try {
    return await templates.info(name);
  } catch (error) {
    logger.error(error);
    return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
  }
}

async function postEvent({ type, event }) {
  logger.debug(`POST /event/${type} ${JSON.stringify(event)}`, {module: 'Api'});
  try {
    await events.handle(event);
    return { payload: 'Event handled', status: StatusCodes.OK };
  } catch (error) {
    logger.error(error);
    return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
  }
}

async function postSync() {
  try {
    return { body: await sync(), status: StatusCodes.OK };
  } catch (error) {
    logger.error(error);
    return { body: error.message, status: StatusCodes.INTERNAL_SERVER_ERROR };
  }
}

async function getDebug() {
  debug.dump();
  return { body: {}, status: StatusCodes.OK };
}

module.exports = {
  // General
  getVersion,
  postSync,
  // Model
  postModel,
  getModel,
  deleteModel,
  getModelReady,
  postModelInferPredict,
  postModelInferExplain,
  postModelRestore,
  postModelFeedback,
  getModelFeedback,
  deleteModelFeedback,
  postModelRetrain,
  // Models
  getModels,
  // Event
  postEvent,
  // Graph
  postGraphSplitter,
  putGraphSplitter,
  postGraphEnsemble,
  putGraphEnsemble,
  // Store
  getStoreTemplates,
  getStoreTemplateInfo,
  // Debug
  getDebug,
}
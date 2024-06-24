/* Copyright contributors to the Kmodels project */

"use strict";

module.exports = Object.freeze({

  /**
   * API Server default port
   */
  PORT: "80",

  /**
   * Max number of models that can be created
   */
  MAX_MODELS: 1000,

  /**
   * Default logging level
   */
  LOG_LEVEL: "info",

  /**
   * Model metadata object name.
   */
  MODEL_METADATA_OBJECT: 'metadata.json',

  /**
   * Model kinds
   */
  MODEL_KIND: "model",
  GRAPH_KIND: "graph",

  /**
   * Model binary files sub path in bucket
   */
  MODELS_PATH: 'models'
});
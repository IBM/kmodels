// Copyright contributors to the Kmodels project

"use strict";

const api = require("./api");
const columnify = require('columnify');
const timeago = require('timeago.js');
const configuration = require('./configuration');

/**
 * Register commands
 *
 * @param {*} program
 * @returns
 */
function register(program) {

  let command;

  command = program
    .command('models')
    .description('list models')
    .option('--tags <tags>', 'model tags (comma seperated)')
    .option('--sort <column>', 'sort by column')
    .option('--no-headers', 'hide column headers')
    .action(async function(options) {
      list(configuration.get(), options);
    });

  command = program
    .command('prune')
    .description('remove unused / dangling resources')
    .option('-t, --tenant <tenant>', 'target tenant')
    .action(async function(options) {
      await prune(configuration.get(), options);
    });

  return program;
}

/**
 * List all models
 *
 * @param {*} config
 * @param {*} options
 */
async function list(config, options) {
  try {
    const params = {}
    if (options.tags) {
      params.tags = options.tags.split(',')
    }
    const models = JSON.parse(await api.get(config.url, 'api/v1/models', params));
    const columns = [];
    for (const model of models) {
      let metadata = {};
      try {
        metadata = JSON.parse(await api.get(config.url, `api/v1/model/${model.id}`));
      } catch (error) {
        // eslint-disable-line no-empty
      }
      let score;
      if (metadata.metrics) {
        try {
          score = metadata.metrics.find(m => m.name === 'score').value.toFixed(3);
        } catch (error) {
        }
      }
      if (metadata.kind === "model") {
        columns.push({
          "id": model.id,
          "tenant": metadata.tenant,
          "kind": metadata.kind,
          "state": metadata.state,
          "status": metadata.status || "",
          "created": timeago.format(new Date(metadata.created)),
          "template": metadata.template.info.name || "",
          "version": metadata.template.version || "",
          "ready": metadata.ready,
          "storage": `${((metadata.storage || 0) / 1024.0 / 1024.0).toFixed(1)}MiB`,
          "score": score,
          "sid": metadata.sid,
          "nodes": []
        })
      } else if (metadata.kind === "graph") {
        columns.push({
          "id": model.id,
          "tenant": metadata.tenant,
          "kind": metadata.configuration.type,
          "state": metadata.state,
          "status": metadata.status || "",
          "created": timeago.format(new Date(metadata.created)),
          "template": "",
          "version": "",
          "ready": metadata.ready,
          "storage": "",
          "sid": metadata.sid,
          "nodes": metadata.configuration.nodes.map(n=>n.id),
        })
      } else {
        columns.push({
          "id": model.id,
          "tenant": metadata.tenant,
          "state": metadata.state,
        })
      }
    }
    if (options.sort) {
      const func = function compare( a, b ) {
        if ( a[options.sort.toLowerCase()] < b[options.sort.toLowerCase()] ) {
          return -1;
        }
        if ( a[options.sort.toLowerCase()] > b[options.sort.toLowerCase()] ) {
          return 1;
        }
        return 0;
      }
      columns.sort(func);
    }
    if (columns.length) {
      console.log(columnify(columns, {columnSplitter: '  ', showHeaders: options.headers}));
    } else {
      console.log(`No model exists`);
    }
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.error(`Error! Failed to connect to server`);
    } else {
      console.error(JSON.stringify(error));
    }
  }
}

/**
 *
 * @param {]} config
 * @param {*} options
 */
async function prune(config, options) {
  try {
    const result = await api.post(config.url, 'api/v1/prune', {
      tenant: options.tenant
    });
    const columns = [JSON.parse(result)];
    console.log(columnify(columns, {columnSplitter: '  '}));
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  register,
}
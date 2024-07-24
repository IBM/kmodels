// Copyright contributors to the Kmodels project

"use strict";

const api = require("./api");
const columnify = require('columnify');
const {formatBytes} = require('./helpers');
const configuration = require('./configuration');

function register(program) {
  let command;

  command = program
    .command('tenants')
    .description('list tenants')
    .option('--no-headers', 'hide column headers')
    .action(async function(options) {
      list(configuration.get(), options);
    });

  return program;
}

async function list(config, options) {
  try {
    const columns = [];
    const params = {}
    if (options.tags) {
      params.tags = options.tags.split(',')
    }
    const tenants = JSON.parse(await api.get(config.url, 'api/v1/tenants', params));
    for (const tenant of tenants) {
      try {
        const info = JSON.parse(await api.get(config.url, `api/v1/tenant/${tenant}`));
        columns.push({
          "id": tenant,
          "models": info.utilization.models,
          "pipelines": info.utilization.pipelines,
          "storage": formatBytes(info.utilization.storage),
        })
      } catch (error) {
        // eslint-disable-line no-empty
      }
    }
    if (columns.length) {
      console.log(columnify(columns, {columnSplitter: '  ', showHeaders: options.headers}));
    } else {
      console.log(`No tenants exists`);
    }
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.error(`Error! Failed to connect to server`);
    } else {
      console.error(JSON.stringify(error));
    }
  }
}

module.exports = {
  register,
}
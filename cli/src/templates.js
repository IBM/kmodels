// Copyright contributors to the Kmodels project

"use strict";

const api = require("./api");
const columnify = require('columnify')
const configuration = require('./configuration');

function register(program) {

  let command;

  command = program
    .command('templates')
    .description('list templates')
    .action(async () => {
      await list(configuration.get());
    });

  return program;
}

/**
 * List all templates
 *
 * @param {Object} config
 */
async function list(config) {
  try {
    const columns = [];
    const templates = JSON.parse(await api.get(config.url, 'api/v1/store/templates'));
    for (const template of templates) {
      columns.push({
        "name": template.name,
        "versions": template.versions,
        "summary": template.summary,
      })
    }
    if (columns.length) {
      console.log(columnify(columns, {columnSplitter: '  '}));
    } else {
      console.log('No template exists');
    }
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  register,
}
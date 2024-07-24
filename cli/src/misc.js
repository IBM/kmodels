// Copyright contributors to the Kmodels project

"use strict";

const api = require("./api");
const configuration = require('./configuration');

function register(program) {

  let command;

  command = program
    .command('version')
    .description('controller version')
    .action(async function() {
      await version(configuration.get());
    });

  command = program
    .command('overview')
    .description('controller informational details')
    .action(async function() {
      await overview(configuration.get());
    });

  return program;
}

/**
 *
 * @param {*} id
 */
async function version(config) {
  try {
    const version = await api.get(config.url, 'api/v1/version');
    console.log(`Controller version: ${version}`)
  } catch (error) {
    console.error(error);
  }
}

/**
 *
 * @param {*} config
 */
async function overview(config) {
  try {
    const overview = JSON.parse(await api.get(config.url, 'api/v1/overview'));
    console.log(`Controller version: ${JSON.stringify(overview, null, 2)}`)
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  register,
}
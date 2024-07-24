// Copyright contributors to the Kmodels project

"use strict";

const api = require("./api");
const configuration = require('./configuration');

function register(program) {
  let command;

  command = program
    .command('tenant')
    .description('tenant commands')
    .addHelpCommand(false);

  command
    .command('create <id>')
    .description('create a tenant')
    .action(async function(id, options) {
      create(configuration.get(), id, options);
    });

  command
    .command('remove <id>')
    .usage('<id> [options]')
    .description('remove a tenant')
    .option('-f, --force <force>', 'force removal of exisiting tenants models')
    .action(async function(id, options) {
      remove(configuration.get(), id, options);
    });

  return program;
}

async function create(config, id, options) {
  try {
    const configuration = {
    }
    // Create
    await api.post(config.url, `api/v1/tenant`, {
      id
    }, configuration);
    console.log(`Tenant ${id} created`);
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.error(`Error! Failed to create tenant`);
    } else {
      console.error(JSON.stringify(error));
    }
  }
}

async function remove(config, id, options) {
  try {
    // Remove
    await api.del(config.url, `api/v1/tenant/${id}`);
    console.log(`Tenant ${id} removed`);
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.error(`Error! Failed to remove tenant`);
    } else {
      console.error(JSON.stringify(error));
    }
  }
}

module.exports = {
  register,
}
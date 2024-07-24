// Copyright contributors to the Kmodels project

"use strict";

const fs = require('fs');
const api = require('./api');
const configuration = require('./configuration');

function register(program) {

  let command;

  command = program
    .command('feedback')
    .description('feedback commands')
    .addHelpCommand(false);

  command
    .command('add')
    .description('add prediction feedback')
    .argument('<id>', 'Model unique id')
    .option('-f, --file <file name>', 'file name')
    .action(async function(id, options) {
      await add(configuration.get(), id, options);
    });

  command
    .command('get')
    .description('get model feedbacks')
    .argument('<id>', 'Model unique id')
    .option('-s, --start_date <start date>', 'start date')
    .option('-e, --end_date <start date>', 'end date')
    .action(async function(id) {
      await get(configuration.get(), id);
    });

  command
    .command('remove')
    .description('delete model feedbacks')
    .argument('<id>', 'Model unique id')
    .action(async function(id) {
      await remove(configuration.get(), id);
    });

  return program;
}

/**
 *
 * @param {*} config
 * @param {*} id
 * @param {*} options
 */
async function add(config, id, options) {
  try {
    const models = JSON.parse(await api.get(config.url, 'api/v1/models'));
    const result = models.filter(model => model.id.startsWith(id));
    if (result.length === 0) {
      console.error(`Model ${id} doesn't exists`);
    } else if (result.length === 1) {
      const feedback = JSON.parse(fs.readFileSync(options.file));
      await api.post(config.url, `api/v1/model/${result[0].id}/feedback`, {}, feedback);
    } else {
      console.log(`Model ${id} is not unique`);
    }
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.error(`Error! Failed to connect to server`);
    } else {
      console.error(`Error! Failed to add feedback`);
    }
  }
}

/**
 * Get model feedbacks
 *
 * @param {*} config
 * @param {*} id
 */
async function get(config, id) {
  try {
    const models = JSON.parse(await api.get(config.url, 'api/v1/models'));
    const result = models.filter(model => model.id.startsWith(id));
    if (result.length === 0) {
      console.error(`Model ${id} doesn't exists`);
    } else if (result.length === 1) {
      const data = await api.get(config.url, `api/v1/model/${result[0].id}/feedback`);
      if (data !== "") {
        console.log(data);
      } else {
        console.log(`No feedbacks exist for ${result[0].id}`);
      }
    } else {
      console.log(`Model ${id} is not unique`);
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * Get model feedbacks
 *
 * @param {*} config
 * @param {*} id
 */
 async function remove(config, id) {
  try {
    const models = JSON.parse(await api.get(config.url, 'api/v1/models'));
    const result = models.filter(model => model.id.startsWith(id));
    if (result.length === 0) {
      console.error(`Model ${id} doesn't exists`);
    } else if (result.length === 1) {
      // const data = await api.del(config.url, `api/v1/model/${result[0].id}/feedback`);
    } else {
      console.log(`Model ${id} is not unique`);
    }
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  register,
}
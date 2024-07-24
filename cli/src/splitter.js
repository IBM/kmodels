// Copyright contributors to the Kmodels project

"use strict";

const api = require('./api');
const configuration = require('./configuration');

function register(program) {

  let command;

  command = program
    .command('splitter')
    .description('splitter commands')
    .addHelpCommand(false);

  command
    .command('create')
    .description('create splitter')
    .argument('<models>', 'models id [comma seperated]')
    .option('-i, --id <id>', 'model unique id')
    .option('-t, --tenant <tenant>', 'target tenant')
    .option('-n, --name <name>', 'model name')
    .option('-w, --weights <weights>', 'models weights [comma seperated]')
    .option('--dryrun', 'only print configuration')
    .action(async function(models, options) {
      await create(configuration.get(), models, options);
    });

  command
    .command('update')
    .description('update splitter')
    .argument('<id>', 'Model unique id')
    .option('-m, --models <models>', 'models id  [comma seperated]')
    .option('-w, --weights <weights>', 'models weights [comma seperated]')
    .option('--dryrun', 'only print configuration')
    .action(async function(id, options) {
      await update(configuration.get(), id, options);
    });

  return program;
}

async function create(config, models, options) {
  try {
    let graph = [];
    let seperator = ',';
    let weights = options.weights || "";
    models = models.split(seperator);
    if (weights.length === 0) {
      weights = Array.from({length: models.length}).fill((100 / models.length).toFixed(0));
    } else {
      weights = weights.split(seperator);
    }
    if (weights.length < models.length) {
    }
    weights = weights.map(x => parseInt(x))
    if (weights.reduce((a, b) => a + b, 0) < 100) {
      weights[0] = (100 - weights.reduce((a, b) => a + b, 0)) + weights[0];
    }
    for (let i in models) {
      graph.push({ id: models[i], weight:  parseInt(weights[i]) });
    }
    if (options.dryrun) {
      console.log(JSON.stringify(graph, null, 2));
      return;
    }
    const id = await api.post(config.url, `api/v1/graph/splitter`, {
      id: options.id,
      tenant: options.tenant || config.tenant,
    }, graph);
    console.log(`Splitter ${id} created with weights ${weights}`);
  } catch (error) {
    console.error(error);
  }
}

async function update(config, id, options) {
  try {
    let graph = [];
    let seperator = ',';
    let weights = options.weights || "";
    let models = options.models || ""
    models = models.split(seperator);
    if (weights.length === 0) {
      weights = Array.from({length: models.length}).fill((100 / models.length).toFixed(0));
    } else {
      weights = weights.split(seperator);
    }
    if (weights.length < models.length) {
    }
    weights = weights.map(x => parseInt(x))
    if (weights.reduce((a, b) => a + b, 0) < 100) {
      weights[0] = (100 - weights.reduce((a, b) => a + b, 0)) + weights[0];
    }
    for (let i in models) {
      graph.push({ id: models[i], weight:  parseInt(weights[i]) });
    }
    if (options.dryrun) {
      console.log(JSON.stringify(graph, null, 2));
      return;
    }
    await api.put(config.url, `api/v1/graph/splitter`, {
      id
    }, graph);
    console.log(`Splitter ${id} updated with weights ${weights}`);
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  register,
}
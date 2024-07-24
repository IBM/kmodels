// Copyright contributors to the Kmodels project

"use strict";

const api = require('./api');
const configuration = require('./configuration');

function register(program) {

  let command;

  command = program
    .command('ensemble')
    .description('ensemble commands')
    .addHelpCommand(false);

  command
    .command('create')
    .description('create ensemble')
    .argument('<models>', 'models id [comma seperated]')
    .usage("[options]")
    .option('-i, --id <id>', 'model unique id')
    .option('-t, --tenant <tenant>', 'target tenant')
    .option('-n, --name <name>', 'model name')
    .option('--names <names>', 'models names [comma seperated]')
    .option('--dryrun', 'only print configuration')
    .action(async function(models, options) {
      await create(configuration.get(), models, options);
    });

  command
    .command('update')
    .description('update ensemble')
    .argument('<id>', 'Model unique id')
    .option('-m, --models <models>', 'models id  [comma seperated]')
    .option('-n, --names <names>', 'models names [comma seperated]')
    .action(async function(id, options) {
      await update(configuration.get(), id, options);
    });

  command
    .command('ls')
    .description('list ensemblers')
    .action(async function(options) {
      await list(configuration.get(), options);
    });

  return program;
}

async function create(config, models, options) {
  try {
    let graph = [];
    let seperator = ',';
    let names = (options.names || "").split(seperator);
    models = models.split(seperator);
    for (let i in models) {
      graph.push({ id: models[i], name: names[i] || `${i}` });
    }
    if (options.dryrun) {
      console.log(JSON.stringify(graph, null, 2));
      return;
    }
    const id = await api.post(config.url, `api/v1/graph/ensemble`, {
      id: options.id,
      tenant: options.tenant || config.tenant,
    }, graph);
    console.log(`Ensemble ${id} created`);
  } catch (error) {
    console.error(error);
  }
}

async function update(config, models, options) {
  console.log('Not supported yet');
}

async function list(config, options) {
  console.log('Not supported yet');
}

module.exports = {
  register,
}
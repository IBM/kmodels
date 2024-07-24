// Copyright contributors to the Kmodels project

"use strict";

const fs = require('fs');
const path = require('path');
const api = require('./api');
const configuration = require('./configuration');

/**
 *
 * @param {*} program
 * @returns
 */
function register(program) {

  let command;

  command = program
    .command('model')
    .description('model commands')
    .addHelpCommand(false);

  command
    .command('create <template>')
    .description('create model from a template')
    .option('-i, --id <id>', 'model unique id')
    .option('-t, --tenant <tenant>', 'target tenant')
    .option('-f, --file <file name>', 'configuration file name')
    .option('-a, --argument, <value...>', 'configuration argument (name=value)')
    .option('--tag <tag>', 'model tag (key=value)', '')
    .option('--cpu <cpu>', 'model cpu limit, override config')
    .option('--memory <memory>', 'model memory limit, override config')
    .option('--dryrun', 'only print configuration')
    .action(async function(template, options) {
      await create(configuration.get(), template, options);
    });

  command = program
    .command('remove')
    .argument('<id...>', 'one or more model unique id')
    .option('--ignore-unique', 'ignore uniquness')
    .description('remove one or more models')
    .action(async function(id, options) {
      for (const i of id) {
        await remove(configuration.get(), i, options);
      }
    });

  command = program
    .command('predict')
    .description('send predict request')
    .argument('<id>', 'Model unique id')
    .option('-f, --file <file name>', 'file name')
    .action(async function(id, options) {
      await predict(configuration.get(), id, options);
    });

  command = program
    .command('explain')
    .description('send explain request')
    .argument('<id>', 'Model unique id')
    .option('-f, --file <file name>', 'file name')
    .action(async function(id, options) {
      await explain(configuration.get(), id, options);
    });

  command = program
    .command('describe')
    .description('return model information')
    .argument('<id>', 'Model unique id')
    .action(async function(id) {
      await describe(configuration.get(), id);
    });

  command = program
    .command('ready')
    .description('return model readiness')
    .argument('<id>', 'Model unique id')
    .action(async function(id) {
      await ready(configuration.get(), id);
    });

  command = program
    .command('retrain')
    .description('retrain model')
    .argument('<id...>', 'One or more model unique id')
    .action(async function(id) {
      for (const i of id) {
        await retrain(configuration.get(), id);
      }
    });

  command = program
    .command('restore')
    .argument('<id>', 'Model unique id')
    .argument('<build>', 'Build id')
    .description('restore a model')
    .action(async function(id, build) {
      await restore(configuration.get(), id, build);
    });

  command = program
    .command('scale')
    .argument('<id>', 'model unique id')
    .description('scale model inferencing')
    .option('--min <min>', 'minimum replicase for a model')
    .option('--max <max>', 'maximum replicase for a model')
    .action(async function(id, options) {
      await scale(configuration.get(), id, options);
    });

  // command = program
  //   .command('tag')
  //   .argument('<id>', 'model unique id')
  //   .description('set model tag')
  //   .option('-k, --key <key>', 'tag key')
  //   .option('-v, --value <key>', 'tag value')
  //   .action(async function(id) {
  //     await tag(configuration.get(), id, options);
  //   });

  return program;
}

/**
 * Create a model
 *
 * @param {Object} config Cli configuration file
 * @param {String} template Template name[:version]
 * @param {Object} options Command options
 */
async function create(config, template, options) {
  try {
    let configuration = {};
    if (options.file) {
      if (!fs.existsSync(options.file)) {
        console.error(`File or directory '${options.file}' doesn't exists`);
        return;
      }
      // Configuration from file (if folder, check if config exists)
      if (fs.lstatSync(options.file).isDirectory()) {
        options.file = `${options.file}/config.json`;
      }
      if (fs.existsSync(options.file)) {
        configuration = JSON.parse(fs.readFileSync(options.file));
      }
    }
    // Configuration arguments (override)
    for (const argument of options.argument || []) {
      if (!configuration.arguments) {
        configuration.arguments = {};
      }
      const name = argument.split('=')[0];
      const value = argument.split('=')[1];
      configuration.arguments[name] = value;
    }
    // Schedule (override)
    if (options.schedule) {
      configuration.schedule = options.schedule;
    }
    // Cpu
    if (options.cpu) {
      Object.assign(configuration.resources, {
        "resources": {
          "cpu": options.cpu
        }
      })
    }
    // Memory
    if (options.memory) {
      Object.assign(configuration.resources, {
        "resources": {
          "memory": options.memory
        }
      })
    }
    if (options.dryrun) {
      console.log(JSON.stringify(configuration, null, 2));
      return;
    }
    // Template version
    const version = template.split(':')[1];
    template = template.split(':')[0];
    // Create
    const id = await api.post(config.url, `api/v1/model`, {
      template,
      version,
      tenant: options.tenant || config.tenant,
      id: options.id,
      // tags: options.tags.split(','),
    }, configuration);
    console.log(`Model ${id} created`);
  } catch (error) {
    console.error(error);
  }
}

/**
 *
 * @param {*} config Cli configuration file
 * @param {*} id Model id
 * @param {*} options Command options
 */
async function remove(config, id, options) {
  try {
    const models = JSON.parse(await api.get(config.url, 'api/v1/models'));
    const result = models.filter(model => model.id.startsWith(id));
    if (result.length === 0) {
      console.error(`Model ${id} doesn't exists`);
    } else if (result.length === 1) {
      await api.del(config.url, `api/v1/model/${result[0].id}`);
      console.log(`Model ${result[0].id} was deleted`);
    } else if ((result.length > 1) && options.ignoreUnique) {
      for (const model of models) {
        await api.del(config.url, `api/v1/model/${model.id}`);
        console.log(`Model ${model.id} was deleted`);
      }
    } else {
      console.log(`Model ${id} is not unique`);
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 *
 * @param {*} config Cli configuration file
 * @param {*} id
 */
 async function retrain(config, id) {
  try {
    const models = JSON.parse(await api.get(config.url, 'api/v1/models'));
    const result = models.filter(model => model.id.startsWith(id));
    if (result.length === 0) {
      console.error(`Model ${id} doesn't exists`);
    } else if (result.length === 1) {
      await api.post(config.url, `api/v1/model/${result[0].id}/retrain`);
      console.log(`Model ${result[0].id} retrained started`);
    } else {
      console.log(`Model ${id} is not unique`);
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 *
 * @param {*} config
 * @param {*} id
 * @param {*} options
 */
async function archive(config, id, options) { // eslint-disable-line no-unused-vars
  try {
    const models = JSON.parse(await api.get(config.url, 'api/v1/models'));
    const result = models.filter(model => model.id.startsWith(id));
    if (result.length === 0) {
      console.error(`Model ${id} doesn't exists`);
    } else if (result.length === 1) {
      await api.post(config.url, `api/v1/model/${result[0].id}/archive`);
    } else {
      console.log(`Model ${id} is not unique`);
    }
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.error(`Error! Failed to connect to server`);
    } else {
      console.error(`Error! Failed to archive`);
    }
  }
}

/**
 *
 * @param {*} config
 * @param {*} id
 * @param {*} options
 */
async function restore(config, id, build, options) { // eslint-disable-line no-unused-vars
  try {
    const models = JSON.parse(await api.get(config.url, 'api/v1/models'));
    const result = models.filter(model => model.id.startsWith(id));
    if (result.length === 0) {
      console.error(`Model ${id} doesn't exists`);
    } else if (result.length === 1) {
      const id = await api.post(config.url, `api/v1/model/${result[0].id}/restore`, {build});
      console.log(`Model ${id} created`);
    } else {
      console.log(`Model ${id} is not unique`);
    }
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.error(`Error! Failed to connect to server`);
    } else {
      console.error(`Error! Failed to archive`);
    }
  }
}

/**
 *
 * @param {*} config Cli configuration file
 * @param {*} id Model id
 * @param {*} options Command options
 */
async function predict(config, id, options) {
  try {
    const models = JSON.parse(await api.get(config.url, 'api/v1/models'));
    const result = models.filter(model => model.id.startsWith(id));
    if (result.length === 0) {
      console.error(`Model ${id} doesn't exists`);
    } else if (result.length === 1) {
      const ext = path.extname(options.file);
      if (ext === ".json") {
        const input = JSON.parse(fs.readFileSync(options.file));
        const predictions = await api.post(config.url, `api/v1/model/${result[0].id}/infer/predict`, {}, input);
        console.log(JSON.stringify(JSON.parse(predictions), null, 2));
      } else if (ext === ".csv") {
        // eslint-disable-line no-empty
      }
    } else {
      console.log(`Model ${id} is not unique`);
    }
  } catch (error) {
    console.error(error.message);
  }
}

/**
 *
 * @param {*} config Cli configuration file
 * @param {*} id Model id
 * @param {*} options Command options
 */
 async function explain(config, id, options) {
  try {
    const models = JSON.parse(await api.get(config.url, 'api/v1/models'));
    const result = models.filter(model => model.id.startsWith(id));
    if (result.length === 0) {
      console.error(`Model ${id} doesn't exists`);
    } else if (result.length === 1) {
      const ext = path.extname(options.file);
      if (ext === ".json") {
        const input = JSON.parse(fs.readFileSync(options.file));
        const explanations = await api.post(config.url, `api/v1/model/${result[0].id}/infer/explain`, {}, input);
        console.log(JSON.stringify(JSON.parse(explanations), null, 2));
      } else if (ext === ".csv") {
        // eslint-disable-line no-empty
      }
    } else {
      console.log(`Model ${id} is not unique`);
    }
  } catch (error) {
    console.error(error);
  }
 }

/**
 *
 * @param {*} config Cli configuration file
 * @param {*} id Model id
 */
 async function describe(config, id) {
  try {
    const models = JSON.parse(await api.get(config.url, 'api/v1/models'));
    const result = models.filter(model => model.id.startsWith(id));
    if (result.length === 0) {
      console.error(`Model ${id} doesn't exists`);
    } else if (result.length === 1) {
      const data = JSON.parse(await api.get(config.url, `api/v1/model/${result[0].id}`));
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`Model ${id} is not unique`);
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 *
 * @param {*} config Cli configuration file
 * @param {*} id Model id
 */
async function ready(config, id) {
  try {
    const models = JSON.parse(await api.get(config.url, 'api/v1/models'));
    const result = models.filter(model => model.id.startsWith(id));
    if (result.length === 0) {
      console.error(`Model ${id} doesn't exists`);
    } else if (result.length === 1) {
      const data = JSON.parse(await api.get(config.url, `api/v1/model/${result[0].id}`));
      console.log(data.ready);
    } else {
      console.log(`Model ${id} is not unique`);
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 *
 * @param {*} config Cli configuration file
 * @param {*} id Model id
 * @param {*} options Command options
 */
async function scale(config, id, options) {
  try {
    const models = JSON.parse(await api.get(config.url, 'api/v1/models'));
    const result = models.filter(model => model.id.startsWith(id));
    if (result.length === 0) {
      console.error(`Model ${id} doesn't exists`);
    } else if (result.length === 1) {
      await api.post(config.url, `api/v1/model/${result[0].id}/scale`, {
        minimum: options.min,
        maximum: options.max
      });
      console.log(`Model ${id} scaled`);
    } else {
      console.log(`Model ${id} is not unique`);
    }
  } catch (error) {
    console.error(error);
  }
}

// /**
//  *
//  * @param {*} config Cli configuration file
//  * @param {*} id Model id
//  * @param {*} options Command options
//  */
// async function tag(config, id, options) {
// }

module.exports = {
  register,
}
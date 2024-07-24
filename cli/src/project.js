// Copyright contributors to the Kmodels project

"use strict";

const fs = require("fs");
const path = require("path");
const configuration = require('./configuration');

function register(program) {

  let command;

  command = program
    .command('project')
    .description('project commands')
    .addHelpCommand(false);

  command
    .command('create <name>')
    .description('create template project')
    .option('-t, --template <name>', 'template name')
    .option('--version <version>', 'template version', 'latest')
    .option('--docker <docker>', 'docker image tool', 'docker')
    .option('--registry <registry>', 'docker registry server', 'docker.io')
    .option('--namespace <namespace>', 'docker registry namespace')
    .option('--kserve <kserve>', 'kserve version', '0.11.1')
    .option('--python <python>', 'python version', '3.11-slim')
    .action((name, options) => {
      create(configuration.get(), name, options)
    });

  return program;
}

/**
 *
 * @param {*} config
 * @param {*} name
 * @param {*} options
 */
async function create(config, name, options) {
  if (!fs.existsSync(`${name}`)) {
    const values = {
      "name": name,
      "version": options.version,
      "docker": options.docker,
      "registry": options.registry,
      "namespace": options.namespace ? `/${options.namespace}` : "",
      "kserve": options.kserve,
      "python": options.python,
    };
    // Generate project files
    let guide;
    for (const item of require(`./project.json`)) {
      fs.mkdirSync(`${name}/${path.dirname(item.path)}`, { recursive: true });
      Object.keys(values).forEach(key => {
        item.data = item.data.replaceAll(`{{${key}}}`, values[key]);
      });
      fs.writeFileSync(`${name}/${item.path}`, item.data);
      if (item.path === "GUIDE.md") {
        guide = item.data;
      }
    }
    // Show guide
    console.log(guide);
  } else {
    console.log(`Project ${name} already exists`);
  }
}

module.exports = {
  register,
}
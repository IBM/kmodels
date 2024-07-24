// Copyright contributors to the Kmodels project

"use strict";

const fs = require("fs");
const tar = require('tar');
const api = require("./api");
const configuration = require('./configuration');

function register(program) {

  let command;

  command = program
    .command('template')
    .description('template commands')
    .addHelpCommand(false);

  command
    .command('describe <name>')
    .usage("<name>")
    .description('get template information')
    .action((name) => {
      describe(configuration.get(), name)
    });

  command
    .command('pack')
    .description('pack template')
    .argument('<path>', 'Path to template folder')
    .option('-o <output path>', 'output path')
    .action((path, options) => {
      pack(path, options);
    });

  return program;
}

/**
 * Get template information
 *
 * @param {Object} config
 * @param {String} name Template name
 */
async function describe(config, name) {
  try {
    const templates = JSON.parse(await api.get(config.url, 'api/v1/store/templates'));
    const template = templates.find(t => t.name === name);
    console.log(template);
  } catch (error) {
    console.error(error);
  }
}

/**
 *
 * @param {*} path
 * @param {*} options Command options
 *
 */
async function pack(path, options) {
  try {
    const info = JSON.parse(fs.readFileSync(`${path}/info.json`));
    const pkg = options.o ? `${options.o}/${info.name}.tar` : `${info.name}.tar`;
    tar.c({C: path}, ['.']).pipe(fs.createWriteStream(pkg));
    console.log(`Created template pack ${pkg}`);
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  register,
}
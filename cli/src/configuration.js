// Copyright contributors to the Kmodels project

"use strict";

const fs = require('fs');
const os = require("os");

// Load config file
let config;
try {
  fs.mkdirSync(`${os.homedir()}/.kc`, { recursive: true })
  config = require(`${os.homedir()}/.kc/config.json`);
  if (process.env.URL) {
    config.url = process.env.URL;
  }
} catch (error) {
  config = {
    url: process.env.URL || 'http://localhost:6262',
    tenant: 'kmodels-user',
  }
}

/**
 *
 * @param {*} program
 * @returns
 */
function register(program) {

  let command;

  command = program
    .command('config')
    .description('cli configuration')
    .addHelpCommand(false)

  command
    .command('set')
    .description('set configuration')
    .option('--url <url>', 'KModels controller endpoint <host>:<port>')
    .option('--tenant <tenant>', 'target tenant')
    .action((options) => {
      set(options);
    });

  command
    .command('get')
    .description('get configuration')
    .action(() => {
      console.log(JSON.stringify(config, null, 2));
    });

  return program;
}

/**
 *
 * @param {*} options
 */
async function set(options) {
  config.url = options.url || config.url;
  config.tenant = options.tenant || config.tenant;
  fs.writeFileSync(`${os.homedir()}/.kc/config.json`, JSON.stringify(config, null, 2), 'utf8');
}

/**
 *
 * @returns
 */
function get() {
  return config;
}

module.exports = {
  register,
  get,
}

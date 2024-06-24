/* Copyright contributors to the Kmodels project */

"use strict";

require('dotenv').config();

const logger = require("./src/logger");

// Set default logger settings
logger.info(`set default logger level to ${logger.level}`, {module: "Server"});
logger.setModules({
    Server: {
      level: 'debug'
    },
    Minio: {
      level: 'info'
    },
    Metadata: {
      level: 'info'
    },
    Archiver: {
      level: 'info'
    },
    Isvc:  {
      level: 'debug'
    },
    Api:  {
      level: 'info'
    },
    Kubectl:  {
      level: 'info'
    },
    Store:  {
      level: 'info'
    },
    Templates:  {
      level: 'info'
    }
  }
);

const version = require('./package.json').version;
logger.info(`Version ${version}`, {module: "Server"});

// Set server port for swagger page
process.env.PORT = process.env.PORT || 80;
require("./src/server");
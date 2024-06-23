/*******************************************************************************
 * IBM Confidential
 *
 * OCO Source Materials
 *
 * Copyright IBM Corp. 2020
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U.S. Copyright Office.
 *******************************************************************************/

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
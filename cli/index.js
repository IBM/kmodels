#! /usr/bin/env node

// Copyright contributors to the Kmodels project

"use strict";

require('dotenv').config();

const { program } = require('commander');
const model = require('./src/model');
const splitter = require('./src/splitter');
const ensemble = require('./src/ensemble');
const models = require('./src/models');
const feedback = require('./src/feedback');
const template = require('./src/template');
const templates = require('./src/templates');
const project = require('./src/project');
const tenant = require('./src/tenant');
const tenants = require('./src/tenants');
const configuration = require('./src/configuration');
const misc = require('./src/misc');

// Patch
// process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

program
  .version(`kc version: ${require('./package.json').version}`)

model.register(program);
splitter.register(program);
ensemble.register(program);
models.register(program);
template.register(program);
templates.register(program);
tenant.register(program);
tenants.register(program);
project.register(program);
feedback.register(program);
configuration.register(program);
misc.register(program);

program.parse();
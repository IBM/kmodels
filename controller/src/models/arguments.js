/* Copyright contributors to the Kmodels project */

"use strict";

const {logger} = require("./logger");

/**
 * Get all component arguments from configuration. Fill missing values with
 * manifest arguments defaults.
 *
 * @param {String} component Component name predictor / kfp ...
 * @param {Object} configuration Model configuration
 * @param {Object} manifest Template manifest
 *
 * @return Array of arguments [{name: <name>, value: <value>}, ...]
 */
function get(component, configuration, manifest) {
  // Returned arguments
  const args = [];
  // Iterate all arguments descriptors
  for (const descriptor of manifest.arguments || []) {
    if (descriptor.component.indexOf(component) >= 0 ) {
      // Set default
      if (descriptor.default) {
        args.push({name: `${descriptor.name}`, value: `${descriptor.default}`})
      }
      // Replace default by value if exists (if arguments are specified in configuration)
      for (const [key, value] of Object.entries(configuration.arguments || {})) {
        if (key === descriptor.name) {
          let index = args.findIndex(item => item.name === key);
          if (index === -1) {
            args.push({name: `${key}`, value: `${value}`});
          } else {
            args[index].value = `${value}`;
          }
        }
      }
    }
  }
  logger.debug(`${component} ${JSON.stringify(args)}`, {module: 'Arguments'});
  return args;
}

module.exports = {
  get,
}
/* Copyright contributors to the Kmodels project */

"use strict";

const fs = require('fs');
const path = require("path");

/**
 * Read all files recursively
 *
 * @param {]} dir
 * @param {*} options
 * @param {*} files
 * @returns
 */
function readdir(dir, options = {}, files = []) {
  fs.readdirSync(dir).forEach(file => {
    if (fs.statSync(dir + "/" + file).isDirectory()) {
      files = readdir(dir + "/" + file, options, files)
    } else {
      files.push(path.join(dir, "/", file));
    }
  })
  return files
}

/**
 * Convert string to array
 *
 * @param {*} object
 */
function toarray(object, separator = ',') {
  object = object || [];
  if (typeof object === 'string') {
    return object.split(separator)
  }
  return object;
}

module.exports = {
  readdir,
  toarray,
}
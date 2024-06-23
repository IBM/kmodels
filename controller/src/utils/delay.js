"use strict";

/**
 *
 * @param {*} ms Delay time in milliseconds
 * @returns
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  delay,
}
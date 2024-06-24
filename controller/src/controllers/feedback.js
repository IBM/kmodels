/* Copyright contributors to the Kmodels project */

 "use strict";

const {logger} = require("./logger");

/**
 * Returns feedback object name
 *
 * @returns
 */
function getObjectName() {
  const path = process.env.FEEDBACK_PATH || 'feedback';
  const name = `${path}/${process.env.FEEDBACK_OBJECT || "feedback.json"}`;
  return name;
}

/**
 * Add feedback to model cache
 *
 * @param {*} id Model unique id
 * @param {*} feedback
 */
async function add(id, feedback) {
  if (!("instance" in feedback) || !("feedback" in feedback)) {
    throw new Error("Feedback: invalid format");
  }
  // await pv.appendObject(id, getObjectName(), feedback);
}

/**
 * Return all model feedbacks
 *
 * @param {*} id Model unique id
 * @returns
 */
async function get(id) {
  let feedbacks = "";
  try {
    // feedbacks = await pv.getObject(id, getObjectName());
  } catch (e) {
    logger.error(e.message, {id, module: 'Feedbacl'});
  }
  return feedbacks;
}

/**
 * Delete object
 *
 * @param {*} id Model unique id
 */
async function remove(id) {
  // await pv.deleteObject(id, getObjectName());
}

module.exports = {
  add,
  remove,
  get,
}
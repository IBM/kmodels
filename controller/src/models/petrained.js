/* Copyright contributors to the Kmodels project */

"use strict";

const kubectl = require('./kubectl');
const {delay} = require("./delay");
const {logger} = require("./logger");

/**
 * Create pretrained job
 *
 * @param {*} id Model unique id (used as job id)
 * @param {*} namespace
 * @param {*} config
 */
async function create(id, namespace, config) {
  logger.info(`create`, {module: 'Monitor', id, user: namespace});
  const name = `${id}-pretrained`;
  const version = config.version || "latest";
  const image = `${process.env.DOCKER_SERVER}/pretrained/${config.id}:${version}`;
  const command = [
    "/upload.sh", `${id}`,
  ];
  // Create immediate job
  const job = kubectl.createV1JobConfig(name, image, command);
  kubectl.jobAddImagePullSecret(job, process.env.DOCKER_SECRETS_NAME || "regcred");
  kubectl.jobTtl(job, parseInt(process.env.CONNECTOR_TTL || "10"));
  kubectl.jobBackoffLimit(job, parseInt(process.env.CONNECTOR_BACKOFFLIMIT || "6"))
  kubectl.jobAddEnvFromSecrets(job, process.env.MINIO_SECRET || "minio-secret");
  if (secrets) {
    kubectl.jobAddEnvFromSecrets(job, secrets.metadata.name);
  }
  await kubectl.createNamespacedJob(job, namespace);
}

/**
 * Remove pretrained job request (and pods) for the specified model
 *
 * @param {*} id Model unique id
 * @param {*} namespace Pretrained namespace
 */
async function remove(id, namespace) {
  logger.info(`remove`, {module: 'Connector', id, user: namespace});
  const name = `${id}-connector`;
  // Remove job
  try {
    let job = (await kubectl.listNamespacedJob(namespace)).find(j => (j.metadata.name === name));
    if (job) {
      let timeout = false;
      await kubectl.deleteNamespacedJob(name, 0, namespace);
      const timer = setTimeout(() => { timeout = true }, 30000);
      while (job && !timeout) {
        await delay(1000);
        job = (await kubectl.listNamespacedJob(namespace)).find(j => (j.metadata.name === name));
      }
      clearTimeout(timer);
    }
  } catch (error) {
    logger.warn(`job ${name} remove failure`, {module: 'Connector', id});
  }
  try {
    const pods = (await kubectl.listNamespacePod(namespace)).filter(p => p.metadata.labels['job-name'] === name);
    for (const pod of pods) {
      await kubectl.deleteNamespacedPod(pod.metadata.name, namespace);
    }
  } catch (error) {
    logger.warn(`job ${name} pods remove failure`, {module: 'Connector', id});
  }
}

module.exports = {
  create,
  remove,
}
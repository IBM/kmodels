/* Copyright contributors to the Kmodels project */


"use strict";

const kubectl = require('../services/kubectl');
const {delay} = require("../utils/delay");
const {logger} = require("./logger");

/**
 * Create connector job / cron job.
 *
 * @param {String} id Model unique id (used as job id)
 * @param {String} namespace Connector namespace
 * @param {Object} config Connector configuration
 *
 * @returns
 */
async function create(id, namespace, config) {
  logger.info(`create ${JSON.stringify(config)}`, {module: 'Connector', id, user: namespace});
  const name = `${id}-connector`;
  const version = config.version || "latest";
  const image = `${process.env.DOCKER_SERVER}/connector/${config.id}:${version}`;
  const command = [
    "python", "connector.py",
    "--model_id", id,
    "--config", JSON.stringify(config.arguments),
  ];
  // Search for connector specific config and secrets
  const configMap = (await kubectl.listNamespacedConfigMap(namespace)).find(
    cm => cm.metadata.name === `${config.id}-connector`);
  const secrets = (await kubectl.listNamespacedSecret(namespace)).find(
    s => s.metadata.name === `${config.id}-connector`);
  // Connector job
  let job;
  // Create immediate job
  job = kubectl.createV1JobConfig(name, image, command);
  kubectl.jobAddImagePullSecret(job, process.env.DOCKER_SECRETS_NAME || "regcred");
  kubectl.jobTtl(job, parseInt(process.env.CONNECTOR_TTL || "10"));
  kubectl.jobBackoffLimit(job, parseInt(process.env.CONNECTOR_BACKOFFLIMIT || "3"))
  kubectl.jobAddEnvFromConfigMap(job, "connector-config");
  if (configMap) {
    kubectl.jobAddEnvFromConfigMap(job, configMap.metadata.name);
  }
  kubectl.jobAddEnvFromSecrets(job, process.env.MINIO_SECRET || "minio-secret");
  if (secrets) {
    kubectl.jobAddEnvFromSecrets(job, secrets.metadata.name);
  }
  await kubectl.createNamespacedJob(job, namespace);
  // Create scheduled job
  if (config.schedule) {
    job = kubectl.createV1CronJobConfig(name, image, command);
    kubectl.jobAddImagePullSecret(job, process.env.DOCKER_SECRETS_NAME || "regcred");
    kubectl.jobTtl(job, parseInt(process.env.CONNECTOR_TTL || "10"));
    kubectl.jobBackoffLimit(job, parseInt(process.env.CONNECTOR_BACKOFFLIMIT || "3"))
    kubectl.jobAddEnvFromConfigMap(job, "connector-config");
    if (configMap) {
      kubectl.jobAddEnvFromConfigMap(job, configMap.metadata.name);
    }
    kubectl.jobAddEnvFromSecrets(job, process.env.MINIO_SECRET || "minio-secret");
    if (secrets) {
      kubectl.jobAddEnvFromSecrets(job, secrets.metadata.name);
    }
    kubectl.jobSetSchedule(job, config.schedule);
    await kubectl.createNamespacedCronJob(job, namespace);
  }
}

/**
 * Remove data connector job request (and pods) for the specified model
 *
 * @param {String} id Model unique id
 * @param {String} namespace Connector namespace
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
  // Remove cron jobs
  try {
    let job = (await kubectl.listNamespacedCronJob(namespace)).find(j => (j.metadata.name === name));
    if (job) {
      let timeout = false;
      await kubectl.deleteNamespacedCronJob(name, namespace);
      const timer = setTimeout(() => { timeout = true }, 30000);
      while (job && !timeout) {
        await delay(1000);
        job = (await kubectl.listNamespacedCronJob(namespace)).find(j => (j.metadata.name === name));
      }
      clearTimeout(timer);
    }
  } catch (error) {
    logger.warn(`cron job ${name} remove failure`, {module: 'Connector', id});
  }
  // Remove job pods
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
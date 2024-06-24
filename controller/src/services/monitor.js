/* Copyright contributors to the Kmodels project */

"use strict";

const kubectl = require('./kubectl');
const minio = require("./minio");
const {delay} = require("./delay");
const {logger} = require("./logger");

/**
 * Create monitor cronjob
 *
 * @param {String} id Model unique id (used as job id)
 * @param {String} namespace Monitor namespace
 * @param {Object} config Monitor configuration
 */
async function create(id, namespace, config) {
  logger.info(`create ${JSON.stringify(config)}`, {module: 'Monitor', id, user: namespace});
  const name = `${id}-monitor`;
  const version = config.version || "latest";
  const image = `${process.env.DOCKER_SERVER}/monitor/${config.id}:${version}`;
  const command = [
    "python", `${config.id}`,
    "--model_id", id,
    "--config", JSON.stringify(config.arguments),
  ];
  // Search for monitor specific config and secrets
  const configMap = (await kubectl.listNamespacedConfigMap(namespace)).find(
    cm => cm.metadata.name === `${config.id}-monitor`);
  const secrets = (await kubectl.listNamespacedSecret(namespace)).find(
    s => s.metadata.name === `${config.id}-monitor`);
  // Create scheduled job
  const job = kubectl.createV1CronJobConfig(name, image, command);
  kubectl.jobAddImagePullSecret(job, process.env.DOCKER_SECRETS_NAME || "regcred");
  kubectl.jobTtl(job, parseInt(process.env.MONITOR_TTL || "60"));
  kubectl.jobAddEnvFromConfigMap(job, "monitor-config");
  if (configMap) {
    kubectl.jobAddEnvFromConfigMap(job, configMap.metadata.name);
  }
  kubectl.jobAddEnvFromSecrets(job, process.env.MINIO_SECRET || "minio-secret");
  if (secrets) {
    kubectl.jobAddEnvFromSecrets(job, secrets.metadata.name);
  }
  kubectl.jobAddVolume(job, "user-storage", `${namespace}-pvc`);
  kubectl.jobAddVolumeMount(job, "user-storage", "/mnt/storage");
  kubectl.jobSetSchedule(job, config.schedule);
  await kubectl.createNamespacedCronJob(job, namespace);
}

/**
 * Remove all monitor jobs / cron jobs
 *
 * @param {String} id Model unique id
 * @param {String} namespace Monitor namespace
 */
async function remove(id, namespace) {
  logger.info(`remove`, {module: 'Monitor', id, user: namespace});
  const name = `${id}-monitor`;
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
    logger.warn(`job ${name} remove failure`, {module: 'Monitor', id});
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
    logger.warn(`cron job ${name} remove failure`, {module: 'Monitor', id});
  }
  // Remove job pods
  try {
    const pods = (await kubectl.listNamespacePod(namespace)).filter(p => p.metadata.labels['job-name'] === inamed);
    for (const pod of pods) {
      await kubectl.deleteNamespacedPod(pod.metadata.name, namespace);
    }
  } catch (error) {
    logger.warn(`job ${name} pods remove failure`, {module: 'Monitor', id});
  }
}

/**
 * Returns monitor report object name
 *
 * @returns Object path (relative to bucket)
 */
function getObjectName() {
  const path = 'monitor';
  const name = `${path}/${process.env.METRICS_NAME || "report.json"}`;
  return name;
}

/**
 * Get monitor data if exists
 *
 * @param {String} id Model unique id
 *
 * @return
 */
 async function get(id) {
  const results = [];
  const exists = await minio.objectExists(id, getObjectName());
  if (exists) {
    results.push(await minio.getJsonObject(id, getObjectName()));
  }
  return results;
}

/**
 * Clear all monitors data
 *
 * @param {String} id Model unique id
 */
async function clear(id) {
  logger.info(`clear`, {module: 'Monitor', id});
  const objects = await minio.listObjects(id, 'monitor/');
  for (const object of objects) {
    await minio.deleteObject(id, object.name);
  }
}

module.exports = {
  create,
  remove,
  get,
  clear,
}
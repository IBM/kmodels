/* Copyright contributors to the Kmodels project */

"use strict";

const fs = require("fs");
const path = require("path");
const Minio = require('minio');
const logger = require("./logger");

let client;
try {
  const host = process.env.MINIO_URL || 'localhost';
  const port = parseInt(process.env.MINIO_PORT || "9000", 10);
  logger.info(`client ${host}:${port}`, {module: 'Minio'});
  client = new Minio.Client({
    endPoint: host,
    port: port,
    useSSL: process.env.MINIO_USE_SSL === "true" || false,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
  })
  logger.info(`connected`, {module: 'Minio'});
  (async () => {
    const usage = await diskUsage();
    logger.info(`usage [${Math.round(usage / 1024)}KiB/...]`, {module: 'Minio'});
  })();
} catch (err) {
  logger.error(`not configured ${err}`, {module: 'Minio'});
}

/**
 *
 */
function isInitalized() {
  return client;
}

/**
 * Create new bucket
 *
 * @param {*} bucket Bucket name
 */
async function createBucket(bucket, ) {
  logger.debug(`create bucket ${bucket}`, {module: 'Minio'});
  if (! await bucketExists(bucket)) {
    await client.makeBucket(bucket);
  }
}

/**
 * Delete a bucket
 *
 * @param {*} bucket
 * @param {*} force
 * @returns
 */
async function deleteBucket(bucket, force = false) {
  logger.debug(`delete bucket:${bucket}`, {module: 'Minio'});
  if (force) {
    const objects = await (() => {
      return new Promise((resolve, reject) => {
        const result = [];
        const stream = client.listObjects(bucket, '', true);
        stream.on('data', obj => result.push(obj.name));
        stream.on('error', reject);
        stream.on('end', async () => { resolve(result); })
      })
    })();
    for (const object of objects) {
      await client.removeObject(bucket, object);
    }
  }
  return await client.removeBucket(bucket);
}

/**
 * Get bucket objects
 *
 * @param {*} bucket
 * @param {*} path
 */
async function getBucket(bucket, path) {
  logger.debug(`get bucket ${bucket} ${path}`, {module: 'Minio'});
  if (!fs.existsSync(`${path}/${bucket}`)) {
    fs.mkdirSync(`${path}/${bucket}`, { recursive: true });
  }
  // Get bucket objects
  for (const object of await listObjects(bucket)) {
    await client.fGetObject(bucket, object.name, `${path}/${bucket}/${object.name}`);
  }
}

/**
 *
 * @returns
 */
async function listBuckets() {
  return await client.listBuckets();
}

/**
 *
 * @returns
 */
async function bucketExists(bucket) {
  logger.debug(`check bucket exists ${bucket}`, {module: 'Minio'});
  return client.bucketExists(bucket);
}

/**
 * Returns total bucket usage in size
 *
 * @param {String} bucket Bucket name
 */
async function bucketUsage(bucket) {
  const objects = await listObjects(bucket);
  let usage = 0;
  for (const obj of objects) {
    usage += obj.size;
  }
  return usage;
}

/**
 *
 */
async function diskUsage() {
  let usage = 0;
  for (const bucket of await listBuckets()) {
    const size = await bucketUsage(bucket.name);
    logger.debug(`usage ${bucket.name} [${size}/]`, {module: 'Minio'});
    usage += size;
  }
  return usage;
}

/**
 *
 * @param {*} bucket - Bucket name
 * @param {*} name - Target object name (x/y/...)
 * @param {*} file - File to upload
 * @returns
 */
async function fPutObject(bucket, name, file) {
  logger.debug(`fput ${file} to ${bucket}/${name}`, {module: 'Minio'});
  const stats = fs.statSync(file);
  const fileStream = fs.createReadStream(file);
  await client.putObject(bucket, name, fileStream, stats.size);
}

/**
 *
 * @param {*} bucket
 * @param {*} name
 * @param {*} object
 * @param {*} tags Object tagging (optional)
 * @returns
 */
async function putObject(bucket, name, object, tags) {
  logger.debug(`put object ${bucket}/${name}`, {module: 'Minio'});
  if (typeof(object) === "object") {
    object = JSON.stringify(object);
  }
  await client.putObject(bucket, name, object);
  if (tags) {
    await setObjectTagging(bucket, name, tags);
  }
}

/**
 *
 * @param {*} bucket
 * @param {*} object
 * @param {*} tags
 */
async function setObjectTagging(bucket, object, tags) {
  await client.setObjectTagging(bucket, object, tags);
}

/**
 *
 * @param {*} bucket
 * @param {*} object
 * @returns
 */
async function getObjectTagging(bucket, object) {
  return await client.setObjectTagging(bucket, object);
}

/**
 * Get object
 *
 * @param {*} bucket
 * @param {*} name
 */
async function getObject(bucket, name) {
  return new Promise((resolve, reject) => {
    logger.debug(`get ${bucket}/${name}`, {module: 'Minio'});
    let data = "";
    client.getObject(bucket, name, (err, dataStream) => {
      if (err || !dataStream) {
        reject(err.message);
      } else {
        dataStream.on('data', function(chunk) {
          data += chunk;
        })
        dataStream.on('end', function() {
          resolve(data);
        })
        dataStream.on('error', function(err) {
          reject(err.message);
        })
      }
    })
  })
}

/**
 *
 * @param {*} bucket
 * @param {*} name
 * @returns
 */
async function getJsonObject(bucket, name) {
  try {
    const data = await getObject(bucket, name);
    return JSON.parse(data);
  } catch (e) {
    logger.error(`Minio: ${e}`);
    return null;
  }
}

/**
 * Get object from external storage to local file
 *
 * @param {*} bucket - Bucket name
 * @param {*} name - Object name
 * @param {*} file - File full path

 * @returns Promise
 */
async function fGetObject(bucket, name, file) {
  file = file || name;
  logger.debug(`fget ${bucket}/${name} to ${file}`, {module: 'Minio'});
  await client.fGetObject(bucket, name, file);
}

/**
 * List all objects in bucket
 *
 * @param {*} bucket
 * @param {*} prefix
 * @returns
 */
async function listObjects(bucket, prefix = '') {
  logger.debug(`list object bucket:${bucket} prefix:${prefix}`, {module: 'Minio'});
  return new Promise((resolve, reject) => {
    const result = [];
    const stream = client.listObjectsV2(bucket, prefix, true, '');
    stream.on('data', obj => result.push(obj));
    stream.on('error', reject);
    stream.on('end', () => {
      resolve(result);
    })
  })
}

/**
 *
 * @param {*} bucket
 * @param {*} name
 * @returns
 */
async function deleteObject(bucket, name) {
  logger.debug(`delete object ${bucket}/${name}`, {module: 'Minio'});
  await client.removeObject(bucket, name);
}

/**
 * Copy object
 *
 * @param {*} source source object to copy (full path)
 * @param {*} bucket
 * @param {*} name
 * @returns
 */
async function copyObject(source, bucket, name) {
  if (!name) {
    name = path.basename(source);
  }
  logger.debug(`copy object source:${source} target:${bucket}/${name}`, {module: 'Minio'});
  await client.copyObject(bucket, name, source, new Minio.CopyConditions());
}

/**
 *
 * @param {*} bucket
 * @param {*} name
 */
async function objectExists(bucket, name) {
  logger.debug(`object exists ${bucket}/${name}`, {module: 'Minio'});
  try {
    await client.statObject(bucket, name);
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw new Error(`Object ${name} doesn't exists`);
  }
  return true;
}

/**
 * Associate user-created notification to a specified bucket name.
 *
 * @param {*} bucket
 * @param {*} type
 * @param {*} prefix
 * @param {*} suffix
 * @returns
 */
async function addNotification(bucket, type, prefix, suffix) {
  logger.debug(`add notification to bucket ${bucket}`, {module: 'Minio'});
  // Create a new notification object
  const notification = new Minio.NotificationConfig();
  // Setup a new Queue configuration
  const arn = Minio.buildARN('minio', 'sqs', '', type, 'webhook');
  const queue = new Minio.QueueConfig(arn);
  if (suffix && (suffix.trim() !== '')) {
    queue.addFilterSuffix(`.${suffix}`);
  }
  if (prefix && (prefix.trim() !== '')) {
    queue.addFilterPrefix(prefix);
  }
  queue.addEvent(Minio.ObjectCreatedPut);
  // Add the queue to the overall notification object
  notification.add(queue)
  await client.setBucketNotification(bucket, notification);
}

/**
 * Returns all bucket notifications
 *
 * @param {*} bucket
 * @returns
 */
async function getNotifications(bucket) {
  let bucketNotificationConfig = await client.getBucketNotification(bucket);
  return bucketNotificationConfig.QueueConfiguration;
}

/**
 * Remove bucket notification
 *
 * @param {*} bucket
 * @returns
 */
async function removeNotification(bucket) {
  logger.debug(`remove notification from ${bucket}`, {module: 'Minio'});
  await client.removeAllBucketNotification(bucket);
}

module.exports = {
  // General
  isInitalized,
  diskUsage,
  // Bucket
  createBucket,
  deleteBucket,
  getBucket,
  listBuckets,
  bucketExists,
  bucketUsage,
  // Objects
  putObject,
  setObjectTagging,
  getObjectTagging,
  fPutObject,
  copyObject,
  getObject,
  getJsonObject,
  fGetObject,
  deleteObject,
  listObjects,
  objectExists,
  // Notifications
  addNotification,
  getNotifications,
  removeNotification,
}
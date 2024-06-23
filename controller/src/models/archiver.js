"use strict";

const fs = require('fs');
const path = require('path');
const tar = require('tar');
const minio = require("../services/minio");
const {readdir} = require("./helpers");
const logger = require("./logger");

// To reduce calls to storage
const cache = {};

/**
 * Archive a model
 *
 * @param {*} id Model unique id
 *
 * @return Unique archive build id
 */
async function archive(id) {
  logger.info(`archive`, {id, module: 'Archiver'});
  // Archive unique build id
  const build = `${new Date().toISOString().replace(/T/, '-').replace(/\..+/, '')}`;
  // Archive file name
  const file = `/tmp/${build}.tgz`;
  try {
    await minio.getBucket(id, '/tmp');
    tar.c({
        C: '/tmp',
        gzip: true,
        sync: true,
        file: file,
        filter: (path, stat) => {
          for (const name of ['metadata.json', 'archives']) {
            if (path.includes(name)) {
              return false;
            }
          };
          logger.debug(`add ${path}`, {id, module: 'Archiver'});
          return true;
        }
      }, [id]
    )
    // Upload
    await minio.fPutObject(id, `archives/${build}.tgz`, file);
    logger.debug(`archive ${build}`, {id, module: 'Archiver'});
    return build;
  } catch (error) {
    logger.error(`${error.message}`, {id, module: 'Archiver'});
  } finally {
    // Cleanup
    fs.rmSync(file, { force: true });
    fs.rmSync(`/tmp/${id}`, { recursive: true, force: true });
    // Force cache update
    delete cache[id];
  }
}

/**
 * Unarchive (restore) a model
 *
 * @param {*} id Model unique id
 * @param {*} build Unique buidl id
 */
async function unarchive(id, build) {
  logger.info(`unarchive not implemented yet`, {id, module: 'Archiver'});
  // Archive file name
  const file = `/tmp/${build}.tgz`;
  // Download archive to local storage
  await minio.fGetObject(id, `archives/${build}.tgz`, file);
  // Untar model
  logger.debug(`untar ${file} to ${id}`, {id, module: 'Archiver'});
  fs.createReadStream(file).pipe(tar.x({C: '/tmp'}));
  // Restore archive
  const files = readdir(`/tmp/${id}`, {fullPath: false});
  for (let file of files) {
    const object = file.split(`${id}/`)[1];
    await minio.fPutObject("test", `${object}`, file);
  }
}

/**
 * Remove model archives
 *
 * @param {*} id Model unique id
 * @param {*} name Remove by name, all if not specified.
 *
 * @returns List of removed archives.
 */
async function remove(id, name) {
  logger.info(`remove ${name || 'all'}`, {id, module: 'Archiver'});
  const removed = [];
  const prefix = `archives`;
  for (const object of await minio.listObjects(id, prefix)) {
    if (name) {
      if (object.name.includes(name)) {
        await minio.deleteObject(id, object.name);
        removed.push(object.name.split('/')[1])
      }
    } else {
      await minio.deleteObject(id, object.name);
      removed.push(object.name.split('/')[1])
    }
  }
  // Force cache update
  delete cache[id];
  return removed;
}

/**
 * Keep the number of model archives.
 *
 * @param {*} id Model unique id
 * @param {*} n Number of archives to keep.
 */
async function keep(id, n = 1) {
  logger.info(`keep ${n}`, {id, module: 'Archiver'});
  const archives = await list(id);
  for (let i = n; i < archives.length; i = i + 1) {
    await remove(id, archives[i]);
  }
  // Force cache update
  delete cache[id];
}

/**
 * List all models archives.
 *
 * @param {*} id Model unique id
 */
async function list(id) {
  if (!cache[id]) {
    const archives = [];
    for (const object of await minio.listObjects(id, `archives/`)) {
      archives.push(path.parse(object.name).name);
    }
    cache[id] = archives.sort().reverse();
  }
  logger.debug(`total archives ${cache[id].length}`, {id, module: 'Archiver'});
  return cache[id];
}

module.exports = {
  archive,
  unarchive,
  remove,
  list,
  keep,
}
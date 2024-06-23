"use strict";

const kubectl = require('./kubectl');
const {logger} = require("./logger");

/**
 * Custom resource parameters based on resource kind
 */
const kinds = {
  "InferenceService": {
    group: "serving.kserve.io",
    version: "v1beta1",
    plural: "inferenceservices"
  },
  "InferenceGraph": {
    group: "serving.kserve.io",
    version: "v1alpha1",
    plural: "inferencegraphs"
  }
}

/**
 * Create inference service
 *
 * @param {Object} resource k8s resource
 * @param {String} namespace
 */
async function create(resource, namespace) {
  logger.debug(`create ${resource.metadata.name} ${JSON.stringify(resource)}`, {module: 'Kserve'});
  try {
    const k = resource.kind;
    await kubectl.createNamespacedCustomObject(resource,
      kinds[k].group, kinds[k].version, kinds[k].plural, namespace);
  } catch (e) {
    logger.error(e);
  }
}

/**
 * Patch inference service
 *
 * @param {Object} resource k8s new resource
 * @param {String} namespace
 * @param {String} path
 */
async function update(resource, namespace, path) {
  logger.debug(`update ${resource.metadata.name} ${JSON.stringify(resource)}`, {module: 'Kserve'});
  try {
    const k = resource.kind;
    const value = path.substring(1).split('/').reduce((o, k) => {
      return o && o[k];
    }, resource);
    await kubectl.patchNamespacedCustomObject([{ op: "replace", path, value }],
      kinds[k].group, kinds[k].version, kinds[k].plural, resource.metadata.name, namespace);
  } catch (e) {
    logger.error(e);
  }
}

/**
 * Delete inference service
 *
 * @param {String} id Model unique id
 * @param {String} namespace
 */
async function remove(id, namespace) {
  logger.debug(`remove`, {module: 'Kserve', id});
  try {
    const k = await kind(id, namespace);
    await kubectl.deleteNamespacedCustomObject(id,
      kinds[k].group, kinds[k].version, kinds[k].plural, namespace);
  } catch (e) {
    logger.error(e);
  }
}

/**
 *
 * @param {String} id Model unique id
 * @param {String} namespace
 */
async function get(id, namespace) {
  logger.debug(`get`, {module: 'Kserve', id});
  const k = await kind(id, namespace);
  return await kubectl.getNamespacedCustomObject(id,
    kinds[k].group, kinds[k].version, kinds[k].plural, namespace);
}

/**
 * Returns inference service status
 *
 * @param {String} id Model unique id
 */
async function status(id, namespace) {
  const result = await get(id, namespace);
  return result.body.status.modelStatus;
}

/**
 * Returns resource kind
 *
 * @param {String} id Model unique id
 * @param {String} namespace
 */
async function kind(id, namespace) {
  const deployment = (await kubectl.listNamespacedDeployment(namespace)).find(d =>
    d.labels && (d.labels.inferenceservice === id) || (d.labels.inferencegraph === id)
  );
  let k;
  if (deployment) {
    if (deployment.labels.inferenceservice) {
      k = "InferenceService";
    } else if (deployment.labels.inferencegraph) {
      k = "InferenceGraph";
    }
    logger.debug(`kind ${k}`, {module: 'Kserve', id});
  } else {
    logger.debug(`kind wasn't detected`, {module: 'Kserve', id});
  }
  return k;
}

/**
 * Restart inference service
 *
 * @param {String} id Model unique id
 * @param {String} namespace
 */
async function restart(id, namespace) {
  logger.debug(`restart`, {module: 'Kserve', id});
  for (const pod of await kubectl.listNamespacePod(namespace)) {
    if (pod.metadata.name.indexOf(id) === 0) {
      if (['predictor', 'explainer', 'transformer'].indexOf(pod.metadata.labels.component) >= 0) {
        logger.debug(`restart ${pod.metadata.name}`, {module: 'Kserve'});
        await kubectl.deleteNamespacedPod(pod.metadata.name, namespace);
      }
    }
  }
}

/**
 * Returns true if at least one component exists for an inference service
 *
 * @param {String} id Model unique id
 * @param {String} namespace
 *
 * @return true / false
 */
async function exists(id, namespace) {
  let components = {};
  for (const pod of await kubectl.listNamespacePod(namespace)) {
    if (pod.metadata.name.indexOf(id) === 0) {
      if (pod.metadata.labels.component) {
        components[pod.metadata.labels.component] = pod.status.phase;
      }
    }
  }
  return Object.entries(components).length ? true : false;
}

/**
 * Return true if inference server / graph is ready for serving, false otherwise
 *
 * @param {String} id Model unique id
 * @param {String} namespace
 */
async function ready(id, namespace) {
  // Get all inference server pods
  let pods = (await kubectl.listNamespacePod(namespace)).filter(pod => {
    return ['predictor', 'splitter', 'ensemble'].includes(pod["metadata"].labels['component']) &&
      pod["metadata"].name.split('-')[0] === id;
  });
  // At least one pod should be in ready state. A pod is in ready state if all containers
  // are ready.
  if (pods.length) {
    let ready = false;
    for (const pod of pods) {
      if (pod["status"]["containerStatuses"].some(status => status === false) === false) {
        // Found at least one pod which is ready
        ready = true;
        break;
      }
    }
    logger.debug(`ready ${ready} [${pods.length}]`, {module: 'Kserve', id});
    return ready;
  } else {
    // No pods found for the specified model
    return false;
  }
}

/**
 *
 * @param {String} namespace
 * @param {Array/String} component Component filtering
 *
 * @returns
 */
async function list(namespace, components) {
  const deployments = await kubectl.listNamespacedDeployment(namespace);
  components = (typeof components === 'undefined' || Array.isArray(components) ) ? components : [components];
  let servers = deployments
    .filter(deployment => {
      return components === undefined || components.includes(deployment.labels.component)
    })
    .map(deployment => {
      return { id: deployment.labels.inferenceservice || deployment.labels.inferencegraph }
    })
    .filter((value, index, self) =>
      index === self.findIndex((t) => (
        t.id === value.id
      ))
    )
    .filter(element => {
      return element.id !== undefined;
    })
  return servers;
}

module.exports = {
  create,
  update,
  get,
  remove,
  restart,
  status,
  exists,
  ready,
  list,
}
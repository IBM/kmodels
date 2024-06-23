"use strict";

const {logger} = require("./logger");

/**
 *
 */
const inferenceServiceCustomResource = {
  "apiVersion": "serving.kserve.io/v1beta1",
  "kind": "InferenceService",
  "metadata": {
    "name": "__name__",
  },
  "spec": {
    "predictor": {
      "containers": [
        {
          "name": "predictor"
        }
      ]
    },
    "transformer": {
      "containers": [
        {
          "name": "transformer"
        }
      ]
    },
    "explainer": {
      "containers": [
        {
          "name": "explainer"
        }
      ]
    }
  }
}

/**
 *
 */
const inferenceServiceResource = {
  "apiVersion": "serving.kserve.io/v1beta1",
  "kind": "InferenceService",
  "metadata": {
    "name": "__name__"
  },
  "spec": {
    "predictor": {
      "model": {
        "modelFormat": {
        },
      }
    },
    "transformer": {
      "containers": [
        {
          "name": "transformer-container"
        }
      ]
    }
  }
}

/**
 *
 * @param {Object} container
 * @param {Object} template component template
 * @param {*} manifest
 * @param {*} model
 * @param {*} server
 *
 * @return Container
 */
function addDockerImage(container, template, manifest, model, server) {
  // If image was specify, use it, replace registry if required ($/)
  if (template.image) {
    if (template.image.indexOf('$REGISTRY/') === 0) {
      let registry = process.env.DOCKER_SERVER || '';
      if (registry.length) {
        if (registry.slice(-1) != '/') {
          registry += '/';
        }
        container.image = `${registry}${template.image.replace(/\$REGISTRY\//, '')}`;
      } else {
        container.image = template.image.replace(/\$REGISTRY\//, '');
      }
    } else {
      container.image = template.image;
    }
    container['imagePullPolicy'] = 'Always';
  } else {
    logger.error(`image doesn't exists`, {module: 'Isvc'});
    // // Auto generate image name only if custom model. Otherwise, use default kserve images
    // if ((manifest.kserve.predictor.type || "custom") === "custom") {
    //   // Auto generate docker image name
    //   container.image = `inference/${model}-${server}`;
    //   if (manifest.image && manifest.image.repository) {
    //     container.image = `${manifest.image.repository}/` + container.image;
    //   }
    //   container['imagePullPolicy'] = 'Always';
    // }
  }
  return container;
}

/**
 * Check if image was specified
 *
 * @param {Object} container
 *
 * @returns Return true if container has custom image, false otherwise
 */
function hasDockerImage(container) {
  return container.image ? true : false
}

/**
 *
 * @param {Object} container
 * @param {String} name
 *
 * @return Container
 */
function addConfigMap(container, name) {
  container.envFrom = container.envFrom || [];
  container.envFrom.push({
    configMapRef: {
      name
    }
  });
  return container;
}

/**
 *
 * @param {Object} container
 * @param {String} name
 *
 * @return Container
 */
function addSecrets(container, name) {
  container.envFrom = container.envFrom || [];
  container.envFrom.push({
    secretRef: {
      name
    }
  });
  return container;
}

/**
 *
 * @param {Object} container
 * @param {*} key
 * @param {*} value
 *
 * @return Container
 */
function addArgument(container, key, value) {
  container.args = container.args || [];
  container.args.push(`--${key}`);
  container.args.push(value);
  return container;
}

/**
 *
 * @param {Object} container
 * @param {*} args
 *
 * @return Container
 */
 function addArguments(container, args = []) {
  for (const arg of args) {
    addArgument(container, arg.name, arg.value);
  }
  return container;
}

/**
 *
 * @param {Object} container
 * @param {*} name
 * @param {*} value
 *
 * @return Container
 */
function addEnvironment(container, name, value) {
  container.env = container.env || [];
  container.env.push({name, value});
  return container;
}

/**
 *
 * @param {Object} container
 * @param {*} template
 *
 * @return Container
 */
function addPredefinedArguments(container, template) {
  for (const arg of (template.arguments || [])) {
    container.args.push(arg);
  }
  return container;
}

/**
 * Add predefined template arguments
 *
 * @param {*} spec
 * @param {*} template
 *
 * @return Container
*/
function addPredefineEnvironment(container, template) {
  for (const name of (Object.keys(template.environment || {}))) {
    container.env.push({name, value: template.environment[name]});
  }
  return container;
}

/**
 * Set container resources (limits & requests).
 *
 * @param {Object} container
 * @param {Object} resources Resource request. can be undefined.
 *
 * @return Container
 */
function setResources(container, resources) {
  logger.info(`set resources ${JSON.stringify(resources || {})}`, {module: 'Isvc'});
  if (resources) {
    container.resources = {
      "limits": resources,
      "requests": resources,
    }
  }
  return container;
}

/**
 *
 * @param {Object} container
 * @param {Integer} delay initialDelaySeconds
 * @param {Integer} period periodSeconds
 * @param {Integer} failures failureThreshold
 * @param {Integer} success successThreshold
 */
function setReadinessProbe(container, delay = 5, period = 10, failures = 3, success = 1) {
  logger.debug(`set readiness probe delay ${delay} period ${period} failures ${failures}`, {module: 'Isvc'});
  container.readinessProbe = {
    initialDelaySeconds: delay,
    periodSeconds: period,
    failureThreshold: failures,
    successThreshold: success
  }
}

/**
 * Remove empty fields
 *
 * @param {*} container
 */
function compactResource(container) {
  // Clean
  if (container.env && container.env.length === 0) {
    delete container.env;
  }
  if (container.args && container.args.length === 0) {
    delete container.args;
  }
}

/**
 * Add logging
 *
 * @param {Object} component
 * @param {*} url
 *
 * @return Component
 */
function addLogger(component, url) {
  component.logger = {
    mode: "all",
    url
  }
  return component;
}

/**
 *
 * @param {Object} component
 * @param {*} size The max batch size for triggering a prediction.
 * @param {*} latency The max latency for triggering a prediction (In milliseconds).
 */
function addBatcher(component, size, latency) {
  component.batcher = {
    maxBatchSize: size,
    maxLatency: latency
  }
  return component;
}

/**
 * Add image pull secret to inference service
 *
 * @param {Object} component
 * @param {*} secret
 *
 * @return Component
 */
function addImagePullSecret(component, secret) {
  component["imagePullSecrets"] = [{
    "name": secret
  }];
  return component;
}

/**
 * Add service account inference service
 *
 * @param {Object} component
 * @param {*} name
 *
 * @return Component
 */
function addServiceAccount(component, name) {
  component["serviceAccountName"] = name;
  return component;
}

/**
 * Set min replicas
 *
 * @param {Object} component
 * @param {*} replicas
 *
 * @return Component
 */
function setMinReplicas(component, replicas) {
  component["minReplicas"] = replicas;
  return component;
}

/**
 *
 * @param {Object} resource
 * @param {*} key Annotation key
 * @param {*} value Annotation value
 */
function addAnnotation(resource, key, value) {
  resource.metadata.annotations = resource.metadata.annotations || {};
  resource.metadata.annotations[key] = value;
}

/**
 *
 * @param {Object} resource
 * @param {*} annotations Dict of anotations { ke1: value1, key2: value2 }
 */
function addAnnotations(resource, annotations) {
  for (const key in annotations) {
    addAnnotation(resource, key, annotations[key]);
  }
}

/**
 *
 * @param {Object} resource Inference service resource
 * @param {String} type Component type: predictor / transformer / explainer
 *
 * @returns Returns container spec if custom resource.
 */
function getContainer(resource, type) {
  const component = getComponent(resource, type);
  if (component) {
    if (component.containers) {
      return component.containers[0];
    } else {
      // This is a patch for now. We assume there is only one key when this function
      // is called. Should find the right server key (e.g. sklearn, xgboost etc.)
      return component[Object.keys(component)[0]];
    }
  }
}

/**
 * Returns inference service component from resource
 *
 * @param {Object} resource Inferenbce service resource
 * @param {String} type Component type: predictor / transformer / explainer
 */
 function getComponent(resource, type) {
  if (['predictor', 'transformer', 'explainer'].indexOf(type) < 0) {
    throw new Error(`Invalid inference service component type ${type}`);
  }
  return resource.spec[type];
}

/**
 * Returns the supported inference service components
 */
function getComponents() {
  return ['predictor', 'explainer', 'transformer'];
}

/**
 * Custom inference service resource
 *
 * @param {*} model Template name
 * @param {*} manifest Model template manifest
 * @param {*} id Model unique id
 *
 * @returns
 */
function buildCustomServer(model, manifest, id) {
  logger.info(`generate custom inference service resource`, {module: 'Isvc', id});
  const resource = JSON.parse(JSON.stringify(inferenceServiceCustomResource));
  resource.metadata.name = id;
  // Predictor
  if (manifest.kserve.predictor) {
    logger.debug("add custom predictor server", {module: 'Isvc', id});
    const template = manifest.kserve.predictor;
    const container = resource.spec.predictor.containers[0];
    // Add image
    addDockerImage(container, template, manifest, model, 'predictor');
    // container.protocolVersion = template.protocol || "v1";
    // Models storage
    if (template.storageUri) {
      // Replace pattern if exists
      addEnvironment(container, "STORAGE_URI",
        template.storageUri.replace(/\$id|\$MODEL_ID/g, id));
    }
    // Add auto generated args
    addArgument(container, `model_name`, id);
    if (container.env && container.env.find(e => (e.name === "STORAGE_URI"))) {
      addArgument(container, `model_dir`, `/mnt/models`);
    }
    // Default user configmap and secretes
      // addConfigMap(container, process.env.ENV_CONFIG_MAP || 'user-config');
      // addSecrets(container, process.env.ENV_SECRETS || 'user-secret');
    // Add predefined
    addPredefineEnvironment(container, template);
    addPredefinedArguments(container, template);
    compactResource(container);
  } else {
    throw new Error("Predictor must be defined");
  }
  // Explainer
  if (manifest.kserve.explainer) {
    logger.debug("add custom explainer server", {module: 'Isvc', id});
    const template = manifest.kserve.explainer;
    const container = resource.spec.explainer.containers[0];
    // Add image
    addDockerImage(container, template, manifest, model, 'explainer');
    // Add auto generated args
    addArgument(container, `model_name`, id);
    if (container.env && container.env.find(e => (e.name === "STORAGE_URI"))) {
      addArgument(container, `model_dir`, `/mnt/models`);
    }
    // Default user configmap and secretes
      // addConfigMap(container, process.env.ENV_CONFIG_MAP || 'user-config');
      // addSecrets(container, process.env.ENV_SECRETS || 'user-secret');
    // Add predefined
    addPredefineEnvironment(container, template);
    addPredefinedArguments(container, template);
    compactResource(container);
  } else {
    delete resource.spec.explainer;
  }
  // Tranfromer
  if (manifest.kserve.transformer) {
    logger.info("add custom transformer server", {module: 'Isvc', id});
    const template = manifest.kserve.transformer;
    const container = resource.spec.transformer.containers[0];
    // Add image
    addDockerImage(container, template, manifest, model, 'transformer');
    // Models storage
    if (template.storageUri) {
      // Replace pattern if exists
      addEnvironment(container, "STORAGE_URI",
        template.storageUri.replace(/\$id|\$MODEL_ID/g, id));
    }
    // Add auto generated args
    addArgument(container, `model_name`, id);
    if (container.env && container.env.find(e => (e.name === "STORAGE_URI"))) {
      addArgument(container, `model_dir`, `/mnt/models`);
    }
    if (manifest.kserve.explainer) {
      addArgument(container, `explainer_host`, `${id}-explainer-default.default`);
    }
    // Default user configmap and secretes
      // addConfigMap(container, process.env.ENV_CONFIG_MAP || 'user-config');
      // addSecrets(container, process.env.ENV_SECRETS || 'user-secret');
    // Add predefined
    addPredefineEnvironment(container, template);
    addPredefinedArguments(container, template);
    compactResource(container);
  } else {
    delete resource.spec.transformer;
  }
  return resource;
}

/**
 *
 * @param {*} model Template name
 * @param {*} manifest Model template manifest
 * @param {*} id Model unique id
 *
 * @returns
 */
function buildModelServer(model, manifest, id) {
  const server = manifest.kserve.predictor.type;
  logger.info(`generate ${server} inference service resource`, {module: 'Isvc', id});
  const resource = JSON.parse(JSON.stringify(inferenceServiceResource));
  resource.metadata.name = id;
  // Predictor
  if (manifest.kserve.predictor) {
    // Set server
    resource.spec['predictor']['model']['modelFormat'] = { "name": server };
    const container = resource.spec['predictor']['model'];
    const template = manifest.kserve.predictor;
    container.protocolVersion = template.protocol || "v1";
    // Model storage
    if (template.storageUri) {
      template.storageUri = template.storageUri.replace(/\$id|\$MODEL_ID/g, id);
      container.storageUri = template.storageUri;
    }
    // Model runtime
    if (template.runtimeVersion) {
      container.version = template.runtimeVersion;
    }
    // Add predefined
    addPredefineEnvironment(container, template);
    addPredefinedArguments(container, template);
    compactResource(container);
  } else {
    throw new Error("Isvc: predictor must be defined");
  }
  // Transformer
  if (manifest.kserve.transformer) {
    const container = resource.spec.transformer.containers[0];
    const template = manifest.kserve.transformer;
    // Add docker image
    addDockerImage(container, template, manifest, model, 'transformer');
    // Add default args
    addArgument(container, `model_name`, id);
    if (manifest.kserve.explainer) {
      addArgument(container, `explainer_host`, `${id}-explainer-default.default`);
    }
    if (template.storageUri) {
      // Replace pattern if exists
      addEnvironment(container, "STORAGE_URI",
        template.storageUri.replace(/\$id|\$MODEL_ID/g, id));
    }
    // Default user configmap and secretes
      // addConfigMap(container, process.env.ENV_CONFIG_MAP || 'user-config');
      // addSecrets(container, process.env.ENV_SECRETS || 'user-secret');
    // Add predefined
    addPredefineEnvironment(container, template);
    addPredefinedArguments(container, template);
    compactResource(container);
  } else {
    delete resource.spec.transformer;
  }
  if (manifest.kserve.explainer) {
    logger.error(`not implemented yet`, {module: 'Isvc', id});
  }
  return resource;
}

/**
 * Build custom resource definition for inference service (predictor / transformer /
 * explainer). Build resource from template and manifest data.
 * Use this module member functions to set resource values from user configuration
 *
 * @param {*} template Build template
 * @param {*} id Model deployment unique id
 *
 * @returns Custom resource definition
 */
function build(template, id) {
  let resource;
  const name = template.info.name;
  const manifest = template.manifest;
  logger.info(`build custom resource definition`, {module: 'Isvc', id});
  if (manifest.kserve) {
    if (!manifest.kserve.predictor) {
      logger.error("inference service predictor doesn't exists", {module: 'Isvc'});
    } else {
      if ((manifest.kserve.predictor.type || "custom") === "custom") {
        resource = buildCustomServer(name, manifest, id);
      } else {
        resource = buildModelServer(name, manifest, id);
      }
    }
  } else {
    logger.warn("no inference services", {module: 'Isvc'});
  }
  return resource;
}

module.exports = {
  build,
  // Resource operations
  getComponents,
  getContainer,
  getComponent,
  addAnnotations,
  // Container operations
  hasDockerImage,
  addArguments,
  setResources,
  addConfigMap,
  addSecrets,
  setReadinessProbe,
  // Component operations
  addLogger,
  addBatcher,
  addImagePullSecret,
  addServiceAccount,
  setMinReplicas,
}

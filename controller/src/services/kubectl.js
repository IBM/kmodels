"use strict";

const stream = require('stream');
const k8s = require('@kubernetes/client-node');
const {KubectlRequestError} = require('./error');
const logger = require("./logger");

// Kube config
const kc = new k8s.KubeConfig();
kc.loadFromDefault();

// See https://github.com/kubernetes-client/javascript/blob/master/src/gen/api/appsV1Api.ts
const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);
// See https://github.com/kubernetes-client/javascript/blob/master/src/gen/api/coreV1Api.ts
const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
// See https://github.com/kubernetes-client/javascript/blob/master/src/gen/api/customObjectsApi.ts
const customApi = kc.makeApiClient(k8s.CustomObjectsApi);
// See https://github.com/kubernetes-client/javascript/blob/master/src/gen/api/customObjectsApi.ts
const batchV1Api = kc.makeApiClient(k8s.BatchV1Api);

// For logging
const log = new k8s.Log(kc);

/**
 * See https://github.com/kubernetes-client/java/blob/master/kubernetes/docs/AppsV1Api.md#listnamespaceddeployment
 *
 * @param {*} namespace
 * @returns
 */
async function listNamespacePod(namespace) {
  try {
    const result = await coreV1Api.listNamespacedPod(namespace);
    return result.body.items || [];
  } catch (error) {
    throw error;
  }
}

/**
 * See https://github.com/kubernetes-client/java/blob/master/kubernetes/docs/AppsV1Api.md#listnamespaceddeployment
 *
 * @param {*} namespace
 * @returns
 */
async function listNamespacedDeployment(namespace) {
  let deployments = [];
  try {
    const result = await appsV1Api.listNamespacedDeployment(namespace);
    for (const deployment of result.body.items) {
      deployments.push({
        name: deployment.metadata.name,
        status: deployment.status.conditions[0].status,
        image: deployment.spec.template.spec.containers[0].image,
        ports: [],
        services: [],
        labels: {
          component: deployment.metadata.labels["component"],
          inferenceservice: deployment.metadata.labels["serving.kserve.io/inferenceservice"],
          inferencegraph: deployment.metadata.labels["serving.kserve.io/inferencegraph"],
        }
      })
    }
  } catch (error) {
    throw error;
  }
  return deployments;
}

/**
 * See https://raw.githubusercontent.com/kubernetes-client/java/master/kubernetes/docs/CoreV1Api.md
 *
 * @param {*} name
 * @param {*} namespace
 * @returns
 */
 async function deleteNamespacedPod(name, namespace) {
  logger.debug(`deleteNamespacedPod name:${name} namespace:${namespace}`, {module: 'Kubectl'});
  const result = await coreV1Api.deleteNamespacedPod(name, namespace);
  return result.body;
}

/**
 * See https://github.com/kubernetes-client/java/blob/master/kubernetes/docs/CustomObjectsApi.md#createclustercustomobject
 *
 * @param {*} group
 * @param {*} version
 * @param {*} plural
 * @param {*} namespace
 */
async function createNamespacedCustomObject(body, group, version, plural, namespace) {
  try {
    logger.debug(`Kubectl: createNamespacedCustomObject namespace=${namespace}`);
    return await customApi.createNamespacedCustomObject(group, version, namespace, plural, body);
  } catch (error) {
    throw new KubectlRequestError(error.body.message)
  }
}

/**
 * See https://github.com/kubernetes-client/java/blob/master/kubernetes/docs/CustomObjectsApi.md#replacenamespacedcustomobject
 *
 * @param {*} group
 * @param {*} version
 * @param {*} plural
 * @param {*} namespace
 */
async function replaceNamespacedCustomObject(body, group, version, plural, namespace) {
  // try {
  //   logger.debug(`Kubectl: replaceNamespacedCustomObject namespace=${namespace}`);
  //   return await customApi.replaceNamespacedCustomObject(group, version, namespace, plural, body);
  // } catch (error) {
  //   throw new KubectlRequestError(error.body.message)
  // }
}

/**
 * See https://github.com/kubernetes-client/java/blob/master/kubernetes/docs/CustomObjectsApi.md#replacenamespacedcustomobject
 *
 * @param {*} body The patch resource
 * @param {*} group
 * @param {*} version
 * @param {*} plural
 * @param {*} namespace
 */
async function patchNamespacedCustomObject(body, group, version, plural, name, namespace) {
  try {
    logger.debug(`Kubectl: patchNamespacedCustomObject namespace=${namespace}`);
    const options = { "headers": { "Content-type": k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH}};
    return await customApi.patchNamespacedCustomObject(group, version, namespace, plural, name, body,
      undefined, undefined, undefined, options);
  } catch (error) {
    throw new KubectlRequestError(error.body.message)
  }
}

/**
 *
 * @param {*} body
 * @param {*} group
 * @param {*} version
 * @param {*} plural
 * @param {*} namespace
 * @returns
 */
async function getNamespacedCustomObject(body, group, version, plural, namespace) {
  try {
    logger.debug(`Kubectl: getNamespacedCustomObject`);
    return await customApi.getNamespacedCustomObject(group, version, namespace, plural, body);
  } catch (error) {
    throw new KubectlRequestError(error.body.message)
  }
}

/**
 * See https://github.com/kubernetes-client/java/blob/master/kubernetes/docs/CustomObjectsApi.md#deletenamespacedcustomobject
 *
 * @param {*} body
 * @param {*} name
 * @param {*} group
 * @param {*} version
 * @param {*} plural
 * @param {*} namespace
 */
async function deleteNamespacedCustomObject(name, group, version, plural, namespace) {
  try {
    logger.debug(`Kubectl: deleteNamespacedCustomObject name:${name}`);
    await customApi.deleteNamespacedCustomObject(group, version, namespace, plural, name);
  } catch (error) {
    throw new KubectlRequestError(error.body.message)
  }
}

/**
 *
 * @param {*} group
 * @param {*} version
 * @param {*} plural
 * @param {*} namespace
 */
async function listNamespacedCustomObject(group, version, plural, namespace) {
  let objects = [];
  try {
    const result = await customApi.listNamespacedCustomObject(group, version, namespace, plural);
    for (const object of result.body.items) {
      // console.log(JSON.stringify(object, null, 2));
    }
  } catch (error) {
    throw error;
  }
  return objects;
}

/**
 * See https://github.com/kubernetes-client/javascript/blob/8fdfb52cc035c1fba7acd1ed520fb04aa1207a88/src/gen/model/v1Job.ts
 *
 * @param {*} name
 * @param {*} image
 * @param {*} command
 */
function createV1JobConfig(name, image, command) {
  const job = new k8s.V1Job();
  job.apiVersion = 'batch/v1';
  job.kind = 'Job';
  const metadata = new k8s.V1ObjectMeta();
  metadata.name = name;
  const spec = new k8s.V1JobSpec();
  const template = new k8s.V1PodTemplateSpec();
  const pod = new k8s.V1PodSpec();
  const container = new k8s.V1Container();
  container.image = image;
  container.name = name;
  container.command = command;
  pod.containers = [container];
  pod.restartPolicy = "Never";
  template.spec = pod;
  spec.template = template;
  spec.backoffLimit = 0;
  spec.ttlSecondsAfterFinished = 60;
  job.metadata = metadata;
  job.spec = spec;
  return job;
}

/**
 * See https://github.com/kubernetes-client/javascript/blob/8fdfb52cc035c1fba7acd1ed520fb04aa1207a88/src/gen/model/v1CronJob.ts
 *
 * @param {*} name
 * @param {*} image
 * @param {*} command
 * @returns
 */
 function createV1CronJobConfig(name, image, command) {
  const job = new k8s.V1CronJob();
  job.apiVersion = 'batch/v1';
  job.kind = 'CronJob';
  const metadata = new k8s.V1ObjectMeta();
  metadata.name = name;
  const spec = new k8s.V1CronJobSpec();
  const jobTemplate = new k8s.V1JobTemplateSpec();
  const template = new k8s.V1PodTemplateSpec();
  const pod = new k8s.V1PodSpec();
  const container = new k8s.V1Container();
  jobTemplate.spec = spec;
  container.image = image;
  container.name = name;
  container.command = command;
  // Patch (openshift) - should be a function
  let securityContext = new k8s.V1SecurityContext();
  securityContext.privileged = true;
  container.securityContext = securityContext;
  pod.containers = [container];
  pod.restartPolicy = "Never";
  template.spec = pod;
  spec.template = template;
  spec.backoffLimit = 0;
  spec.failedJobsHistoryLimit = 1;
  spec.successfulJobsHistoryLimit = 1;
  spec.concurrencyPolicy = "Forbid";
  job.metadata = metadata;
  job.spec = { jobTemplate };
  return job;
}

/**
 *
 * @param {*} job Job / CronJob
 * @param {*} secret
 */
function jobAddImagePullSecret(job, secret) {
  const spec = (job.kind === 'Job') ? job.spec : job.spec.jobTemplate.spec;
  const reference = new k8s.V1LocalObjectReference();
  reference.name = secret;
  spec.template.spec.imagePullSecrets = [reference]
  return job;
}

/**
 *
 * @param {*} job Job / CronJob
 * @param {*} name
 */
function jobAddEnvFromConfigMap(job, name) {
  const spec = (job.kind === 'Job') ? job.spec : job.spec.jobTemplate.spec;
  const envfrom = spec.template.spec.containers[0].envFrom || [];
  const source = new k8s.V1EnvFromSource()
  const configmap = new k8s.V1ConfigMapEnvSource();
  configmap.name = name;
  source.configMapRef = configmap;
  envfrom.push(source);
  spec.template.spec.containers[0].envFrom = envfrom;
  return job;
}

/**
 *
 * @param {*} job Job / CronJob
 * @param {*} name
 */
 function jobAddEnvFromSecrets(job, name) {
  const spec = (job.kind === 'Job') ? job.spec : job.spec.jobTemplate.spec;
  const envfrom = spec.template.spec.containers[0].envFrom || [];
  const source = new k8s.V1EnvFromSource()
  const secrets = new k8s.V1SecretEnvSource();
  secrets.name = name;
  source.secretRef = secrets;
  envfrom.push(source);
  spec.template.spec.containers[0].envFrom = envfrom;
  return job;
}

/**
 *
 * @param {*} job CronJob
 * @param {*} schedule https://en.wikipedia.org/wiki/Cron
 */
function jobSetSchedule(job, schedule) {
  if (job.kind === 'CronJob') {
    job.spec.schedule = schedule;
  }
  return job;
}

/**
 *
 * @param {*} job
 * @param {*} name
 * @param {*} claim
 * @returns
 */
function jobAddVolume(job, name, claim) {
  const spec = (job.kind === 'Job') ? job.spec : job.spec.jobTemplate.spec;
  const volume = new k8s.V1Volume();
  const volumeClaim = new k8s.V1PersistentVolumeClaimVolumeSource();
  volumeClaim.claimName = claim;
  volume.name = name;
  volume.persistentVolumeClaim = volumeClaim;
  spec.template.spec.volumes = [volume];
  return job;
}

/**
 *
 * @param {*} job
 * @param {*} name
 * @param {*} path
 */
function jobAddVolumeMount(job, name, path) {
  const spec = (job.kind === 'Job') ? job.spec : job.spec.jobTemplate.spec;
  const container = spec.template.spec.containers[0];
  const volumeMount = new k8s.V1VolumeMount();
  volumeMount.name = name;
  volumeMount.mountPath = path;
  container.volumeMounts = [volumeMount];
  return job;
}

/**
 *
 * @param {*} job
 * @param {*} seconds
 * @returns
 */
function jobTtl(job, seconds) {
  const spec = (job.kind === 'Job') ? job.spec : job.spec.jobTemplate.spec;
  spec.ttlSecondsAfterFinished = seconds;
  return job;
}

/**
 *
 * @param {*} job
 * @param {*} limit
 * @returns
 */
function jobBackoffLimit(job, limit = 6) {
  const spec = (job.kind === 'Job') ? job.spec : job.spec.jobTemplate.spec;
  spec.backoffLimit = limit;
  return job;
}

/**
 *
 * @param {*} job
 * @param {*} name
 * @param {*} claim
 * @returns
 */
function jobAddServiceAccountName(job, name) {
  const spec = (job.kind === 'Job') ? job.spec : job.spec.jobTemplate.spec;
  const pod = spec.template.spec;
  pod.serviceAccountName = name;
  return job;
}

/**
 * See https://github.com/kubernetes-client/java/blob/master/kubernetes/docs/BatchV1Api.md#createnamespacedjob
 *     https://github.com/kubernetes-client/javascript/blob/8fdfb52cc035c1fba7acd1ed520fb04aa1207a88/src/gen/api/batchV1Api.ts#L205
 *
 * @param {*} namespace
 * @param {*} body
 */
async function createNamespacedJob(job, namespace) {
  try {
    logger.debug(`Kubectl: createNamespacedJob ${JSON.stringify(job)}`);
    return await batchV1Api.createNamespacedJob(namespace, job);
  } catch (error) {
    throw new KubectlRequestError(error.body.message)
  }
}

/**
 * See https://github.com/kubernetes-client/java/blob/master/kubernetes/docs/BatchV1Api.md#deletenamespacedjob
 *     https://github.com/kubernetes-client/javascript/blob/8fdfb52cc035c1fba7acd1ed520fb04aa1207a88/src/gen/api/batchV1Api.ts#L676
 *
 * @param {*} name
 * @param {*} namespace
 */
async function deleteNamespacedJob(name, gracePeriodSeconds = 0, namespace) {
  try {
    logger.debug(`Kubectl: deleteNamespacedJob ${name}`);
    return await batchV1Api.deleteNamespacedJob(name, namespace, undefined, undefined, gracePeriodSeconds);
  } catch (error) {
    throw new KubectlRequestError(error.body.message)
  }
}

/**
 * See https://github.com/kubernetes-client/java/blob/master/kubernetes/docs/BatchV1Api.md#listNamespacedJob
 *     https://github.com/kubernetes-client/javascript/blob/8fdfb52cc035c1fba7acd1ed520fb04aa1207a88/src/gen/api/batchV1Api.ts#L1197
 *
 * @param {*} namespace
 */
async function listNamespacedJob(namespace) {
  try {
    const result = await batchV1Api.listNamespacedJob(namespace);
    return result.body.items || [];
  } catch (error) {
    throw error;
  }
}

/**
 * See https://github.com/kubernetes-client/java/blob/master/kubernetes/docs/BatchV1Api.md#createnamespacedcronjob
 *
 *
 * @param {*} namespace
 * @param {*} body
 */
 async function createNamespacedCronJob(job, namespace) {
  try {
    logger.debug(`Kubectl: createNamespacedCronJob ${JSON.stringify(job)}`);
    return await batchV1Api.createNamespacedCronJob(namespace, job);
  } catch (error) {
    throw new KubectlRequestError(error.body.message)
  }
}

/**
 * See https://github.com/kubernetes-client/java/blob/master/kubernetes/docs/BatchV1Api.md#deletenamespacedcronjob
 *
 * @param {*} name
 * @param {*} namespace
 */
async function deleteNamespacedCronJob(name, namespace) {
  try {
    logger.debug(`Kubectl: deleteNamespacedCronJob name:${name}`);
    const result = await batchV1Api.deleteNamespacedCronJob(name, namespace);
  } catch (error) {
    throw new KubectlRequestError(error.body.message)
  }
}

/**
 * See https://github.com/kubernetes-client/javascript/blob/8fdfb52cc035c1fba7acd1ed520fb04aa1207a88/src/gen/api/batchV1Api.ts#L1076
 *
 * @param {String} namespace
 * @returns
 */
async function listNamespacedCronJob(namespace) {
  try {
    const result = await batchV1Api.listNamespacedCronJob(namespace);
    return result.body.items || [];
  } catch (error) {
    throw error;
  }
}

/**
 *
 * @param {String} namespace
 * @returns
 */
async function listNamespacedConfigMap(namespace) {
  try {
    const result = await coreV1Api.listNamespacedConfigMap(namespace);
    return result.body.items || [];
  } catch (error) {
    throw error;
  }
}

/**
 *
 * @param {String} namespace
 * @returns
 */
async function listNamespacedSecret(namespace) {
  try {
    const result = await coreV1Api.listNamespacedSecret(namespace);
    return result.body.items || [];
  } catch (error) {
    throw error;
  }
}

/**
 * Returns pod logs
 *
 * @param {String} namespace - Pod namespace
 * @param {String} pod - Pod name
 * @param {String} container - Container name
 */
function getNamespacedPodLogs(namespace, pod, container) {
  return new Promise(async (resolve, reject) => {
    let logs = '';

    const logStream = new stream.PassThrough();
    logStream.on('data', (chunk) => {
      logs += chunk.toString();
    });
    logStream.on('error', (err) => {
      reject(err)
    });
    logStream.on('end', () => {
      resolve(logs)
    });

    await log.log(namespace, pod, container, logStream, {
      follow: false,
      tailLines: 100,
      pretty: false,
      timestamps: false,
    });
  });
}

module.exports = {
  listNamespacedConfigMap,
  listNamespacePod,
  deleteNamespacedPod,
  getNamespacedPodLogs,
  listNamespacedDeployment,
  listNamespacedSecret,
  listNamespacedCustomObject,
  createNamespacedCustomObject,
  replaceNamespacedCustomObject,
  patchNamespacedCustomObject,
  getNamespacedCustomObject,
  deleteNamespacedCustomObject,
  createNamespacedJob,
  deleteNamespacedJob,
  listNamespacedJob,
  createNamespacedCronJob,
  deleteNamespacedCronJob,
  listNamespacedCronJob,
  createV1JobConfig,
  createV1CronJobConfig,
  jobAddImagePullSecret,
  jobAddEnvFromConfigMap,
  jobAddEnvFromSecrets,
  jobSetSchedule,
  jobAddVolume,
  jobAddVolumeMount,
  jobAddServiceAccountName,
  jobTtl,
  jobBackoffLimit,
}
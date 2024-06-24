/* Copyright contributors to the Kmodels project */

"use strict";

const {logger} = require("./logger");

/**
 * Values to fill
 *
 *   __name__
 *   __component__
 *
 */
const inferenceGraphResource = {
  "apiVersion": "serving.kserve.io/v1alpha1",
  "kind": "InferenceGraph",
  "metadata":{
    "name": "__name__",
    "labels": {
      "component": "__component__"
    }
  },
  "spec": {
    "nodes": {
    }
  }
};

/**
 * Add annotation
 *
 * @param {*} resource
 * @param {*} key Annotation key
 * @param {*} value Annotation value
 */
function addAnnotation(resource, key, value) {
  resource.metadata.annotations = resource.metadata.annotations || {};
  resource.metadata.annotations[key] = value;
}

/**
 * Add anotations
 *
 * @param {*} resource
 * @param {*} annotations Dict of anotations { ke1: value1, key2: value2 }
 */
function addAnnotations(resource, annotations) {
  for (const key in annotations) {
    addAnnotation(resource, key, annotations[key]);
  }
}

/**
 *
 * @param {*} graph
 * @param {*} id
 * @returns
 */
function buildSplitter(graph, id) {
  const resource = JSON.parse(JSON.stringify(inferenceGraphResource));
  resource.metadata.name = id;
  resource.metadata.labels.component = 'splitter';
  resource.spec.nodes = {
    root: {
      routerType: "Splitter",
      steps: graph.nodes.map(model => { return {
        serviceName: model.id,
        weight: model.weight
      }})
    }
  };
  return resource;
}

/**
 *
 * @param {*} graph
 * @param {*} id
 */
function buildEnsemble(graph, id) {
  const resource = JSON.parse(JSON.stringify(inferenceGraphResource));
  resource.metadata.name = id;
  resource.metadata.labels.component = 'ensemble';
  resource.spec.nodes = {
    root: {
      routerType: "Ensemble",
      steps: graph.nodes.map(model => { return {
        serviceName: model.id,
        name: model.name
      }})
    }
  };
  return resource;
}

/**
 *
 * @param {*} template
 * @param {*} id
 * @returns
 */
function build(template, id) {
  let resource;
  if (template.type === 'splitter') {
    resource = buildSplitter(template, id);
  } else if (template.type === 'ensemble') {
    resource = buildEnsemble(template, id);
  }
  return resource;
}

module.exports = {
  build,
  addAnnotations,
}
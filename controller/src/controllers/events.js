
"use strict";

const model = require("../models/model");
const runs = require("./runs");
const metadata = require("../services/metadata");
const {logger} = require("./logger");

/**
 * Handle pipeline succeeded event
 *
 * @param {Object} event
 */
async function onPipelineSucceeded(event) {
  const meta = await metadata.read(event.id);
  if (meta.pipeline.run) {
    const status = await runs.status(meta.pipeline.run);
    if (status === 'succeeded') {
      await model.archive(event.id);
      await model.serve(event.id);
    }
  }
}

/**
 *
 * @param {Object} event
 */
async function onConnectorSucceeded(event) {
  const meta = await metadata.read(event.id);
  if (meta.template.trainable) {
    await model.train(event.id);
  } else {
    await model.serve(event.id);
  }
}

/**
 *
 * @param {Object} event
 */
async function onPredictorRunning(event) {
  await model.ready(event.id, event.ready === 'true');
}

/**
 *
 * @param {Object} event
 */
async function onSplitterRunning(event) {
  await model.ready(event.id, event.ready === 'true');
}

/**
 *
 * @param {Object} event
 */
async function onEnsembleRunning(event) {
  await model.ready(event.id, event.ready === 'true');
}

/**
 * Handle events received from watcher. In some case, e.g., after model delete, we
 * might receive events after model resources has been deleted.
 *
 * @param {Object} event Event to handle.
 */
async function handle(event) {
  logger.debug(`${JSON.stringify(event)}`, {module: 'Events'});
  if (model.exists(event.id)) {
    await model.state(event.id, event.component, event.status);
    if (event.component === 'pipeline') {
      if (event.type === 'modified') {
        if (event.status === 'succeeded') {
          await onPipelineSucceeded(event);
        }
      }
    } else if (event.component === 'connector') {
      if (event.type === 'deleted') {
        if (event.status === 'succeeded') {
          await onConnectorSucceeded(event);
        }
      }
    } else if (event.component === 'predictor') {
      if ((event.type === 'modified') || (event.type === 'added')) {
        if (event.status === 'running') {
          await onPredictorRunning(event);
        }
      }
    } else if (event.component === 'splitter') {
      if (event.type === 'modified') {
        if (event.status === 'running') {
          await onSplitterRunning(event);
        }
      }
    } else if (event.component === 'ensemble') {
      if (event.type === 'modified') {
        if (event.status === 'running') {
          await onEnsembleRunning(event);
        }
      }
    }
  } else {
    if (event.component === 'predictor') {
      if (event.type === 'deleted') {
        // Ignore, model already deleted
      }
    } else if (event.component === 'splitter') {
      if (event.type === 'deleted') {
        // Ignore, model already deleted
      }
    } else if (event.component === 'ensemble') {
      if (event.type === 'deleted') {
        // Ignore, model already deleted
      }
    } else {
      logger.warn(`Receive event for non existing model ${event.id}`);
    }
  }
}

module.exports = {
  handle,
}
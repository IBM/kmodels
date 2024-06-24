/* Copyright contributors to the Kmodels project */

"use strict";

const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const jsYaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');
const bodyParser = require('body-parser');
const constants = require("./constants");
const handlers = require('./handlers');
const {logger} = require("./logger");

const app = express();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(jsYaml.load(fs.readFileSync('./api/openapi.yaml'))));
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

app.get('/api/v1/version', async (req, res, next) => {
  const result = await handlers.getVersion({
  })
  res.status(result.status).send(result.body);
})

app.post('/api/v1/sync', async (req, res, next) => {
  const result = await handlers.postSync({
  })
  res.status(result.status).send(result.body);
})

app.post('/api/v1/model', async (req, res, next) => {
  const result = await handlers.postModel({
    template: req.query.template,
    version: req.query.version,
    id: req.query.id,
    tags: req.query.tags,
    configuration: req.body,
  });
  res.status(result.status).send(result.body);
})

app.get('/api/v1/model/:id', async (req, res, next) => {
  const result = await handlers.getModel({
    id: req.params.id,
  });
  res.status(result.status).send(result.body);
})

app.delete('/api/v1/model/:id', async (req, res, next) => {
  const result = await handlers.deleteModel({
    id: req.params.id,
  });
  res.status(result.status).send(result.body);
})

app.post('/api/v1/model/:id/infer/predict', async (req, res, next) => {
  const result = await handlers.postModelInferPredict({
    id: req.params.id,
    body: req.body,
    cache: req.query.cache,
  });
  res.status(result.status).send(result.body);
})

app.post('/api/v1/model/:id/infer/explain', async (req, res, next) => {
  const result = await handlers.postModelInferExplain({
    id: req.params.id,
    body: req.body,
    cache: req.query.cache,
  });
  res.status(result.status).send(result.body);
})

app.post('/api/v1/model/:id/feedback', async (req, res, next) => {
  const result = await handlers.postModelFeedback({
    id: req.params.id,
    body: req.body,
  });
  res.status(result.status).send(result.body);
})

app.get('/api/v1/model/:id/feedback', async (req, res, next) => {
  const result = await handlers.getModelFeedback({
    id: req.params.id,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    page: req.query.pageNumber,
    size: req.query.pageSize,
  });
  res.status(result.status).send(result.body);
})

app.delete('/api/v1/model/:id/feedback', async (req, res, next) => {
  const result = await handlers.deleteModelFeedback({
    id: req.params.id,
  });
  res.status(result.status).send(result.body);
})

app.get('/api/v1/models', async (req, res, next) => {
  const result = await handlers.getModels({
    tags: req.query.tags,
  });
  res.status(result.status).send(result.body);
})

app.post('/api/v1/model/:id/retrain', async (req, res, next) => {
  const result = await handlers.postModelRetrain({
    id: req.params.id,
  });
  res.status(result.status).send(result.body);
})

app.get('/api/v1/model/:id/ready', async (req, res, next) => {
  const result = await handlers.getModelReady({
    id: req.params.id,
  })
  res.status(result.status).send(result.body);
})

app.post('/api/v1/model/:id/restore', async (req, res, next) => {
  const result = await handlers.postModelRestore({
    id: req.params.id,
    build: req.query.build,
  });
  res.status(result.status).send(result.body);
})

app.post('/api/v1/graph/splitter', async (req, res, next) => {
  const result = await handlers.postGraphSplitter({
    id: req.query.id,
    body: req.body,
  });
  res.status(result.status).send(result.body);
})

app.put('/api/v1/graph/splitter', async (req, res, next) => {
  const result = await handlers.putGraphSplitter({
    id: req.query.id,
    body: req.body,
  });
  res.status(result.status).send(result.body);
})

app.post('/api/v1/graph/ensemble', async (req, res, next) => {
  const result = await handlers.postGraphEnsemble({
    id: req.query.id,
    body: req.body,
  });
  res.status(result.status).send(result.body);
})

app.put('/api/v1/graph/ensemble', async (req, res, next) => {
  const result = await handlers.putGraphEnsemble({
    id: req.query.id,
    body: req.body,
  });
  res.status(result.status).send(result.body);
})

app.get('/api/v1/store/templates', async (req, res, next) => {
  const result = await handlers.getStoreTemplates({
  });
  res.status(result.status).send(result.body);
})

app.get('/api/v1/store/template/:name/info', async (req, res, next) => {
  res.send(await handlers.getStoreTemplateInfo({
    name: req.params.name,
  }))
})

app.post('/api/v1/event/:type', async (req, res, next) => {
  res.send(await handlers.postEvent({
    type: req.params.type,
    event: req.body,
  }))
})

app.get('/api/v1/debug', async (req, res, next) => {
  const result = await handlers.getDebug({
  });
  res.status(result.status).send(result.body);
})

const httpServer = http.createServer(app);

const httpHostname = process.env.HOSTNAME || "0.0.0.0";
const httpPort = process.env.PORT || constants.PORT;

logger.info(`start ${httpHostname}:${httpPort}`, {module: "Server"});
httpServer.listen(httpPort, httpHostname, () => {
  logger.info(`starting on port ${httpPort}`, {module: 'Server'});
});
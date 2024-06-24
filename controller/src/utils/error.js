/* Copyright contributors to the Kmodels project */

"use strict";

class HttpRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class UnsupportedMediaTypeError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class InvalidFileTypeError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class KubectlRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class KfpError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class StoreError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class ModelError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

module.exports = {
  HttpRequestError,
  NotFoundError,
  UnsupportedMediaTypeError,
  InvalidFileTypeError,
  KubectlRequestError,
  KfpError,
  StoreError,
  ModelError,
};

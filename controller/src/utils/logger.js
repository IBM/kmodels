"use strict";

const winston = require('winston');
const DailyRotateFile = require("winston-daily-rotate-file");
const constants = require("./constants");

// Modules level / filtering
let loggerModules = {};

// Logging level, configurable
const level = process.env.LOG_LEVEL || constants.LOG_LEVEL;

// Message formatting
const formatter = winston.format.printf(({ level, message, timestamp, id, user, module }) => {
  if (id) {
    return `${timestamp} ${level.substring(0, 1)}: ${module}: ${message} ${id} ${user || ''}`;
  } else if (module) {
    return `${timestamp} ${level.substring(0, 1)}: ${module}: ${message}`;
  } else {
    return `${timestamp} ${level.substring(0, 1)}: ${message}`;
  }
});

// Log customization
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  formatter
);

// Define which transports the logger must use to print out messages.
const transports = [
  // Print messages to console
  new winston.transports.Console({}),
  // Error messages got to error file
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  // All daily logs
  new winston.transports.DailyRotateFile({
    filename: "controller-%DATE%.log",
    dirname: "logs",
    datePattern: "YYYY-MM-DD-HH",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "7d"
  })
];

// The logger
const logger = winston.createLogger({
  level,
  format,
  transports,
})

/**
 * Log message base on module settings
 *
 * @param {Object} data
 */
function log(data) {
  const levels = winston.config.npm.levels;
  if (data.module && loggerModules[data.module]) {
    if (levels[data.level] <= levels[loggerModules[data.module].level]) {
      logger.log(data);
    }
  } else {
    logger.log(data);
  }
}

/**
 * Log info level
 *
 * @param {String} message
 * @param  {...any} meta
 */
function info(message, ...meta) {
  log({level: 'info', message, ...meta[0]})
}

/**
 * Log  debug level
 *
 * @param {String} message
 * @param  {...any} meta
 */
function debug(message, ...meta) {
  log({level: 'debug', message, ...meta[0]})
}

/**
 * Log warn level
 *
 * @param {String} message
 * @param  {...any} meta
 */
function warn(message, ...meta) {
  log({level: 'warn', message, ...meta[0]})
}

/**
 * Log error level
 *
 * @param {String} message
 * @param  {...any} meta
 */
function error(message, ...meta) {
  log({level: 'error', message, ...meta[0]})
}

/**
 * Set logger modules configuration (level, filter etc.)
 *
 * @param {Object} modules
 */
function setModules(modules) {
  logger.info(`set modules ${JSON.stringify(modules)}`, {module: 'Logger'});
  loggerModules = modules;
}

/**
 *
 * @returns
 */
function getModules() {
  return loggerModules
}

module.exports = {
  logger,
  log,
  info,
  debug,
  warn,
  error,
  setModules,
  getModules,
};

/**
 * Winston-based structured logging utilities
 */

import winston from 'winston';
import { LogMetadata } from './types';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: process.env.SERVICE_NAME || 'qe-mcp-service' },
  transports: [new winston.transports.Console()],
});

if (process.env.LOG_TO_FILE === 'true') {
  const logPath = process.env.LOG_FILE_PATH || './logs';
  logger.add(
    new winston.transports.File({
      filename: `${logPath}/error.log`,
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: `${logPath}/combined.log`,
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}

export function logError(message: string, meta?: LogMetadata): void {
  logger.error(message, meta);
}

export function logWarn(message: string, meta?: LogMetadata): void {
  logger.warn(message, meta);
}

export function logInfo(message: string, meta?: LogMetadata): void {
  logger.info(message, meta);
}

export function logDebug(message: string, meta?: LogMetadata): void {
  logger.debug(message, meta);
}

export function httpLogger() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.http('HTTP Request', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        requestId: req.id || req.headers['x-request-id'],
      });
    });
    next();
  };
}

export function requestId() {
  return (req: any, res: any, next: any) => {
    req.id = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', req.id);
    next();
  };
}

export function logException(error: Error, context?: LogMetadata): void {
  logger.error('Unhandled Exception', {
    error: { name: error.name, message: error.message, stack: error.stack },
    ...context,
  });
}

export default logger;

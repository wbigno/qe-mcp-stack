/**
 * Environment configuration and validation
 */

import dotenv from 'dotenv';
import Joi from 'joi';
import { EnvironmentConfig, ValidationError } from './types';

dotenv.config();

export function getConfig(): EnvironmentConfig {
  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  };
}

export function validateConfig(schema: Joi.ObjectSchema): EnvironmentConfig {
  const config = getConfig();
  const { error, value } = schema.validate(config, { allowUnknown: true });
  
  if (error) {
    throw new ValidationError(`Config validation error: ${error.message}`);
  }
  
  return value;
}

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

export function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

export function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

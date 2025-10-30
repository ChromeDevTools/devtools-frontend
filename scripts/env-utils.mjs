// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

// Make sure that the file exist else the `loadEnvFile`
// throws an error
if (existsSync('.env')) {
  // Side-effect of importing this file.
  loadEnvFile();
}

/**
 *
 * @param {string} variable
 * @param {boolean} fallback
 * @returns {boolean}
 */
export function getEnvBoolean(variable, fallback) {
  if (process.env[variable] === 'true') {
    return true;
  }
  if (process.env[variable] === 'false') {
    return false;
  }
  return fallback;
}

/**
 * @param {string} variable
 * @param {string} fallback
 */
export function getEnvString(variable, fallback) {
  if (process.env[variable]) {
    return process.env[variable];
  }
  return fallback;
}

/**
 * Default env that we expect to exist in the .env config
 */
export const ENV = {
  BROWSER: 'DEVTOOLS_BROWSER',
  UNSTABLE_FEATURES: 'DEVTOOLS_UNSTABLE_FEATURES',
  ENABLE_FEATURES: 'DEVTOOLS_ENABLE_FEATURES',
  DISABLE_FEATURES: 'DEVTOOLS_DISABLE_FEATURES',
  AUTO_OPEN_DEVTOOLS: 'DEVTOOLS_AUTO_OPEN_DEVTOOLS',
  TARGET: 'DEVTOOLS_TARGET',
  USER_DATA_DIR: 'DEVTOOLS_USER_DATA_DIR'
};

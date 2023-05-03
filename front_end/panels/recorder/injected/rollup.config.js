// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {terser} = require('../../../../node_modules/rollup-plugin-terser/rollup-plugin-terser.js');

/**
 * Checks if an env variable is true.
 * @param {string|undefined} envVar
 * @returns Whether the flag is 'true' or not.
 */
function isEnvVarTrue(envVar) {
  return envVar === 'true';
}

// eslint-disable-next-line import/no-default-export
export default {
  treeshake: false,
  output: [{format: 'iife'}],
  plugins: !isEnvVarTrue(process.env.DEBUG_INJECTED) ? [terser()] : []
};

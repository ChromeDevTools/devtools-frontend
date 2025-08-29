// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import terser from '@rollup/plugin-terser';

/**
 * Checks if an env variable is true.
 * @param envVar
 * @returns Whether the flag is 'true' or not.
 */
function isEnvVarTrue(envVar) {
  return envVar === 'true';
}

export default {
  treeshake: true,
  output: [{format: 'iife'}],
  plugins: isEnvVarTrue(process.env.DEBUG_INJECTED) ? [] : [terser()]
};

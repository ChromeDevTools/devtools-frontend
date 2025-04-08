// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import util from 'node:util';

import {
  autoninjaExecutablePath,
  gnExecutablePath,
  rootPath,
} from './devtools_paths.js';

const execFile = util.promisify(childProcess.execFile);

/**
 * Representation of the feature set that is configured for Chrome. This
 * keeps track of enabled and disabled features and generates the correct
 * combination of `--enable-features` / `--disable-features` command line
 * flags.
 *
 * There are unit tests for this in `./devtools_build.test.mjs`.
 */
export class FeatureSet {
  #disabled = new Set();
  #enabled = new Map();

  /**
   * Disables the given `feature`.
   *
   * @param {string} feature the name of the feature to disable.
   */
  disable(feature) {
    this.#disabled.add(feature);
    this.#enabled.delete(feature);
  }

  /**
   * Enables the given `feature`, and optionally adds the `parameters` to it.
   * For example:
   * ```js
   * featureSet.enable('DevToolsFreestyler', {patching: true});
   * ```
   * The parameters are additive.
   *
   * @param {string} feature the name of the feature to enable.
   * @param {object} parameters the additional parameters to pass to it, in
   *                            the form of key/value pairs.
   */
  enable(feature, parameters = {}) {
    this.#disabled.delete(feature);
    if (!this.#enabled.has(feature)) {
      this.#enabled.set(feature, Object.create(null));
    }
    for (const [key, value] of Object.entries(parameters)) {
      this.#enabled.get(feature)[key] = value;
    }
  }

  /**
   * Merge the other `featureSet` into this.
   *
   * @param featureSet the other `FeatureSet` to apply.
   */
  merge(featureSet) {
    for (const feature of featureSet.#disabled) {
      this.disable(feature);
    }
    for (const [feature, parameters] of featureSet.#enabled) {
      this.enable(feature, parameters);
    }
  }

  /**
   * Yields the command line parameters to pass to the invocation of
   * a Chrome binary for achieving the state of the feature set.
   */
  *[Symbol.iterator]() {
    const disabledFeatures = [...this.#disabled];
    if (disabledFeatures.length) {
      yield `--disable-features=${disabledFeatures.sort().join(',')}`;
    }
    const enabledFeatures = [...this.#enabled].map(([feature, parameters]) => {
      parameters = Object.entries(parameters);
      if (parameters.length) {
        parameters = parameters.map(([key, value]) => `${key}/${value}`);
        feature = `${feature}:${parameters.sort().join('/')}`;
      }
      return feature;
    });
    if (enabledFeatures.length) {
      yield `--enable-features=${enabledFeatures.sort().join(',')}`;
    }
  }

  static parse(text) {
    const features = [];
    for (const str of text.split(',')) {
      const parts = str.split(':');
      if (parts.length < 1 || parts.length > 2) {
        throw new Error(`Invalid feature declaration '${str}'`);
      }
      const feature = parts[0];
      const parameters = Object.create(null);
      if (parts.length > 1) {
        const args = parts[1].split('/');
        if (args.length % 2 !== 0) {
          throw new Error(
            `Invalid parameters '${parts[1]}' for feature ${feature}`,
          );
        }
        for (let i = 0; i < args.length; i += 2) {
          const key = args[i + 0];
          const value = args[i + 1];
          parameters[key] = value;
        }
      }
      features.push({ feature, parameters });
    }
    return features;
  }
}

export const BuildStep = {
  GN: 'gn-gen',
  AUTONINJA: 'autoninja',
};

export class BuildError extends Error {
  /**
   * Constructs a new `BuildError` with the given parameters.
   *
   * @param {BuildStep} step the build step that failed.
   * @param {Object} options additional options for the `BuildError`.
   * @param {Error} options.cause the actual cause for the build error.
   * @param {string} options.outDir the absolute path to the `target` out directory.
   * @param {string} options.target the target relative to `//out`.
   */
  constructor(step, options) {
    const { cause, outDir, target } = options;
    super(`Failed to build target ${target} in ${outDir}`, { cause });
    this.name = 'BuildError';
    this.step = step;
    this.target = target;
    this.outDir = outDir;
  }

  toString() {
    const { stdout } = this.cause;
    return stdout;
  }
}

/**
 * @typedef BuildResult
 * @type {object}
 * @property {number} time - wall clock time (in seconds) for the build.
 */

/**
 * @param {string} target
 * @return {Promise<void>}
 */
export async function prepareBuild(target) {
  const outDir = path.join(rootPath(), 'out', target);

  // Prepare the build directory first.
  const outDirStat = await fs.stat(outDir).catch(() => null);
  if (!outDirStat?.isDirectory()) {
    // Use GN to (optionally create and) initialize the |outDir|.
    try {
      const gnExe = gnExecutablePath();
      const gnArgs = ['-q', 'gen', outDir];
      await execFile(gnExe, gnArgs);
    } catch (cause) {
      throw new BuildError(BuildStep.GN, { cause, outDir, target });
    }
  }
}

/**
 * @param {string} target
 * @param {AbortSignal=} signal
 * @return {Promise<BuildResult>} a `BuildResult` with statistics for the build.
 */
export async function build(target, signal) {
  const startTime = performance.now();
  const outDir = path.join(rootPath(), 'out', target);

  // Build just the devtools-frontend resources in |outDir|. This is important
  // since we might be running in a full Chromium checkout and certainly don't
  // want to build all of Chromium first.
  try {
    const autoninjaExe = autoninjaExecutablePath();
    const autoninjaArgs = ['-C', outDir, '--quiet', 'devtools_all_files'];
    await execFile(autoninjaExe, autoninjaArgs, { signal });
  } catch (cause) {
    if (cause.name === 'AbortError') {
      throw cause;
    }
    throw new BuildError(BuildStep.AUTONINJA, { cause, outDir, target });
  }

  // Report the build result.
  const time = (performance.now() - startTime) / 1000;
  return { time };
}

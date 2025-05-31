// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import util from 'node:util';

import {
  autoninjaPyPath,
  gnPyPath,
  isInChromiumDirectory,
  rootPath,
  vpython3ExecutablePath,
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
  * [Symbol.iterator]() {
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
    if (!text) {
      return [];
    }
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
      features.push({feature, parameters});
    }
    return features;
  }
}

/**
 * Constructs a human readable error message for the given build `error`.
 *
 * @param {Error} error the `Error` from the failed `autoninja` invocation.
 * @param {string} outDir the absolute path to the `target` out directory.
 * @param {string} target the targe relative to `//out`.
 * @return {string} the human readable error message.
 */
function buildErrorMessageForNinja(error, outDir, target) {
  const {message, stderr, stdout} = error;
  if (stderr) {
    // Anything that went to stderr has precedence.
    return `Failed to build \`${target}' in \`${outDir}'
${stdout}
${stderr}
`;
  }
  if (stdout) {
    // Check for `tsc` or `esbuild` errors in the stdout.
    const tscErrors = [...stdout.matchAll(/^[^\s].*\(\d+,\d+\): error TS\d+:\s+.*$/gm)].map(([tscError]) => tscError);
    if (!tscErrors.length) {
      // We didn't find any `tsc` errors, but maybe there are `esbuild` errors.
      // Transform these into the `tsc` format (with a made up error code), so
      // we can report all TypeScript errors consistently in `tsc` format (which
      // is well-known and understood by tools).
      const esbuildErrors = stdout.matchAll(/^✘ \[ERROR\] ([^\n]+)\n\n\s+\.\.\/\.\.\/(.+):(\d+):(\d+):/gm);
      for (const [, message, filename, line, column] of esbuildErrors) {
        tscErrors.push(`${filename}(${line},${column}): error TS0000: ${message}`);
      }
    }
    if (tscErrors.length) {
      return `TypeScript compilation failed for \`${target}'

${tscErrors.join('\n')}
`;
    }

    // At the very least we strip `ninja: Something, something` lines from the
    // standard output, since that's not particularly helpful.
    const output = stdout.replaceAll(/^ninja: [^\n]+\n+/mg, '').trim();
    return `Failed to build \`${target}' in \`${outDir}'

${output}
`;
  }
  return `Failed to build \`${target}' in \`${outDir}' (${message.substring(0, message.indexOf('\n'))})`;
}

export const BuildStep = {
  GN: 'gn',
  AUTONINJA: 'autoninja',
};

export class BuildError extends Error {
  /**
   * Constructs a new `BuildError` with the given parameters.
   *
   * @param {keyof BuildStep} step the build step that failed.
   * @param {Object} options additional options for the `BuildError`.
   * @param {Error} options.cause the actual cause for the build error.
   * @param {string} options.outDir the absolute path to the `target` out directory.
   * @param {string} options.target the target relative to `//out`.
   */
  constructor(step, options) {
    const {cause, outDir, target} = options;
    const message = step === BuildStep.GN ? `\`gn' failed to initialize out directory ${outDir}` :
                                            buildErrorMessageForNinja(cause, outDir, target);
    super(message, {cause});
    this.step = step;
    this.name = 'BuildError';
    this.target = target;
    this.outDir = outDir;
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
      const gnExe = vpython3ExecutablePath();
      const gnArgs = [gnPyPath(), '-q', 'gen', outDir];
      await execFile(gnExe, gnArgs);
    } catch (cause) {
      throw new BuildError(BuildStep.GN, {cause, outDir, target});
    }
  }
}

/** @type Map<string, Promise<Map<string, string>>> */
const gnArgsCache = new Map();

function gnArgsForTarget(target) {
  let gnArgs = gnArgsCache.get(target);
  if (!gnArgs) {
    gnArgs = (async () => {
      const outDir = path.join(rootPath(), 'out', target);
      try {
        const cwd = rootPath();
        const gnExe = vpython3ExecutablePath();
        const gnArgs = [gnPyPath(), '-q', 'args', outDir, '--json', '--list', '--short'];
        const {stdout} = await execFile(gnExe, gnArgs, {cwd});
        return new Map(JSON.parse(stdout).map(arg => [arg.name, arg.current?.value ?? arg.default?.value]));
      } catch {
        return new Map();
      }
    })();
    gnArgsCache.set(target, gnArgs);
  }
  return gnArgs;
}

/** @type Map<string, Map<string, Promise<Array<string>>>> */
const gnRefsCache = new Map();

function gnRefsForTarget(target, filename) {
  let gnRefsPerTarget = gnRefsCache.get(target);
  if (!gnRefsPerTarget) {
    gnRefsPerTarget = new Map();
    gnRefsCache.set(target, gnRefsPerTarget);
  }
  let gnRef = gnRefsPerTarget.get(filename);
  if (!gnRef) {
    gnRef = (async () => {
      const cwd = rootPath();
      const outDir = path.join(rootPath(), 'out', target);
      const gnExe = vpython3ExecutablePath();
      const gnArgs = [gnPyPath(), 'refs', outDir, '--as=output', filename];
      const {stdout} = await execFile(gnExe, gnArgs, {cwd});
      return stdout.trim().split('\n');
    })();
    gnRefsPerTarget.set(filename, gnRef);
  }
  return gnRef;
}

async function computeBuildTargetsForFiles(target, filenames) {
  if (filenames && filenames.length && filenames.every(filename => path.extname(filename) === '.css')) {
    if (isInChromiumDirectory().isInChromium) {
      filenames = filenames.map(filename => path.join('third_party', 'devtools-frontend', 'src', filename));
    }
    const gnArgs = await gnArgsForTarget(target);
    if (gnArgs.get('is_debug') === 'true') {
      try {
        const gnRefs = (await Promise.all(filenames.map(filename => gnRefsForTarget(target, filename)))).flat();
        if (gnRefs.length) {
          return gnRefs;
        }
      } catch (error) {
        console.error(error);
      }
    }
  }
  return ['devtools_all_files'];
}

/**
 * @param {string} target
 * @param {AbortSignal=} signal
 * @param {Array<string>=} filenames
 * @return {Promise<BuildResult>} a `BuildResult` with statistics for the build.
 */
export async function build(target, signal, filenames) {
  const startTime = performance.now();
  const outDir = path.join(rootPath(), 'out', target);

  // Build just the devtools-frontend resources in |outDir|. This is important
  // since we might be running in a full Chromium checkout and certainly don't
  // want to build all of Chromium first.
  const buildTargets = await computeBuildTargetsForFiles(target, filenames);
  try {
    const autoninjaExe = vpython3ExecutablePath();
    const autoninjaArgs = [autoninjaPyPath(), '-C', outDir, ...buildTargets];
    await execFile(autoninjaExe, autoninjaArgs, {signal});
  } catch (cause) {
    if (cause.name === 'AbortError') {
      throw cause;
    }
    throw new BuildError(BuildStep.AUTONINJA, {cause, outDir, target});
  }

  // Report the build result.
  const time = (performance.now() - startTime) / 1000;
  return {time};
}

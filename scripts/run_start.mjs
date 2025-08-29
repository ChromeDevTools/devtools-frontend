// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {computeSystemExecutablePath} from '@puppeteer/browsers';
import childProcess from 'node:child_process';
import path from 'node:path';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

import {FeatureSet} from './devtools_build.mjs';
import {
  downloadedChromeBinaryPath,
  isInChromiumDirectory,
  rootPath,
} from './devtools_paths.js';

// The default feature set.
const DEFAULT_FEATURE_SET = new FeatureSet();
process.platform === 'darwin' && DEFAULT_FEATURE_SET.disable('MediaRouter');
DEFAULT_FEATURE_SET.enable('DevToolsGlobalAiButton', { promotion_enabled: true });
DEFAULT_FEATURE_SET.enable('DevToolsAiCodeCompletion');
DEFAULT_FEATURE_SET.enable('DevToolsAiAssistancePerformanceAgent', {insights_enabled: true});
DEFAULT_FEATURE_SET.enable('DevToolsAiGeneratedTimelineLabels');
DEFAULT_FEATURE_SET.enable('DevToolsCssValueTracing');
DEFAULT_FEATURE_SET.enable('DevToolsFreestyler', {
  user_tier: 'TESTERS',
  function_calling: true,
});
DEFAULT_FEATURE_SET.enable('DevToolsWellKnown');

// The unstable feature set (can be enabled via `--enable-unstable-features`).
const UNSTABLE_FEATURE_SET = new FeatureSet();

const argv = yargs(hideBin(process.argv))
                 .option('browser', {
                   type: 'string',
                   // CfT is not downloaded in Chromium checkout
                   default: isInChromiumDirectory().isInChromium ? 'canary' : 'cft',
                   description: 'Launch in specified Chrome channel, CfT or a custom binary',
                   coerce(arg) {
                     if (arg.includes(path.sep) || arg.includes(path.posix.sep) ||
                         ['cft', 'stable', 'beta', 'dev', 'canary'].includes(arg)) {
                       return arg;
                     }

                     throw new Error(`Unsupported channel "${arg}"`);
                   },
                 })
                 .option('unstable-features', {
                   alias: 'u',
                   type: 'boolean',
                   default: false,
                   description: 'Enable potentially unstable features',
                 })
                 .option('enable-features', {
                   type: 'string',
                   default: '',
                   description: 'Enable specific features (just like with Chrome)',
                 })
                 .option('disable-features', {
                   type: 'string',
                   default: '',
                   description: 'Disable specific features (just like with Chrome)',
                 })
                 .option('open', {
                   type: 'boolean',
                   default: true,
                   description: 'Automatically open DevTools for new tabs',
                 })
                 .option('remote-debugging-port', {
                   type: 'number',
                   description: 'Launch Chrome with the remote debugging port',
                 })
                 .option('target', {
                   alias: 't',
                   type: 'string',
                   default: 'Default',
                   description: 'Specify the target build subdirectory under //out',
                 })
                 .option('user-data-dir', {
                   type: 'string',
                   description: 'Launch Chrome with the given profile directory',
                 })
                 .option('verbose', {
                   type: 'boolean',
                   default: false,
                   description: 'Enable verbose logging',
                 })
                 .group(['unstable-features', 'enable-features', 'disable-features'], 'Feature options:')
                 .usage('npm start -- [options] [urls...]')
                 .help('help')
                 .version(false)
                 .parseSync();

const {
  browser,
  disableFeatures,
  enableFeatures,
  unstableFeatures,
  open,
  remoteDebuggingPort,
  target,
  userDataDir,
  verbose,
} = argv;
const cwd = process.cwd();
const {env} = process;
const runBuildPath = path.join(import.meta.dirname, 'run_build.mjs');

function findBrowserBinary() {
  if (browser === 'cft') {
    const binary = downloadedChromeBinaryPath();
    if (verbose) {
      console.debug('Located Chrome for Testing binary at %s.', binary);
    }
    return binary;
  }

  if (['stable', 'beta', 'dev', 'canary'].includes(browser)) {
    const binary = computeSystemExecutablePath({
      browser: 'chrome',
      channel: browser,
    });

    if (verbose) {
      console.debug(`Located Chrome ${browser} binary at ${binary}.`);
    }
    return binary;
  }

  if (verbose) {
    console.debug(`Launching custom binary at ${browser}.`);
  }
  return browser;
}

// The `--remote-debugging-port` command line flag only has an effect in Chrome
// nowadays when used with a non-default data directory, so we fail if the user
// didn't also specify the `--user-data-dir` command line flag. In Chrome for
// Testing the remote debugging port still works with the default profile.
if (remoteDebuggingPort && browser !== 'cft' && !userDataDir) {
  console.error(
      'The `--remote-debugging-port` command line switch must be accompanied by the `--user-data-dir` switch\n' +
      'to point to a non-standard directory. See https://developer.chrome.com/blog/remote-debugging-port for\n' +
      'more information.\n');
  process.exit(1);
}

// Perform the initial build.
const {status} = childProcess.spawnSync(process.argv[0], [runBuildPath, `--target=${target}`], {
  cwd,
  env,
  stdio: 'inherit',
});
if (status !== 0) {
  process.exit(1);
}

// Launch Chrome with our custom DevTools front-end.
function start() {
  const binary = findBrowserBinary();
  /**
   * @type {string[]}
   */
  const args = [];

  // Disable first run experience.
  args.push('--no-first-run');

  // Custom flags for CfT.
  if (browser === 'cft') {
    args.push('--disable-infobars');
  }

  // Custom flags for macOS.
  if (process.platform === 'darwin') {
    args.push('--use-mock-keychain');
  }

  // Disable/Enable features.
  const featureSet = new FeatureSet();
  featureSet.merge(DEFAULT_FEATURE_SET);
  if (unstableFeatures) {
    featureSet.merge(UNSTABLE_FEATURE_SET);
  }
  for (const {feature} of FeatureSet.parse(disableFeatures)) {
    featureSet.disable(feature);
  }
  for (const {feature, parameters} of FeatureSet.parse(enableFeatures)) {
    featureSet.enable(feature, parameters);
  }
  args.push(...featureSet);

  // Custom flags for Chrome.
  if (remoteDebuggingPort) {
    args.push(`--remote-debugging-port=${remoteDebuggingPort}`);
  }
  if (userDataDir) {
    args.push(`--user-data-dir=${userDataDir}`);
  }

  // Open with our freshly built DevTools front-end.
  const genDir = path.join(rootPath(), 'out', target, 'gen');
  const customDevToolsFrontEndPath = isInChromiumDirectory().isInChromium ?
      path.join(genDir, 'third_party', 'devtools-frontend', 'src', 'front_end') :
      path.join(genDir, 'front_end');
  args.push(`--custom-devtools-frontend=file://${customDevToolsFrontEndPath}`);

  // Chrome flags and URLs.
  if (open) {
    args.push('--auto-open-devtools-for-tabs');
  }
  const restArg = argv._.filter(arg => typeof arg === 'string');
  args.push(...restArg);

  // Launch Chrome.
  if (verbose) {
    console.debug('Launch Chrome: %s %s', binary, args.join(' '));
  }
  childProcess.spawnSync(binary, args, {cwd, env, stdio: verbose ? 'inherit' : 'ignore'});
}

// Run build watcher in the background to automatically rebuild
// devtools-frontend whenever there are changes detected.
const watcher = childProcess.spawn(
    process.argv[0],
    [runBuildPath, '--skip-initial-build', `--target=${target}`, '--watch'],
    {cwd, env, stdio: 'inherit'},
);
try {
  // Launch chrome.
  start();
} finally {
  watcher.kill();
}

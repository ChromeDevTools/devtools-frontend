// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import childProcess from 'node:child_process';
import path from 'node:path';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

import {downloadedChromeBinaryPath, rootPath} from './devtools_paths.js';

// The list of features that are enabled by default.
const ENABLE_FEATURES = [
  'DevToolsAiGeneratedTimelineLabels',
  'DevToolsAutomaticFileSystems',
  'DevToolsCssValueTracing',
  'DevToolsFreeStyler:patching/true,user_tier/TESTERS',
  'DevToolsWellKnown',
  'DevToolsAiGeneratedTimelineLabels',
  'DevToolsAiAssistancePerformanceAgent:insights_enabled/true',
];

// The list of features that are disabled by default.
const DISABLE_FEATURES = [];
if (process.platform === 'darwin') {
  DISABLE_FEATURES.push('MediaRouter');
}

const argv = yargs(hideBin(process.argv))
                 .option('browser', {
                   type: 'string',
                   choices: ['cft', 'canary'],
                   default: 'cft',
                   description: 'Launch in the specified browser',
                 })
                 .option('open', {
                   type: 'boolean',
                   default: true,
                   description: 'Automatically open DevTools for new tabs',
                 })
                 .option('target', {
                   alias: 't',
                   type: 'string',
                   default: 'Default',
                   description: 'Specify the target build subdirectory under //out',
                 })
                 .option('verbose', {
                   type: 'boolean',
                   default: false,
                   description: 'Enable verbose logging',
                 })
                 .usage('npm start -- [options] [urls...]')
                 .help('help')
                 .version(false)
                 .parseSync();

const {browser, target, open, verbose} = argv;
const cwd = process.cwd();
const {env} = process;
const runBuildPath = path.join(import.meta.dirname, 'run_build.mjs');

function findBrowserBinary() {
  if (browser === 'canary') {
    const binary = ({
      linux: path.join('/usr', 'bin', 'google-chrome-canary'),
      darwin: path.join('/Applications', 'Google Chrome Canary.app', 'Contents', 'MacOS', 'Google Chrome Canary'),
    })[process.platform];
    if (verbose) {
      console.debug('Located Chrome Canary binary in %s.', binary);
    }
    return binary;
  }
  const binary = downloadedChromeBinaryPath();
  if (verbose) {
    console.debug('Located Chrome for Testing binary in %s.', binary);
  }
  return binary;
}

// Perform the initial build.
childProcess.spawnSync(
    process.argv[0],
    [
      runBuildPath,
      `--target=${target}`,
    ],
    {cwd, env, stdio: 'inherit'},
);

// Launch Chrome with our custom DevTools front-end.
function start() {
  const binary = findBrowserBinary();
  const args = [];

  // Custom flags for CfT.
  if (browser === 'cft') {
    args.push('--disable-infobars');
  }

  // Custom flags for macOS.
  if (process.platform === 'darwin') {
    args.push('--use-mock-keychain');
  }

  // Disable/Enable experimental features.
  args.push(`--disable-features=${DISABLE_FEATURES.join(',')}`);
  args.push(`--enable-features=${ENABLE_FEATURES.join(',')}`);

  // Open with our freshly built DevTools front-end.
  const customDevToolsFrontEndPath = path.join(rootPath(), 'out', target, 'gen', 'front_end');
  args.push(`--custom-devtools-frontend=file://${customDevToolsFrontEndPath}`);

  // Chrome flags and URLs.
  if (open) {
    args.push('--auto-open-devtools-for-tabs');
  }
  args.push(...argv._);

  // Launch Chrome.
  if (verbose) {
    console.debug('Launch Chrome: %s %s', binary, args.join(' '));
  }
  childProcess.spawnSync(binary, args, {cwd, env, stdio: 'inherit'});
}

// Run build watcher in the background to automatically rebuild
// devtools-frontend whenever there are changes detected.
const watcher = childProcess.spawn(
    process.argv[0],
    [
      runBuildPath,
      '--skip-initial-build',
      `--target=${target}`,
      '--watch',
    ],
    {cwd, env, stdio: 'inherit'});
try {
  // Launch chrome.
  start();
} finally {
  watcher.kill();
}

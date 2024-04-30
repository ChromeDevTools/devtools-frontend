// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const path = require('path');
const process = require('process');
const glob = requireInternal('glob');
const karmaChromeLauncher = requireInternal('karma-chrome-launcher');

function isDebug() {
  return process.argv.indexOf('--debug') > -1;
}

function requireInternal(module) {
  const node_root_path = '@REPO_SOURCE_DIR@/node_modules';
  return require(require.resolve(module, {paths: [node_root_path]}));
}

function getTestInputs() {
  const testFiles = glob.sync('@CMAKE_CURRENT_SOURCE_DIR@/*_test.ts');

  return testFiles.map(f => path.relative('@CMAKE_CURRENT_SOURCE_DIR@', f))
      .map(f => `${path.basename(f, '.ts')}.js`)
      .map(f => path.join('@CMAKE_CURRENT_BINARY_DIR@', f))
      .map(f => ({pattern: f, type: 'module', served: true, included: true, watched: true}));
}

const ChromeWS = function(baseBrowserDecorator, args, config) {
  const chrome = karmaChromeLauncher['launcher:Chrome'][1];
  chrome.apply(this, arguments);

  const parentOptions = this._getOptions;
  const debugArgs = isDebug() ? [] : [];
  this._getOptions = function(url) {
    return parentOptions.call(this, url, args).concat([
      '--headless=new',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--remote-allow-origins=*',
      '--remote-debugging-port=9222',
      '--password-store=basic',
      '--enable-features=SharedArrayBuffer',
      ...debugArgs,
    ]);
  };
};

ChromeWS.prototype = {
  name: 'ChromeWS',

  DEFAULT_CMD: {
    linux: '@REPO_SOURCE_DIR@/third_party/chrome/chrome-linux/chrome',
  },
  ENV_CMD: 'CHROME_BIN',
};
ChromeWS.$inject = ['baseBrowserDecorator', 'args', 'config'];

module.exports = function(config) {
  const basePath = path.resolve('@REPO_SOURCE_DIR@');
  const buildArtifacts = ['$<JOIN:@EXTENSION_TEST_BUILD_ARTIFACTS@,', '>'].map(p => path.resolve(p));
  const importMapFile = {pattern: '@CMAKE_CURRENT_SOURCE_DIR@/karma_preload.html', type: 'dom', watched: true};
  const testInputs = getTestInputs();

  const servedResources = [
    // Build artifacts that aren't tests:
    ...buildArtifacts.filter(f => !testInputs.find(i => i.pattern === f)),
    // Source maps:
    ...buildArtifacts.filter(pattern => pattern.endsWith('.js')).map(pattern => `${pattern}.map`),
    // Sources:
    '@PROJECT_SOURCE_DIR@/src/*.ts',
    '@PROJECT_SOURCE_DIR@/tests/*.ts',
    '@PROJECT_SOURCE_DIR@/tests/inputs/*.cc',
    '@PROJECT_SOURCE_DIR@/lib/*.cc',
    '@PROJECT_SOURCE_DIR@/lib/*.h',
    '@PROJECT_SOURCE_DIR@/third_party/lit-html/**/*.js',
    // Test Inputs:
    '@THIRD_PARTY_DIR@/lldb-eval/src/testdata/test_binary.cc',
    '@THIRD_PARTY_DIR@/lldb-eval/src/testdata/test_library.cc',
  ].map(pattern => ({pattern, type: 'module', served: true, included: false, watched: true}));

  const workerBuildArtifactProxy = {};
  for (const artifact of buildArtifacts) {
    if (!artifact.startsWith('@PROJECT_BINARY_DIR@/src') ||
        (!artifact.endsWith('.js') && !artifact.endsWith('.wasm'))) {
      continue;
    }
    const servePath = path.join('/build', path.relative('@PROJECT_BINARY_DIR@', artifact));
    workerBuildArtifactProxy[`/${path.basename(artifact)}`] = servePath;
  }

  const options = {
    basePath,
    autoWatchBatchDelay: 3000,

    files: [importMapFile, ...testInputs, ...servedResources],

    browsers: ['ChromeWS'],

    frameworks: ['mocha', 'chai', 'sinon'],

    client: {
      basePath,
      mocha: {timeout: 120000},
    },

    plugins: [
      requireInternal('karma-mocha'),
      requireInternal('karma-chai'),
      requireInternal('karma-sinon'),
      requireInternal('karma-sourcemap-loader'),
      requireInternal('karma-spec-reporter'),
      requireInternal('karma-coverage'),
      {'launcher:ChromeWS': ['type', ChromeWS]},
    ],

    proxies: {
      '/json/new': 'http://localhost:9222/json/new',
      '/build': '@PROJECT_BINARY_DIR@',
      ...workerBuildArtifactProxy,
    },

    preprocessors: {
      '**/*.js': ['sourcemap'],
    },

    mochaReporter: {
      showDiff: true,
    },
    singleRun: !isDebug(),
  };

  config.set(options);
};

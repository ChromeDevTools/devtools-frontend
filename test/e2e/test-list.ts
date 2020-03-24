// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {join} from 'path';

const tests = [
  'application/session-storage.js',
  'application/websql-database.js',
  'console/console-message-format.js',
  'console/console-repl-mode.js',
  'elements/pseudo-states.js',
  'elements/shadowroot-styles.js',
  'elements/sidebar-event-listeners.js',
  'host/user-metrics.js',
  'network/network-datagrid.js',
  'rendering/vision-deficiencies.js',
  'snippets/context-menu.js',
  'sources/can-break-with-wasm-sourcemaps.js',
  'sources/can-format-sourcecode.js',
  'sources/can-show-files-after-loading.js',
  'sources/can-show-multiple-workers.js',
  'sources/debug-raw-wasm.js',
  'sources/debugger-language-plugins.js',
  'sources/script-in-multiple-workers.js',
];

export const testList = tests.map(testPath => {
  return join(__dirname, testPath);
});

// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {join} from 'path';

const tests = [
  'application/session-storage_test.js',
  'application/websql-database_test.js',
  'console/console-message-format_test.js',
  'console/console-repl-mode_test.js',
  'elements/pseudo-states_test.js',
  'elements/shadowroot-styles_test.js',
  'elements/selection-after-delete_test.js',
  'elements/sidebar-event-listeners_test.js',
  'elements/sidebar-event-listeners-remove_test.js',
  'elements/style-pane-properties_test.js',
  'elements/element-breadcrumbs_test.js',
  'host/user-metrics_test.js',
  'media/media-tab_test.js',
  'network/network-datagrid_test.js',
  'rendering/vision-deficiencies_test.js',
  'sensors/location_test.js',
  'snippets/context-menu_test.js',
  'sources/can-break-with-wasm-sourcemaps_test.js',
  'sources/can-format-sourcecode_test.js',
  'sources/can-show-files-after-loading_test.js',
  'sources/can-show-multiple-workers_test.js',
  'sources/debug-raw-wasm_test.js',
  'sources/debugger-language-plugins_test.js',
  'sources/dwarf-cxx-language-plugin_test.js',
  'sources/script-in-multiple-workers_test.js',
  'sources/navigation_test.js',
];

export const testList = tests.map(testPath => {
  return join(__dirname, testPath);
});

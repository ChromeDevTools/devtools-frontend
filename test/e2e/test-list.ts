// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {join} from 'path';

export const testList = [
  join(__dirname, '.', 'application', 'session-storage.js'),
  join(__dirname, '.', 'console', 'console-message-format.js'),
  join(__dirname, '.', 'network', 'network-datagrid.js'),
  join(__dirname, '.', 'sources', 'can-format-sourcecode.js'),
  join(__dirname, '.', 'sources', 'can-break-with-wasm-sourcemaps.js'),
  join(__dirname, '.', 'sources', 'can-show-multiple-workers.js'),
  join(__dirname, '.', 'sources', 'debug-raw-wasm.js'),
  join(__dirname, '.', 'sources', 'script-in-multiple-workers.js'),
  join(__dirname, '.', 'host', 'user-metrics.js'),
];

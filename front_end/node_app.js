// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import './shell.js';
import './js_profiler/js_profiler-meta.js';
import './node_main/node_main-meta.js';
import './node_debugger/node_debugger-meta.js';
import * as Startup from './startup/startup.js';  // eslint-disable-line rulesdir/es_modules_import

Startup.RuntimeInstantiator.startApplication('node_app');

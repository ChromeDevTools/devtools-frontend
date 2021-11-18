// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../shell/shell.js';
import '../../panels/js_profiler/js_profiler-meta.js';
import '../node_main/node_main-meta.js';
import './node_app-meta.js';
import * as Startup from '../startup/startup.js';

// Side-effect start the `node_main` module, which implements runnables in
// the NodeMain class
await import('../node_main/node_main.js');
Startup.RuntimeInstantiator.startApplication('node_app');

// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './startup/startup.js';
import './wasmparser_worker/wasmparser_worker.js';

import * as Startup from './startup/startup.js';

Startup.RuntimeInstantiator.startWorker('wasmparser_worker_entrypoint');

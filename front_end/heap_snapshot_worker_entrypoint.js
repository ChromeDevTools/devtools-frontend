// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './startup/startup.js';
import './heap_snapshot_model/heap_snapshot_model-legacy.js';
import './heap_snapshot_worker/heap_snapshot_worker-legacy.js';

import * as Startup from './startup/startup.js';

Startup.RuntimeInstantiator.startWorker('heap_snapshot_worker_entrypoint');

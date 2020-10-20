// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './startup/startup.js';
import './worker_service/worker_service.js';
import './lighthouse_worker/lighthouse_worker.js';

import * as Startup from './startup/startup.js';

Startup.RuntimeInstantiator.startWorker('lighthouse_worker');

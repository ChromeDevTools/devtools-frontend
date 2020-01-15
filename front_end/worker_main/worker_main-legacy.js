// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as WorkerMainModule from './worker_main.js';

self.WorkerMain = self.WorkerMain || {};
WorkerMain = WorkerMain || {};

/** @constructor */
WorkerMain.WorkerMain = WorkerMainModule.WorkerMain.WorkerMainImpl;

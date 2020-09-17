// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './RuntimeInstantiator.js';
import './platform/platform.js';
import './worker_service/worker_service.js';

import {startWorker} from './RuntimeInstantiator.js';

startWorker('lighthouse_worker');

// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './LighthouseWorkerService.js';
import '../../third_party/lighthouse/lighthouse-dt-bundle.js';

self.postMessage('workerReady');

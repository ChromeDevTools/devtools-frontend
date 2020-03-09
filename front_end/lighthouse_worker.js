// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import './platform/platform.js';
import './Runtime.js';

import './worker_service/worker_service.js';

Root.Runtime.startWorker('lighthouse_worker');

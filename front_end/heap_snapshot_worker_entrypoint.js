// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Runtime.js';

import './platform/platform.js';
import './text_utils/text_utils.js';
import './common/common-legacy.js';

import './heap_snapshot_model/heap_snapshot_model.js';
import './heap_snapshot_worker/heap_snapshot_worker.js';

Root.Runtime.startWorker('heap_snapshot_worker_entrypoint');

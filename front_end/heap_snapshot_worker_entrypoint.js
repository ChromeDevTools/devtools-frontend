// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './RuntimeInstantiator.js';
import './platform/platform.js';
import './text_utils/text_utils-legacy.js';
import './common/common-legacy.js';
import './heap_snapshot_model/heap_snapshot_model-legacy.js';
import './heap_snapshot_worker/heap_snapshot_worker-legacy.js';

import {startWorker} from './RuntimeInstantiator.js';

startWorker('heap_snapshot_worker_entrypoint');

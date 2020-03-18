// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './RuntimeInstantiator.js';
import './common/common.js';
import './platform/platform.js';
import './text_utils/text_utils-legacy.js';
import './cm_headless/cm_headless.js';
import './formatter_worker/formatter_worker.js';

import {startWorker} from './RuntimeInstantiator.js';

startWorker('formatter_worker_entrypoint');

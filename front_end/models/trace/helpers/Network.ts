// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type SyntheticNetworkRequest} from '../types/TraceEvents.js';

export function isSyntheticNetworkRequestEventRenderBlocking(event: SyntheticNetworkRequest): boolean {
  return event.args.data.renderBlocking !== 'non_blocking';
}

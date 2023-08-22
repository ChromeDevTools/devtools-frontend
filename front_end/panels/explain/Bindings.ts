// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';

export function isAvailable(): boolean {
  return Boolean(Host.InspectorFrontendHost.InspectorFrontendHostInstance.explainCode);
}

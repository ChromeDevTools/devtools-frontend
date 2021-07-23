// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../core/sdk/sdk.js';

export class NetworkRequestId {
  requestId: string;
  manager: SDK.NetworkManager.NetworkManager;

  constructor(requestId: string, manager: SDK.NetworkManager.NetworkManager) {
    this.requestId = requestId;
    this.manager = manager;
  }
}

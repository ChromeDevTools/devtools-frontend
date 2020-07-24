// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Host from '../host/host.js';

import {State} from './DockController.js';

export function reload() {
  if (self.Components.dockController.canDock() && self.Components.dockController.dockSide() === State.Undocked) {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setIsDocked(true, function() {});
  }
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.reattach(() => window.location.reload());
}

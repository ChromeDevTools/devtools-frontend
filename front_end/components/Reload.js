// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../host/host.js';

import {State} from './DockController.js';

export function reload() {
  if (Components.dockController.canDock() && Components.dockController.dockSide() === State.Undocked) {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setIsDocked(true, function() {});
  }
  window.location.reload();
}

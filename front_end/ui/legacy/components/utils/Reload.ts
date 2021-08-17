// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../../core/host/host.js';
import * as UI from '../../legacy.js';

export function reload(): void {
  if (UI.DockController.DockController.instance().canDock() &&
      UI.DockController.DockController.instance().dockSide() === UI.DockController.DockState.UNDOCKED) {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setIsDocked(true, function() {});
  }
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.reattach(() => window.location.reload());
}

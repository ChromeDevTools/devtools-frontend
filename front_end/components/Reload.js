// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export function reload() {
  if (Components.dockController.canDock() &&
      Components.dockController.dockSide() === Components.DockController.State.Undocked) {
    Host.InspectorFrontendHost.setIsDocked(true, function() {});
  }
  window.location.reload();
}

/* Legacy exported object */
self.Components = self.Components || {};

/* Legacy exported object */
Components = Components || {};

Components.reload = reload;

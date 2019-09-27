// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
CssOverview.OverviewController = class extends Common.Object {
  constructor() {
    super();

    SDK.targetManager.addEventListener(SDK.TargetManager.Events.InspectedURLChanged, this._reset, this);
  }

  _reset() {
    this.dispatchEventToListeners(CssOverview.Events.Reset);
  }
};

CssOverview.Events = {
  RequestOverviewStart: Symbol('RequestOverviewStart'),
  RequestOverviewCancel: Symbol('RequestOverviewCancel'),
  OverviewCompleted: Symbol('OverviewCompleted'),
  Reset: Symbol('Reset'),
};

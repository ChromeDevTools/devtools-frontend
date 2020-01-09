// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
export class OverviewController extends Common.Object {
  constructor() {
    super();

    this.currentUrl = SDK.targetManager.inspectedURL();
    SDK.targetManager.addEventListener(
        SDK.TargetManager.Events.InspectedURLChanged, this._checkUrlAndResetIfChanged, this);
  }

  _checkUrlAndResetIfChanged() {
    if (this.currentUrl === SDK.targetManager.inspectedURL()) {
      return;
    }

    this.currentUrl = SDK.targetManager.inspectedURL();
    this.dispatchEventToListeners(Events.Reset);
  }
}

export const Events = {
  RequestOverviewStart: Symbol('RequestOverviewStart'),
  RequestNodeHighlight: Symbol('RequestNodeHighlight'),
  PopulateNodes: Symbol('PopulateNodes'),
  RequestOverviewCancel: Symbol('RequestOverviewCancel'),
  OverviewCompleted: Symbol('OverviewCompleted'),
  Reset: Symbol('Reset'),
};

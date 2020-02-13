// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';

/**
 * @unrestricted
 */
export class OverviewController extends Common.ObjectWrapper.ObjectWrapper {
  constructor() {
    super();

    this.currentUrl = self.SDK.targetManager.inspectedURL();
    self.SDK.targetManager.addEventListener(
        SDK.SDKModel.Events.InspectedURLChanged, this._checkUrlAndResetIfChanged, this);
  }

  _checkUrlAndResetIfChanged() {
    if (this.currentUrl === self.SDK.targetManager.inspectedURL()) {
      return;
    }

    this.currentUrl = self.SDK.targetManager.inspectedURL();
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

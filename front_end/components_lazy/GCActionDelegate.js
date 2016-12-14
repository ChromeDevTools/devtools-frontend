// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {UI.ActionDelegate}
 */
Components.GCActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    SDK.targetManager.targets().forEach(target => target.heapProfilerAgent().collectGarbage());
    return true;
  }
};

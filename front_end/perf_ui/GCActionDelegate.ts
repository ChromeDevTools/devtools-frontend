// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as SDK from '../core/sdk/sdk.js';
import * as UI from '../ui/legacy/legacy.js';  // eslint-disable-line no-unused-vars

let gCActionDelegateInstance: GCActionDelegate;

export class GCActionDelegate implements UI.ActionRegistration.ActionDelegate {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): GCActionDelegate {
    const {forceNew} = opts;
    if (!gCActionDelegateInstance || forceNew) {
      gCActionDelegateInstance = new GCActionDelegate();
    }

    return gCActionDelegateInstance;
  }

  handleAction(_context: UI.Context.Context, _actionId: string): boolean {
    for (const heapProfilerModel of SDK.SDKModel.TargetManager.instance().models(
             SDK.HeapProfilerModel.HeapProfilerModel)) {
      heapProfilerModel.collectGarbage();
    }
    return true;
  }
}

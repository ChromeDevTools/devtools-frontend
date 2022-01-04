// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../core/sdk/sdk.js';
import type * as UI from '../../legacy.js';

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
    for (const heapProfilerModel of SDK.TargetManager.TargetManager.instance().models(
             SDK.HeapProfilerModel.HeapProfilerModel)) {
      void heapProfilerModel.collectGarbage();
    }
    return true;
  }
}

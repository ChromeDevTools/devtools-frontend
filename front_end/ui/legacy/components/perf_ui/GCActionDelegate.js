// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../../../core/sdk/sdk.js';
export class GCActionDelegate {
    handleAction(_context, _actionId) {
        for (const heapProfilerModel of SDK.TargetManager.TargetManager.instance().models(SDK.HeapProfilerModel.HeapProfilerModel)) {
            void heapProfilerModel.collectGarbage();
        }
        return true;
    }
}
//# sourceMappingURL=GCActionDelegate.js.map
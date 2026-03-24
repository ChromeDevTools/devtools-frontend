// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../../core/i18n/i18n.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Snackbars from '../../../components/snackbars/snackbars.js';
const UIStrings = {
    /**
     * @description Notification message shown to the user when garbage collection has completed.
     */
    garbageCollectionCompleted: 'Garbage collection completed',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/perf_ui/GCActionDelegate.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class GCActionDelegate {
    handleAction(_context, _actionId) {
        const promises = SDK.TargetManager.TargetManager.instance()
            .models(SDK.HeapProfilerModel.HeapProfilerModel)
            .map(heapProfilerModel => heapProfilerModel.collectGarbage());
        void Promise.all(promises).then(() => {
            Snackbars.Snackbar.Snackbar.show({ message: i18nString(UIStrings.garbageCollectionCompleted) });
        });
        return true;
    }
}
//# sourceMappingURL=GCActionDelegate.js.map
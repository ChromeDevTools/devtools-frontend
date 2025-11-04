// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Root from '../../../../core/root/root.js';
import * as UI from '../../legacy.js';
const UIStrings = {
    /**
     * @description Title of a setting under the Performance category in Settings.
     * Selected navigation allows switching between 2 different sets of shortcuts
     * and actions (like zoom on scroll or crtl/cmd + scroll) for navigating the performance panel.
     */
    flamechartSelectedNavigation: 'Flamechart navigation:',
    /**
     * @description Modern navigation option in the Performance Panel.
     */
    modern: 'Modern',
    /**
     * @description Classic navigation option in the Performance Panel.
     */
    classic: 'Classic',
    /**
     * @description Title of a setting under the Memory category in Settings. Live memory is memory
     * that is still in-use by the program (not dead). Allocation of live memory is when the program
     * creates new memory. This is a setting that turns on extra annotations in the UI to mark these
     * allocations.
     */
    liveMemoryAllocationAnnotations: 'Live memory allocation annotations',
    /**
     * @description Title of a setting under the Memory category that can be invoked through the Command Menu
     */
    showLiveMemoryAllocation: 'Show live memory allocation annotations',
    /**
     * @description Title of a setting under the Memory category that can be invoked through the Command Menu
     */
    hideLiveMemoryAllocation: 'Hide live memory allocation annotations',
    /**
     * @description Title of an action in the components tool to collect garbage
     */
    collectGarbage: 'Collect garbage',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/perf_ui/perf_ui-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedPerfUIModule;
async function loadPerfUIModule() {
    if (!loadedPerfUIModule) {
        loadedPerfUIModule = await import('./perf_ui.js');
    }
    return loadedPerfUIModule;
}
UI.ActionRegistration.registerActionExtension({
    actionId: 'components.collect-garbage',
    category: "PERFORMANCE" /* UI.ActionRegistration.ActionCategory.PERFORMANCE */,
    title: i18nLazyString(UIStrings.collectGarbage),
    iconClass: "mop" /* UI.ActionRegistration.IconClass.MOP */,
    async loadActionDelegate() {
        const PerfUI = await loadPerfUIModule();
        return new PerfUI.GCActionDelegate.GCActionDelegate();
    },
});
Common.Settings.registerSettingExtension({
    category: "PERFORMANCE" /* Common.Settings.SettingCategory.PERFORMANCE */,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
    title: i18nLazyString(UIStrings.flamechartSelectedNavigation),
    settingName: 'flamechart-selected-navigation',
    settingType: "enum" /* Common.Settings.SettingType.ENUM */,
    defaultValue: 'classic',
    options: [
        {
            title: i18nLazyString(UIStrings.modern),
            text: i18nLazyString(UIStrings.modern),
            value: 'modern',
        },
        {
            title: i18nLazyString(UIStrings.classic),
            text: i18nLazyString(UIStrings.classic),
            value: 'classic',
        },
    ],
});
Common.Settings.registerSettingExtension({
    category: "MEMORY" /* Common.Settings.SettingCategory.MEMORY */,
    experiment: "live-heap-profile" /* Root.Runtime.ExperimentName.LIVE_HEAP_PROFILE */,
    title: i18nLazyString(UIStrings.liveMemoryAllocationAnnotations),
    settingName: 'memory-live-heap-profile',
    settingType: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    options: [
        {
            value: true,
            title: i18nLazyString(UIStrings.showLiveMemoryAllocation),
        },
        {
            value: false,
            title: i18nLazyString(UIStrings.hideLiveMemoryAllocation),
        },
    ],
});
//# sourceMappingURL=perf_ui-meta.prebundle.js.map
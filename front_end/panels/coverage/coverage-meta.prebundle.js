// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
const UIStrings = {
    /**
     * @description Title of the 'Coverage' tool in the bottom drawer
     */
    coverage: 'Coverage',
    /**
     * @description Command for showing the 'Coverage' tool in the bottom drawer
     */
    showCoverage: 'Show Coverage',
    /**
     * @description Title of an action under the Performance category that can be invoked through the Command Menu
     */
    instrumentCoverage: 'Instrument coverage',
    /**
     * @description Title of an action under the Performance category that can be invoked through the Command Menu
     */
    stopInstrumentingCoverageAndShow: 'Stop instrumenting coverage and show results',
    /**
     * @description Title of an action in the coverage tool to start with reload
     */
    startInstrumentingCoverageAnd: 'Start instrumenting coverage and reload page',
    /**
     * @description Title of an action in the Coverage tool to clear all data.
     */
    clearCoverage: 'Clear coverage',
    /**
     * @description Title of an action in the Coverage tool to export the data.
     */
    exportCoverage: 'Export coverage',
};
const str_ = i18n.i18n.registerUIStrings('panels/coverage/coverage-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedCoverageModule;
async function loadCoverageModule() {
    if (!loadedCoverageModule) {
        loadedCoverageModule = await import('./coverage.js');
    }
    return loadedCoverageModule;
}
function maybeRetrieveContextTypes(getClassCallBack) {
    if (loadedCoverageModule === undefined) {
        return [];
    }
    return getClassCallBack(loadedCoverageModule);
}
UI.ViewManager.registerViewExtension({
    location: "drawer-view" /* UI.ViewManager.ViewLocationValues.DRAWER_VIEW */,
    id: 'coverage',
    title: i18nLazyString(UIStrings.coverage),
    commandPrompt: i18nLazyString(UIStrings.showCoverage),
    persistence: "closeable" /* UI.ViewManager.ViewPersistence.CLOSEABLE */,
    order: 100,
    async loadView() {
        const Coverage = await loadCoverageModule();
        return Coverage.CoverageView.CoverageView.instance();
    },
});
UI.ActionRegistration.registerActionExtension({
    actionId: 'coverage.toggle-recording',
    iconClass: "record-start" /* UI.ActionRegistration.IconClass.START_RECORDING */,
    toggleable: true,
    toggledIconClass: "record-stop" /* UI.ActionRegistration.IconClass.STOP_RECORDING */,
    toggleWithRedColor: true,
    async loadActionDelegate() {
        const Coverage = await loadCoverageModule();
        return new Coverage.CoverageView.ActionDelegate();
    },
    category: "PERFORMANCE" /* UI.ActionRegistration.ActionCategory.PERFORMANCE */,
    options: [
        {
            value: true,
            title: i18nLazyString(UIStrings.instrumentCoverage),
        },
        {
            value: false,
            title: i18nLazyString(UIStrings.stopInstrumentingCoverageAndShow),
        },
    ],
});
UI.ActionRegistration.registerActionExtension({
    actionId: 'coverage.start-with-reload',
    iconClass: "refresh" /* UI.ActionRegistration.IconClass.REFRESH */,
    async loadActionDelegate() {
        const Coverage = await loadCoverageModule();
        return new Coverage.CoverageView.ActionDelegate();
    },
    category: "PERFORMANCE" /* UI.ActionRegistration.ActionCategory.PERFORMANCE */,
    title: i18nLazyString(UIStrings.startInstrumentingCoverageAnd),
});
UI.ActionRegistration.registerActionExtension({
    actionId: 'coverage.clear',
    iconClass: "clear" /* UI.ActionRegistration.IconClass.CLEAR */,
    category: "PERFORMANCE" /* UI.ActionRegistration.ActionCategory.PERFORMANCE */,
    title: i18nLazyString(UIStrings.clearCoverage),
    async loadActionDelegate() {
        const Coverage = await loadCoverageModule();
        return new Coverage.CoverageView.ActionDelegate();
    },
    contextTypes() {
        return maybeRetrieveContextTypes(Coverage => [Coverage.CoverageView.CoverageView]);
    },
});
UI.ActionRegistration.registerActionExtension({
    actionId: 'coverage.export',
    iconClass: "download" /* UI.ActionRegistration.IconClass.DOWNLOAD */,
    category: "PERFORMANCE" /* UI.ActionRegistration.ActionCategory.PERFORMANCE */,
    title: i18nLazyString(UIStrings.exportCoverage),
    async loadActionDelegate() {
        const Coverage = await loadCoverageModule();
        return new Coverage.CoverageView.ActionDelegate();
    },
    contextTypes() {
        return maybeRetrieveContextTypes(Coverage => [Coverage.CoverageView.CoverageView]);
    },
});
//# sourceMappingURL=coverage-meta.prebundle.js.map
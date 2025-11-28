// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import { Icon } from '../../ui/kit/kit.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as SettingsUI from '../../ui/legacy/components/settings_ui/settings_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { DOMStorageModel } from './DOMStorageModel.js';
import { IndexedDBModel } from './IndexedDBModel.js';
import storageViewStyles from './storageView.css.js';
const UIStrings = {
    /**
     * @description Text in the Storage View that expresses the amount of used and available storage quota
     * @example {1.5 MB} PH1
     * @example {123.1 MB} PH2
     */
    storageQuotaUsed: '{PH1} used out of {PH2} storage quota',
    /**
     * @description Tooltip in the Storage View that expresses the precise amount of used and available storage quota
     * @example {200} PH1
     * @example {400} PH2
     */
    storageQuotaUsedWithBytes: '{PH1} bytes used out of {PH2} bytes storage quota',
    /**
     * @description Fragment indicating that a certain data size has been custom configured
     * @example {1.5 MB} PH1
     */
    storageWithCustomMarker: '{PH1} (custom)',
    /**
     * @description Text in Application Panel Sidebar and title text of the Storage View of the Application panel
     */
    storageTitle: 'Storage',
    /**
     * @description Title text in Storage View of the Application panel
     */
    usage: 'Usage',
    /**
     * @description Unit for data size in DevTools
     */
    mb: 'MB',
    /**
     * @description Link to learn more about Progressive Web Apps
     */
    learnMore: 'Learn more',
    /**
     * @description Button text for the button in the Storage View of the Application panel for clearing site-specific storage
     */
    clearSiteData: 'Clear site data',
    /**
     * @description Announce message when the "clear site data" task is complete
     */
    SiteDataCleared: 'Site data cleared',
    /**
     * @description Category description in the Clear Storage section of the Storage View of the Application panel
     */
    application: 'Application',
    /**
     * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
     */
    unregisterServiceWorker: 'Unregister service workers',
    /**
     * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
     */
    localAndSessionStorage: 'Local and session storage',
    /**
     * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
     */
    indexDB: 'IndexedDB',
    /**
     * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
     */
    cookies: 'Cookies',
    /**
     * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
     */
    cacheStorage: 'Cache storage',
    /**
     * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
     */
    includingThirdPartyCookies: 'including third-party cookies',
    /**
     * @description Text for error message in Application Quota Override
     * @example {Image} PH1
     */
    sFailedToLoad: '{PH1} (failed to load)',
    /**
     * @description Text for error message in Application Quota Override
     */
    internalError: 'Internal error',
    /**
     * @description Text for error message in Application Quota Override
     */
    pleaseEnterANumber: 'Please enter a number',
    /**
     * @description Text for error message in Application Quota Override
     */
    numberMustBeNonNegative: 'Number must be non-negative',
    /**
     * @description Text for error message in Application Quota Override
     * @example {9000000000000} PH1
     */
    numberMustBeSmaller: 'Number must be smaller than {PH1}',
    /**
     * @description Button text for the "Clear site data" button in the Storage View of the Application panel while the clearing action is pending
     */
    clearing: 'Clearing…',
    /**
     * @description Quota row title in Clear Storage View of the Application panel
     */
    storageQuotaIsLimitedIn: 'Storage quota is limited in Incognito mode',
    /**
     * @description Text in Application Panel Sidebar of the Application panel
     */
    fileSystem: 'File System',
    /**
     * @description Text in Application Panel Sidebar of the Application panel
     */
    other: 'Other',
    /**
     * @description Text in Application Panel Sidebar of the Application panel
     */
    storageUsage: 'Storage usage',
    /**
     * @description Text in Application Panel Sidebar of the Application panel
     */
    serviceWorkers: 'Service workers',
    /**
     * @description Checkbox label in Application Panel Sidebar of the Application panel.
     * Storage quota refers to the amount of disk available for the website or app.
     */
    simulateCustomStorage: 'Simulate custom storage quota',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/StorageView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * @implements {SDK.TargetManager.Observer}
 */
export class StorageView extends UI.Widget.VBox {
    pieColors;
    reportView;
    target;
    securityOrigin;
    storageKey;
    settings;
    includeThirdPartyCookiesSetting;
    quotaRow;
    quotaUsage;
    pieChart;
    previousOverrideFieldValue;
    quotaOverrideCheckbox;
    quotaOverrideControlRow;
    quotaOverrideEditor;
    quotaOverrideErrorMessage;
    clearButton;
    throttler = new Common.Throttler.Throttler(1000);
    constructor() {
        super({ useShadowDom: true });
        this.registerRequiredCSS(storageViewStyles);
        this.contentElement.classList.add('clear-storage-container');
        this.contentElement.setAttribute('jslog', `${VisualLogging.pane('clear-storage')}`);
        this.pieColors = new Map([
            ["cache_storage" /* Protocol.Storage.StorageType.Cache_storage */, 'rgb(229, 113, 113)'], // red
            ["cookies" /* Protocol.Storage.StorageType.Cookies */, 'rgb(239, 196, 87)'], // yellow
            ["indexeddb" /* Protocol.Storage.StorageType.Indexeddb */, 'rgb(155, 127, 230)'], // purple
            ["local_storage" /* Protocol.Storage.StorageType.Local_storage */, 'rgb(116, 178, 102)'], // green
            ["service_workers" /* Protocol.Storage.StorageType.Service_workers */, 'rgb(255, 167, 36)'], // orange
        ]);
        this.reportView = new UI.ReportView.ReportView(i18nString(UIStrings.storageTitle));
        this.reportView.registerRequiredCSS(storageViewStyles);
        this.reportView.element.classList.add('clear-storage-header');
        this.reportView.show(this.contentElement);
        this.target = null;
        this.securityOrigin = null;
        this.storageKey = null;
        this.settings = new Map();
        for (const type of AllStorageTypes) {
            this.settings.set(type, Common.Settings.Settings.instance().createSetting('clear-storage-' + Platform.StringUtilities.toKebabCase(type), true));
        }
        this.includeThirdPartyCookiesSetting =
            Common.Settings.Settings.instance().createSetting('clear-storage-include-third-party-cookies', false);
        const clearButtonSection = this.reportView.appendSection('', 'clear-storage-button').appendRow();
        this.clearButton = UI.UIUtils.createTextButton(i18nString(UIStrings.clearSiteData), this.clear.bind(this), { jslogContext: 'storage.clear-site-data' });
        this.clearButton.id = 'storage-view-clear-button';
        clearButtonSection.appendChild(this.clearButton);
        const includeThirdPartyCookiesCheckbox = SettingsUI.SettingsUI.createSettingCheckbox(i18nString(UIStrings.includingThirdPartyCookies), this.includeThirdPartyCookiesSetting);
        includeThirdPartyCookiesCheckbox.classList.add('include-third-party-cookies');
        clearButtonSection.appendChild(includeThirdPartyCookiesCheckbox);
        const quota = this.reportView.appendSection(i18nString(UIStrings.usage));
        quota.element.setAttribute('jslog', `${VisualLogging.section('usage')}`);
        this.quotaRow = quota.appendSelectableRow();
        this.quotaRow.classList.add('quota-usage-row');
        const learnMoreRow = quota.appendRow();
        const learnMore = UI.XLink.XLink.create('https://developer.chrome.com/docs/devtools/progressive-web-apps#opaque-responses', i18nString(UIStrings.learnMore), undefined, undefined, 'learn-more');
        learnMoreRow.appendChild(learnMore);
        this.quotaUsage = null;
        this.pieChart = new PerfUI.PieChart.PieChart();
        this.populatePieChart(0, []);
        const usageBreakdownRow = quota.appendRow();
        usageBreakdownRow.classList.add('usage-breakdown-row');
        usageBreakdownRow.appendChild(this.pieChart);
        this.previousOverrideFieldValue = '';
        const quotaOverrideCheckboxRow = quota.appendRow();
        quotaOverrideCheckboxRow.classList.add('quota-override-row');
        this.quotaOverrideCheckbox = UI.UIUtils.CheckboxLabel.create(i18nString(UIStrings.simulateCustomStorage), false);
        this.quotaOverrideCheckbox.setAttribute('jslog', `${VisualLogging.toggle('simulate-custom-quota').track({ change: true })}`);
        quotaOverrideCheckboxRow.appendChild(this.quotaOverrideCheckbox);
        this.quotaOverrideCheckbox.addEventListener('click', this.onClickCheckbox.bind(this), false);
        this.quotaOverrideControlRow = quota.appendRow();
        this.quotaOverrideEditor = this.quotaOverrideControlRow.createChild('input', 'quota-override-notification-editor');
        this.quotaOverrideEditor.setAttribute('placeholder', i18nString(UIStrings.pleaseEnterANumber));
        this.quotaOverrideEditor.setAttribute('jslog', `${VisualLogging.textField('quota-override').track({ change: true })}`);
        this.quotaOverrideControlRow.appendChild(UI.UIUtils.createLabel(i18nString(UIStrings.mb)));
        this.quotaOverrideControlRow.classList.add('hidden');
        this.quotaOverrideEditor.addEventListener('keyup', event => {
            if (event.key === 'Enter') {
                void this.applyQuotaOverrideFromInputField();
                event.consume(true);
            }
        });
        this.quotaOverrideEditor.addEventListener('focusout', event => {
            void this.applyQuotaOverrideFromInputField();
            event.consume(true);
        });
        const errorMessageRow = quota.appendRow();
        this.quotaOverrideErrorMessage = errorMessageRow.createChild('div', 'quota-override-error');
        const application = this.reportView.appendSection(i18nString(UIStrings.application));
        application.element.setAttribute('jslog', `${VisualLogging.section('application')}`);
        this.appendItem(application, i18nString(UIStrings.unregisterServiceWorker), "service_workers" /* Protocol.Storage.StorageType.Service_workers */);
        application.markFieldListAsGroup();
        const storage = this.reportView.appendSection(i18nString(UIStrings.storageTitle));
        storage.element.setAttribute('jslog', `${VisualLogging.section('storage')}`);
        this.appendItem(storage, i18nString(UIStrings.localAndSessionStorage), "local_storage" /* Protocol.Storage.StorageType.Local_storage */);
        this.appendItem(storage, i18nString(UIStrings.indexDB), "indexeddb" /* Protocol.Storage.StorageType.Indexeddb */);
        this.appendItem(storage, i18nString(UIStrings.cookies), "cookies" /* Protocol.Storage.StorageType.Cookies */);
        this.appendItem(storage, i18nString(UIStrings.cacheStorage), "cache_storage" /* Protocol.Storage.StorageType.Cache_storage */);
        storage.markFieldListAsGroup();
        SDK.TargetManager.TargetManager.instance().observeTargets(this);
    }
    appendItem(section, title, settingName) {
        const row = section.appendRow();
        const setting = this.settings.get(settingName);
        if (setting) {
            row.appendChild(SettingsUI.SettingsUI.createSettingCheckbox(title, setting));
        }
    }
    targetAdded(target) {
        if (target !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
            return;
        }
        this.target = target;
        const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
        this.updateOrigin(securityOriginManager.mainSecurityOrigin(), securityOriginManager.unreachableMainSecurityOrigin());
        securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, this.originChanged, this);
        const storageKeyManager = target.model(SDK.StorageKeyManager.StorageKeyManager);
        this.updateStorageKey(storageKeyManager.mainStorageKey());
        storageKeyManager.addEventListener("MainStorageKeyChanged" /* SDK.StorageKeyManager.Events.MAIN_STORAGE_KEY_CHANGED */, this.storageKeyChanged, this);
    }
    targetRemoved(target) {
        if (this.target !== target) {
            return;
        }
        const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
        securityOriginManager.removeEventListener(SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, this.originChanged, this);
        const storageKeyManager = target.model(SDK.StorageKeyManager.StorageKeyManager);
        storageKeyManager.removeEventListener("MainStorageKeyChanged" /* SDK.StorageKeyManager.Events.MAIN_STORAGE_KEY_CHANGED */, this.storageKeyChanged, this);
    }
    originChanged(event) {
        const { mainSecurityOrigin, unreachableMainSecurityOrigin } = event.data;
        this.updateOrigin(mainSecurityOrigin, unreachableMainSecurityOrigin);
    }
    storageKeyChanged(event) {
        const { mainStorageKey } = event.data;
        this.updateStorageKey(mainStorageKey);
    }
    updateOrigin(mainOrigin, unreachableMainOrigin) {
        const oldOrigin = this.securityOrigin;
        if (unreachableMainOrigin) {
            this.securityOrigin = unreachableMainOrigin;
            this.reportView.setSubtitle(i18nString(UIStrings.sFailedToLoad, { PH1: unreachableMainOrigin }));
        }
        else {
            this.securityOrigin = mainOrigin;
            this.reportView.setSubtitle(mainOrigin);
        }
        if (oldOrigin !== this.securityOrigin) {
            this.quotaOverrideControlRow.classList.add('hidden');
            this.quotaOverrideCheckbox.checked = false;
            this.quotaOverrideErrorMessage.textContent = '';
        }
        void this.performUpdate();
    }
    updateStorageKey(mainStorageKey) {
        const oldStorageKey = this.storageKey;
        this.storageKey = mainStorageKey;
        this.reportView.setSubtitle(mainStorageKey);
        if (oldStorageKey !== this.storageKey) {
            this.quotaOverrideControlRow.classList.add('hidden');
            this.quotaOverrideCheckbox.checked = false;
            this.quotaOverrideErrorMessage.textContent = '';
        }
        void this.performUpdate();
    }
    async applyQuotaOverrideFromInputField() {
        if (!this.target || !this.securityOrigin) {
            this.quotaOverrideErrorMessage.textContent = i18nString(UIStrings.internalError);
            return;
        }
        this.quotaOverrideErrorMessage.textContent = '';
        const editorString = this.quotaOverrideEditor.value;
        if (editorString === '') {
            await this.clearQuotaForOrigin(this.target, this.securityOrigin);
            this.previousOverrideFieldValue = '';
            return;
        }
        const quota = parseFloat(editorString);
        if (!Number.isFinite(quota)) {
            this.quotaOverrideErrorMessage.textContent = i18nString(UIStrings.pleaseEnterANumber);
            return;
        }
        if (quota < 0) {
            this.quotaOverrideErrorMessage.textContent = i18nString(UIStrings.numberMustBeNonNegative);
            return;
        }
        const cutoff = 9_000_000_000_000;
        if (quota >= cutoff) {
            this.quotaOverrideErrorMessage.textContent =
                i18nString(UIStrings.numberMustBeSmaller, { PH1: cutoff.toLocaleString() });
            return;
        }
        const bytesPerMB = 1000 * 1000;
        const quotaInBytes = Math.round(quota * bytesPerMB);
        const quotaFieldValue = `${quotaInBytes / bytesPerMB}`;
        this.quotaOverrideEditor.value = quotaFieldValue;
        this.previousOverrideFieldValue = quotaFieldValue;
        await this.target.storageAgent().invoke_overrideQuotaForOrigin({ origin: this.securityOrigin, quotaSize: quotaInBytes });
    }
    async clearQuotaForOrigin(target, origin) {
        await target.storageAgent().invoke_overrideQuotaForOrigin({ origin });
    }
    async onClickCheckbox() {
        if (this.quotaOverrideControlRow.classList.contains('hidden')) {
            this.quotaOverrideControlRow.classList.remove('hidden');
            this.quotaOverrideCheckbox.checked = true;
            this.quotaOverrideEditor.value = this.previousOverrideFieldValue;
            window.setTimeout(() => this.quotaOverrideEditor.focus(), 500);
        }
        else if (this.target && this.securityOrigin) {
            this.quotaOverrideControlRow.classList.add('hidden');
            this.quotaOverrideCheckbox.checked = false;
            await this.clearQuotaForOrigin(this.target, this.securityOrigin);
            this.quotaOverrideErrorMessage.textContent = '';
        }
    }
    clear() {
        if (!this.securityOrigin) {
            return;
        }
        const selectedStorageTypes = [];
        for (const type of this.settings.keys()) {
            const setting = this.settings.get(type);
            if (setting?.get()) {
                selectedStorageTypes.push(type);
            }
        }
        if (this.target) {
            const includeThirdPartyCookies = this.includeThirdPartyCookiesSetting.get();
            StorageView.clear(this.target, this.storageKey, this.securityOrigin, selectedStorageTypes, includeThirdPartyCookies);
        }
        this.clearButton.disabled = true;
        const label = this.clearButton.textContent;
        this.clearButton.textContent = i18nString(UIStrings.clearing);
        window.setTimeout(() => {
            this.clearButton.disabled = false;
            this.clearButton.textContent = label;
            this.clearButton.focus();
        }, 500);
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.SiteDataCleared));
    }
    static clear(target, storageKey, originForCookies, selectedStorageTypes, includeThirdPartyCookies) {
        console.assert(Boolean(storageKey));
        if (!storageKey) {
            return;
        }
        void target.storageAgent().invoke_clearDataForStorageKey({ storageKey, storageTypes: selectedStorageTypes.join(',') });
        const set = new Set(selectedStorageTypes);
        const hasAll = set.has("all" /* Protocol.Storage.StorageType.All */);
        if (set.has("local_storage" /* Protocol.Storage.StorageType.Local_storage */) || hasAll) {
            const storageModel = target.model(DOMStorageModel);
            if (storageModel) {
                storageModel.clearForStorageKey(storageKey);
            }
        }
        if (set.has("indexeddb" /* Protocol.Storage.StorageType.Indexeddb */) || hasAll) {
            for (const target of SDK.TargetManager.TargetManager.instance().targets()) {
                const indexedDBModel = target.model(IndexedDBModel);
                if (indexedDBModel) {
                    indexedDBModel.clearForStorageKey(storageKey);
                }
            }
        }
        if (originForCookies && (set.has("cookies" /* Protocol.Storage.StorageType.Cookies */) || hasAll)) {
            void target.storageAgent().invoke_clearDataForOrigin({ origin: originForCookies, storageTypes: "cookies" /* Protocol.Storage.StorageType.Cookies */ });
            const cookieModel = target.model(SDK.CookieModel.CookieModel);
            if (cookieModel) {
                void cookieModel.clear(undefined, includeThirdPartyCookies ? undefined : originForCookies);
            }
        }
        if (set.has("cache_storage" /* Protocol.Storage.StorageType.Cache_storage */) || hasAll) {
            const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
            const model = target?.model(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel);
            if (model) {
                model.clearForStorageKey(storageKey);
            }
        }
    }
    async performUpdate() {
        if (!this.securityOrigin || !this.target) {
            this.quotaRow.textContent = '';
            this.populatePieChart(0, []);
            return;
        }
        const securityOrigin = this.securityOrigin;
        const response = await this.target.storageAgent().invoke_getUsageAndQuota({ origin: securityOrigin });
        this.quotaRow.textContent = '';
        if (response.getError()) {
            this.populatePieChart(0, []);
            return;
        }
        const quotaOverridden = response.overrideActive;
        const quotaAsString = i18n.ByteUtilities.bytesToString(response.quota);
        const usageAsString = i18n.ByteUtilities.bytesToString(response.usage);
        const formattedQuotaAsString = i18nString(UIStrings.storageWithCustomMarker, { PH1: quotaAsString });
        const quota = quotaOverridden ? UI.Fragment.Fragment.build `<b>${formattedQuotaAsString}</b>`.element() : quotaAsString;
        const element = uiI18n.getFormatLocalizedString(str_, UIStrings.storageQuotaUsed, { PH1: usageAsString, PH2: quota });
        this.quotaRow.appendChild(element);
        UI.Tooltip.Tooltip.install(this.quotaRow, i18nString(UIStrings.storageQuotaUsedWithBytes, { PH1: response.usage.toLocaleString(), PH2: response.quota.toLocaleString() }));
        if (!response.overrideActive && response.quota < 125829120) { // 120 MB
            const icon = new Icon();
            icon.name = 'info';
            icon.style.color = 'var(--icon-info)';
            icon.classList.add('small');
            UI.Tooltip.Tooltip.install(this.quotaRow, i18nString(UIStrings.storageQuotaIsLimitedIn));
            this.quotaRow.appendChild(icon);
        }
        if (this.quotaUsage === null || this.quotaUsage !== response.usage) {
            this.quotaUsage = response.usage;
            const slices = [];
            for (const usageForType of response.usageBreakdown.sort((a, b) => b.usage - a.usage)) {
                const value = usageForType.usage;
                if (!value) {
                    continue;
                }
                const title = this.getStorageTypeName(usageForType.storageType);
                const color = this.pieColors.get(usageForType.storageType) || '#ccc';
                slices.push({ value, color, title });
            }
            this.populatePieChart(response.usage, slices);
        }
        void this.throttler.schedule(this.requestUpdate.bind(this));
    }
    populatePieChart(total, slices) {
        this.pieChart.data = {
            chartName: i18nString(UIStrings.storageUsage),
            size: 110,
            formatter: i18n.ByteUtilities.bytesToString,
            showLegend: true,
            total,
            slices,
        };
    }
    getStorageTypeName(type) {
        switch (type) {
            case "file_systems" /* Protocol.Storage.StorageType.File_systems */:
                return i18nString(UIStrings.fileSystem);
            case "indexeddb" /* Protocol.Storage.StorageType.Indexeddb */:
                return i18nString(UIStrings.indexDB);
            case "cache_storage" /* Protocol.Storage.StorageType.Cache_storage */:
                return i18nString(UIStrings.cacheStorage);
            case "service_workers" /* Protocol.Storage.StorageType.Service_workers */:
                return i18nString(UIStrings.serviceWorkers);
            default:
                return i18nString(UIStrings.other);
        }
    }
}
export const AllStorageTypes = [
    "cache_storage" /* Protocol.Storage.StorageType.Cache_storage */,
    "cookies" /* Protocol.Storage.StorageType.Cookies */,
    "indexeddb" /* Protocol.Storage.StorageType.Indexeddb */,
    "local_storage" /* Protocol.Storage.StorageType.Local_storage */,
    "service_workers" /* Protocol.Storage.StorageType.Service_workers */,
];
export class ActionDelegate {
    handleAction(_context, actionId) {
        switch (actionId) {
            case 'resources.clear':
                return this.handleClear(false);
            case 'resources.clear-incl-third-party-cookies':
                return this.handleClear(true);
        }
        return false;
    }
    handleClear(includeThirdPartyCookies) {
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!target) {
            return false;
        }
        const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
        if (!resourceTreeModel) {
            return false;
        }
        const securityOrigin = resourceTreeModel.getMainSecurityOrigin();
        resourceTreeModel.getMainStorageKey().then(storageKey => {
            StorageView.clear(target, storageKey, securityOrigin, AllStorageTypes, includeThirdPartyCookies);
        }, _ => { });
        return true;
    }
}
//# sourceMappingURL=StorageView.js.map
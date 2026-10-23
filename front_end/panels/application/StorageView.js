// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import { Icon, Link } from '../../ui/kit/kit.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { IndexedDBModel } from './IndexedDBModel.js';
import { ResourcesPanel } from './ResourcesPanel.js';
import storageViewStyles from './storageView.css.js';
const { ref } = Directives;
const { bindToSetting } = UI.UIUtils;
const UIStrings = {
    /**
     * @description Text in the storage view that expresses the amount of used and available storage quota.
     * @example {1.5 MB} PH1
     * @example {123.1 MB} PH2
     */
    storageQuotaUsed: '{PH1} used out of {PH2} storage quota',
    /**
     * @description Tooltip in the storage view that expresses the precise amount of used and available storage quota.
     * @example {200} PH1
     * @example {400} PH2
     */
    storageQuotaUsedWithBytes: '{PH1} bytes used out of {PH2} bytes storage quota',
    /**
     * @description Fragment indicating that a certain data size has been custom configured.
     * @example {1.5 MB} PH1
     */
    storageWithCustomMarker: '{PH1} (custom)',
    /**
     * @description Title text of the storage view in the Application panel.
     */
    storageTitle: 'Storage',
    /**
     * @description Section title in the storage view of the Application panel.
     */
    usage: 'Usage',
    /**
     * @description Unit for data size in DevTools.
     */
    mb: 'MB',
    /**
     * @description Link text to learn more about Progressive Web Apps in the storage view of the Application panel.
     */
    learnMore: 'Learn more',
    /**
     * @description Section title in the storage view of the Application panel for clearing site-specific storage.
     */
    clearSiteData: 'Clear site data',
    /**
     * @description Button text in the storage view of the Application panel for clearing selected site-specific storage.
     */
    clearSelected: 'Clear selected',
    /**
     * @description Screen reader announcement when the clear site data task is complete.
     */
    SiteDataCleared: 'Site data cleared',
    /**
     * @description Checkbox label in the storage view of the Application panel for unregistering service workers.
     */
    unregisterServiceWorker: 'Unregister service workers',
    /**
     * @description Checkbox label in the storage view of the Application panel for clearing local and session storage.
     */
    localAndSessionStorage: 'Local and session storage',
    /**
     * @description Checkbox label in the storage view of the Application panel for clearing IndexedDB storage.
     */
    indexDB: 'IndexedDB',
    /**
     * @description Checkbox label in the storage view of the Application panel for clearing cookies.
     */
    cookies: 'Cookies',
    /**
     * @description Checkbox label in the storage view of the Application panel for clearing cache storage.
     */
    cacheStorage: 'Cache storage',
    /**
     * @description Checkbox label in the storage view of the Application panel for including third-party cookies.
     */
    thirdPartyCookies: 'Third-party cookies',
    /**
     * @description Text for error message in the storage view of the Application panel when an origin fails to load.
     * @example {https://example.com} PH1
     */
    sFailedToLoad: '{PH1} (failed to load)',
    /**
     * @description Error message in the storage view of the Application panel when a quota override fails.
     */
    internalError: 'Internal error',
    /**
     * @description Error message in the storage view of the Application panel when custom quota is not a number.
     */
    pleaseEnterANumber: 'Enter a number',
    /**
     * @description Error message in the storage view of the Application panel when custom quota is negative.
     */
    numberMustBeNonNegative: 'Number must be non-negative',
    /**
     * @description Error message in the storage view of the Application panel when custom quota is too large.
     * @example {9000000000000} PH1
     */
    numberMustBeSmaller: 'Number must be smaller than {PH1}',
    /**
     * @description Button text for the clear button in the storage view of the Application panel while clearing is in progress.
     */
    clearing: 'Clearing…',
    /**
     * @description Tooltip text in the storage view of the Application panel indicating storage quota is limited in Incognito mode.
     */
    storageQuotaIsLimitedIn: 'Storage quota is limited in Incognito mode',
    /**
     * @description Category name for file system storage in the storage view of the Application panel.
     */
    fileSystem: 'File system',
    /**
     * @description Category name for other storage types in the storage view of the Application panel.
     */
    other: 'Other',
    /**
     * @description Chart title for the storage usage pie chart in the storage view of the Application panel.
     */
    storageUsage: 'Storage usage',
    /**
     * @description Category name for service worker storage in the storage view of the Application panel.
     */
    serviceWorkers: 'Service workers',
    /**
     * @description Checkbox label in the storage view of the Application panel to simulate custom storage quota.
     */
    simulateCustomStorage: 'Simulate custom storage quota',
    /**
     * @description Category name for local storage in the storage view of the Application panel.
     */
    localStorage: 'Local storage',
    /**
     * @description Category name for session storage in the storage view of the Application panel.
     */
    sessionStorage: 'Session storage',
};
export const storagePieColors = new Map([
    ["cache_storage" /* Protocol.Storage.StorageType.Cache_storage */, 'rgb(229, 113, 113)'], // red
    ["cookies" /* Protocol.Storage.StorageType.Cookies */, 'rgb(239, 196, 87)'], // yellow
    ["indexeddb" /* Protocol.Storage.StorageType.Indexeddb */, 'rgb(155, 127, 230)'], // purple
    ["local_storage" /* Protocol.Storage.StorageType.Local_storage */, 'rgb(116, 178, 102)'], // green
    ["service_workers" /* Protocol.Storage.StorageType.Service_workers */, 'rgb(255, 167, 36)'], // orange
]);
const str_ = i18n.i18n.registerUIStrings('panels/application/StorageView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const CLEAR_SITE_DATA_DEFAULT_VIEW = (input, output, target) => {
    function renderSettingCheckbox(title, settingName, className) {
        const setting = input.settings.get(settingName);
        if (!setting) {
            throw new Error(`Missing setting for storage type: ${settingName}`);
        }
        return html `<devtools-checkbox class=${className} title=${title} ${bindToSetting(setting)}>${title}</devtools-checkbox>`;
    }
    // clang-format off
    render(html `
    <div class="report-row clear-site-data-checkboxes-row">
      <div class="clear-site-data-checkbox-column">
        ${renderSettingCheckbox(i18nString(UIStrings.cacheStorage), "cache_storage" /* Protocol.Storage.StorageType.Cache_storage */, 'cache-storage-checkbox')}
        ${renderSettingCheckbox(i18nString(UIStrings.fileSystem), "file_systems" /* Protocol.Storage.StorageType.File_systems */, 'file-systems-checkbox')}
        ${renderSettingCheckbox(i18nString(UIStrings.indexDB), "indexeddb" /* Protocol.Storage.StorageType.Indexeddb */, 'indexeddb-checkbox')}
        ${renderSettingCheckbox(i18nString(UIStrings.localAndSessionStorage), "local_storage" /* Protocol.Storage.StorageType.Local_storage */, 'local-and-session-storage-checkbox')}
      </div>
      <div class="clear-site-data-checkbox-column">
        ${renderSettingCheckbox(i18nString(UIStrings.unregisterServiceWorker), "service_workers" /* Protocol.Storage.StorageType.Service_workers */, 'unregister-service-worker-checkbox')}
        ${renderSettingCheckbox(i18nString(UIStrings.cookies), "cookies" /* Protocol.Storage.StorageType.Cookies */, 'cookies-checkbox cookies-row')}
        <div class="include-third-party-cookies-row">
          <devtools-checkbox class="third-party-cookies-checkbox"
              title=${i18nString(UIStrings.thirdPartyCookies)}
              ?disabled=${input.includeThirdPartyCookiesDisabled}
              ${bindToSetting(input.includeThirdPartyCookiesSetting)}>
            ${i18nString(UIStrings.thirdPartyCookies)}
          </devtools-checkbox>
        </div>
      </div>
    </div>
    <div class="report-row clear-selected-button-row">
      <devtools-button id="storage-view-clear-button"
          .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
          .disabled=${input.clearing}
          .jslogContext=${'storage.clear-site-data'}
          @click=${input.onClear}
          ${ref(e => {
        output.focusClearButton = e instanceof HTMLElement ? () => e.focus() : undefined;
    })}
          >${input.clearing ? i18nString(UIStrings.clearing) : i18nString(UIStrings.clearSelected)}</devtools-button>
    </div>`, target);
    // clang-format on
};
/**
 * @implements {SDK.TargetManager.Observer}
 */
export class StorageView extends UI.Widget.VBox {
    pieColors;
    reportView;
    target = null;
    securityOrigin = null;
    storageKey = null;
    subtitle = null;
    settings;
    includeThirdPartyCookiesSetting;
    clearSiteDataView;
    clearSiteDataViewOutput = {};
    clearSiteDataFieldList;
    quotaRow;
    quotaUsage = null;
    quotaQuota = null;
    quotaOverrideActive = null;
    pieChartSlices = [];
    pieChart;
    previousOverrideFieldValue = '';
    quotaOverrideEnabled = false;
    quotaOverrideError = '';
    quotaOverrideCheckbox;
    quotaOverrideControlRow;
    quotaOverrideEditor;
    quotaOverrideErrorMessage;
    clearing = false;
    clearTimerId;
    throttler = new Common.Throttler.Throttler(1000);
    boundOnCookiesSettingChanged = (event) => {
        this.onCookiesSettingChanged(event.data);
    };
    boundOnIncludeThirdPartyCookiesSettingChanged = (event) => {
        this.onIncludeThirdPartyCookiesSettingChanged(event.data);
    };
    constructor(clearSiteDataView = CLEAR_SITE_DATA_DEFAULT_VIEW) {
        super({ useShadowDom: true });
        this.registerRequiredCSS(storageViewStyles);
        this.clearSiteDataView = clearSiteDataView;
        this.contentElement.classList.add('clear-storage-container');
        this.contentElement.setAttribute('jslog', `${VisualLogging.pane('clear-storage')}`);
        this.pieColors = storagePieColors;
        // TODO(crbug.com/1156978): Replace UI.ReportView.ReportView with ReportView.ts web component.
        this.reportView = new UI.ReportView.ReportView(i18nString(UIStrings.storageTitle));
        this.reportView.registerRequiredCSS(storageViewStyles);
        this.reportView.element.classList.add('clear-storage-header');
        this.reportView.show(this.contentElement);
        this.settings = new Map();
        for (const type of AllStorageTypes) {
            this.settings.set(type, Common.Settings.Settings.instance().createSetting('clear-storage-' + Platform.StringUtilities.toKebabCase(type), true));
        }
        this.includeThirdPartyCookiesSetting =
            Common.Settings.Settings.instance().createSetting('clear-storage-include-third-party-cookies', false);
        const clearSiteData = this.reportView.appendSection(i18nString(UIStrings.clearSiteData));
        clearSiteData.element.setAttribute('jslog', `${VisualLogging.section('clear-storage')}`);
        this.clearSiteDataFieldList = clearSiteData.getFieldElement();
        clearSiteData.markFieldListAsGroup();
        const quota = this.reportView.appendSection(i18nString(UIStrings.usage));
        quota.element.setAttribute('jslog', `${VisualLogging.section('usage')}`);
        this.quotaRow = quota.appendSelectableRow();
        this.quotaRow.classList.add('quota-usage-row');
        this.quotaRow.setAttribute('jslog', `${VisualLogging.item('storage-usage')}`);
        const learnMoreRow = quota.appendRow();
        const learnMore = Link.create('https://developer.chrome.com/docs/devtools/progressive-web-apps#opaque-responses', i18nString(UIStrings.learnMore), undefined, 'learn-more');
        learnMoreRow.appendChild(learnMore);
        this.pieChart = new PerfUI.PieChart.PieChart();
        const usageBreakdownRow = quota.appendRow();
        usageBreakdownRow.classList.add('usage-breakdown-row');
        usageBreakdownRow.setAttribute('jslog', `${VisualLogging.item('usage-breakdown')}`);
        usageBreakdownRow.appendChild(this.pieChart);
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
        const cookiesSetting = this.settings.get("cookies" /* Protocol.Storage.StorageType.Cookies */);
        this.onCookiesSettingChanged(Boolean(cookiesSetting?.get()));
        SDK.TargetManager.TargetManager.instance().observeTargets(this);
    }
    onCookiesSettingChanged(cookiesEnabled) {
        // Unchecking general cookies clearing must also uncheck third-party cookies.
        if (!cookiesEnabled && this.includeThirdPartyCookiesSetting.get()) {
            this.includeThirdPartyCookiesSetting.set(false);
            return;
        }
        this.requestUpdate();
    }
    onIncludeThirdPartyCookiesSettingChanged(includeThirdPartyCookiesEnabled) {
        const cookiesSetting = this.settings.get("cookies" /* Protocol.Storage.StorageType.Cookies */);
        // Checking third-party cookies requires general cookies clearing to be enabled.
        if (includeThirdPartyCookiesEnabled && cookiesSetting && !cookiesSetting.get()) {
            cookiesSetting.set(true);
            return;
        }
        this.requestUpdate();
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
    willHide() {
        super.willHide();
        const cookiesSetting = this.settings.get("cookies" /* Protocol.Storage.StorageType.Cookies */);
        cookiesSetting?.removeChangeListener(this.boundOnCookiesSettingChanged);
        this.includeThirdPartyCookiesSetting.removeChangeListener(this.boundOnIncludeThirdPartyCookiesSettingChanged);
    }
    wasHidden() {
        super.wasHidden();
        if (this.clearTimerId !== undefined) {
            window.clearTimeout(this.clearTimerId);
            this.clearTimerId = undefined;
        }
        if (this.clearing) {
            this.clearing = false;
            this.requestUpdate();
        }
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
            this.subtitle = i18nString(UIStrings.sFailedToLoad, { PH1: unreachableMainOrigin });
        }
        else {
            this.securityOrigin = mainOrigin;
            this.subtitle = mainOrigin;
        }
        if (oldOrigin !== this.securityOrigin) {
            this.quotaOverrideEnabled = false;
            this.quotaOverrideError = '';
            this.quotaUsage = null;
            this.quotaQuota = null;
            this.quotaOverrideActive = null;
            this.pieChartSlices = [];
        }
        this.requestUpdate();
        void this.refreshUsageAndQuota();
    }
    updateStorageKey(mainStorageKey) {
        const oldStorageKey = this.storageKey;
        this.storageKey = mainStorageKey;
        this.subtitle = mainStorageKey;
        if (oldStorageKey !== this.storageKey) {
            this.quotaOverrideEnabled = false;
            this.quotaOverrideError = '';
        }
        this.requestUpdate();
    }
    async applyQuotaOverrideFromInputField() {
        if (!this.target || !this.securityOrigin) {
            this.quotaOverrideError = i18nString(UIStrings.internalError);
            this.requestUpdate();
            return;
        }
        this.quotaOverrideError = '';
        this.requestUpdate();
        const editorString = this.quotaOverrideEditor.value;
        if (editorString === '') {
            await this.clearQuotaForOrigin(this.target, this.securityOrigin);
            this.previousOverrideFieldValue = '';
            return;
        }
        const quota = parseFloat(editorString);
        if (!Number.isFinite(quota)) {
            this.quotaOverrideError = i18nString(UIStrings.pleaseEnterANumber);
            this.requestUpdate();
            return;
        }
        if (quota < 0) {
            this.quotaOverrideError = i18nString(UIStrings.numberMustBeNonNegative);
            this.requestUpdate();
            return;
        }
        const cutoff = 9_000_000_000_000;
        if (quota >= cutoff) {
            this.quotaOverrideError = i18nString(UIStrings.numberMustBeSmaller, { PH1: cutoff.toLocaleString() });
            this.requestUpdate();
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
        if (!this.quotaOverrideEnabled) {
            this.quotaOverrideEnabled = true;
            this.quotaOverrideEditor.value = this.previousOverrideFieldValue;
            this.requestUpdate();
            await this.updateComplete;
            this.quotaOverrideEditor.focus();
        }
        else {
            this.quotaOverrideEnabled = false;
            this.quotaOverrideError = '';
            this.requestUpdate();
            if (this.target && this.securityOrigin) {
                await this.clearQuotaForOrigin(this.target, this.securityOrigin);
            }
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
        this.clearing = true;
        this.requestUpdate();
        window.clearTimeout(this.clearTimerId);
        this.clearTimerId = window.setTimeout(async () => {
            this.clearTimerId = undefined;
            this.clearing = false;
            this.requestUpdate();
            await this.updateComplete;
            if (this.isShowing()) {
                this.clearSiteDataViewOutput.focusClearButton?.();
            }
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
            const storageModel = target.model(SDK.DOMStorageModel.DOMStorageModel);
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
    async refreshUsageAndQuota() {
        if (!this.isShowing()) {
            return;
        }
        if (!this.securityOrigin || !this.target) {
            this.quotaUsage = null;
            this.quotaQuota = null;
            this.quotaOverrideActive = null;
            this.pieChartSlices = [];
            this.requestUpdate();
            return;
        }
        const securityOrigin = this.securityOrigin;
        const response = await this.target.storageAgent().invoke_getUsageAndQuota({ origin: securityOrigin });
        if (this.securityOrigin !== securityOrigin) {
            return;
        }
        if (response.getError()) {
            this.quotaUsage = null;
            this.quotaQuota = null;
            this.quotaOverrideActive = null;
            this.pieChartSlices = [];
            this.requestUpdate();
            if (this.isShowing()) {
                void this.throttler.schedule(() => this.refreshUsageAndQuota());
            }
            return;
        }
        const usageChanged = this.quotaUsage !== response.usage;
        const quotaChanged = this.quotaQuota !== response.quota;
        const overrideChanged = this.quotaOverrideActive !== response.overrideActive;
        if (usageChanged || quotaChanged || overrideChanged) {
            this.quotaUsage = response.usage;
            this.quotaQuota = response.quota;
            this.quotaOverrideActive = response.overrideActive;
            if (usageChanged) {
                const slices = [];
                for (const usageForType of response.usageBreakdown.sort((a, b) => b.usage - a.usage)) {
                    const value = usageForType.usage;
                    if (!value) {
                        continue;
                    }
                    const title = StorageView.getStorageTypeName(usageForType.storageType);
                    const color = this.pieColors.get(usageForType.storageType) || '#ccc';
                    slices.push({ value, color, title });
                }
                this.pieChartSlices = slices;
            }
            this.requestUpdate();
        }
        if (this.isShowing()) {
            void this.throttler.schedule(() => this.refreshUsageAndQuota());
        }
    }
    wasShown() {
        super.wasShown();
        const cookiesSetting = this.settings.get("cookies" /* Protocol.Storage.StorageType.Cookies */);
        cookiesSetting?.addChangeListener(this.boundOnCookiesSettingChanged);
        this.includeThirdPartyCookiesSetting.addChangeListener(this.boundOnIncludeThirdPartyCookiesSettingChanged);
        this.onCookiesSettingChanged(Boolean(cookiesSetting?.get()));
        void this.refreshUsageAndQuota();
    }
    performUpdate() {
        if (this.subtitle !== null) {
            this.reportView.setSubtitle(this.subtitle);
        }
        const cookiesSetting = this.settings.get("cookies" /* Protocol.Storage.StorageType.Cookies */);
        this.clearSiteDataView({
            settings: this.settings,
            includeThirdPartyCookiesSetting: this.includeThirdPartyCookiesSetting,
            includeThirdPartyCookiesDisabled: !cookiesSetting?.get(),
            clearing: this.clearing,
            onClear: () => this.clear(),
        }, this.clearSiteDataViewOutput, this.clearSiteDataFieldList);
        this.renderQuotaRow();
        this.populatePieChart();
        this.quotaOverrideControlRow.classList.toggle('hidden', !this.quotaOverrideEnabled);
        this.quotaOverrideCheckbox.checked = this.quotaOverrideEnabled;
        this.quotaOverrideErrorMessage.textContent = this.quotaOverrideError;
    }
    renderQuotaRow() {
        this.quotaRow.textContent = '';
        if (this.quotaUsage === null || this.quotaQuota === null) {
            return;
        }
        const quotaAsString = i18n.ByteUtilities.bytesToString(this.quotaQuota);
        const usageAsString = i18n.ByteUtilities.bytesToString(this.quotaUsage);
        const formattedQuotaAsString = i18nString(UIStrings.storageWithCustomMarker, { PH1: quotaAsString });
        let quota = quotaAsString;
        if (this.quotaOverrideActive) {
            const element = document.createElement('b');
            element.textContent = formattedQuotaAsString;
            quota = element;
        }
        const element = uiI18n.getFormatLocalizedString(str_, UIStrings.storageQuotaUsed, { PH1: usageAsString, PH2: quota });
        this.quotaRow.appendChild(element);
        UI.Tooltip.Tooltip.install(this.quotaRow, i18nString(UIStrings.storageQuotaUsedWithBytes, { PH1: this.quotaUsage.toLocaleString(), PH2: this.quotaQuota.toLocaleString() }));
        if (!this.quotaOverrideActive && this.quotaQuota < 125829120) { // 120 MiB
            const icon = new Icon();
            icon.name = 'info';
            icon.style.color = 'var(--icon-info)';
            icon.classList.add('small');
            UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.storageQuotaIsLimitedIn));
            this.quotaRow.appendChild(icon);
        }
    }
    populatePieChart() {
        this.pieChart.data = {
            chartName: i18nString(UIStrings.storageUsage),
            size: 110,
            formatter: i18n.ByteUtilities.bytesToString,
            showLegend: true,
            total: this.quotaUsage ?? 0,
            slices: this.pieChartSlices,
        };
    }
    static getStorageTypeName(type) {
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
    /**
     * Returns the user-facing title of a storage type for the storage breakdown widget in AI assistance.
     * This method accepts arbitrary strings to accommodate custom storage types (like session_storage)
     * that do not exist in the Protocol.Storage.StorageType enum.
     */
    static getStorageTypeNameForWidget(type) {
        switch (type) {
            case 'session_storage':
                return i18nString(UIStrings.sessionStorage);
            case 'local_storage':
                return i18nString(UIStrings.localStorage);
            case 'cookies':
                return i18nString(UIStrings.cookies);
            case 'indexeddb':
                return i18nString(UIStrings.indexDB);
            case 'cache_storage':
                return i18nString(UIStrings.cacheStorage);
            case 'service_workers':
                return i18nString(UIStrings.serviceWorkers);
            default:
                return StorageView.getStorageTypeName(type);
        }
    }
}
export const AllStorageTypes = [
    "cache_storage" /* Protocol.Storage.StorageType.Cache_storage */,
    "cookies" /* Protocol.Storage.StorageType.Cookies */,
    "file_systems" /* Protocol.Storage.StorageType.File_systems */,
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
export class StorageRevealable {
    target;
    constructor(target) {
        this.target = target;
    }
}
export class StorageRevealer {
    async reveal(_revealable) {
        const sidebar = await ResourcesPanel.showAndGetSidebar();
        sidebar.showStorage();
    }
}
//# sourceMappingURL=StorageView.js.map
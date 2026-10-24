// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/report_view/report_view.js';
import '../../ui/kit/kit.js';
import '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { IndexedDBModel } from './IndexedDBModel.js';
import { ResourcesPanel } from './ResourcesPanel.js';
import storageViewStyles from './storageView.css.js';
const { classMap, ifDefined, live, ref } = Directives;
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
export const DEFAULT_VIEW = (input, output, target) => {
    function renderSettingCheckbox(title, settingName, className) {
        const setting = input.settings.get(settingName);
        if (!setting) {
            throw new Error(`Missing setting for storage type: ${settingName}`);
        }
        return html `<devtools-checkbox class=${className} title=${title} ${bindToSetting(setting)}>${title}</devtools-checkbox>`;
    }
    function renderClearSiteData() {
        // clang-format off
        return html `
      <div class="report-section" jslog=${VisualLogging.section('clear-storage')}>
        <devtools-report-section-header role="heading" aria-level="2">
          ${i18nString(UIStrings.clearSiteData)}
        </devtools-report-section-header>
        <devtools-report-section>
          <div class="clear-site-data-checkboxes-row" role="group" aria-label=${i18nString(UIStrings.clearSiteData)}>
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
        </devtools-report-section>
        <devtools-report-section class="clear-selected-button-row">
          <devtools-button id="storage-view-clear-button"
              .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
              .disabled=${input.clearing}
              .jslogContext=${'storage.clear-site-data'}
              @click=${input.onClear}
              ${ref(e => {
            output.focusClearButton = e instanceof HTMLElement ? () => e.focus() : undefined;
        })}
              >${input.clearing ? i18nString(UIStrings.clearing) : i18nString(UIStrings.clearSelected)}</devtools-button>
        </devtools-report-section>
      </div>`;
        // clang-format on
    }
    function quotaTooltip() {
        if (input.quotaUsage === null || input.quotaQuota === null) {
            return undefined;
        }
        return i18nString(UIStrings.storageQuotaUsedWithBytes, { PH1: input.quotaUsage.toLocaleString(), PH2: input.quotaQuota.toLocaleString() });
    }
    function renderQuotaRow() {
        if (input.quotaUsage === null || input.quotaQuota === null) {
            return nothing;
        }
        const quotaAsString = i18n.ByteUtilities.bytesToString(input.quotaQuota);
        const usageAsString = i18n.ByteUtilities.bytesToString(input.quotaUsage);
        const formattedQuotaAsString = i18nString(UIStrings.storageWithCustomMarker, { PH1: quotaAsString });
        const quota = input.quotaOverrideActive ? html `<b>${formattedQuotaAsString}</b>` : quotaAsString;
        // clang-format off
        return html `
      ${uiI18n.getFormatLocalizedStringTemplate(str_, UIStrings.storageQuotaUsed, { PH1: usageAsString, PH2: quota })}
      ${!input.quotaOverrideActive && input.quotaQuota < 125829120 /* 120 MiB */ ? html `
        <devtools-icon name="info" class="small" style="color: var(--icon-info)"
            title=${i18nString(UIStrings.storageQuotaIsLimitedIn)}></devtools-icon>` : nothing}`;
        // clang-format on
    }
    function renderUsage() {
        const pieChartData = {
            chartName: i18nString(UIStrings.storageUsage),
            size: 110,
            formatter: i18n.ByteUtilities.bytesToString,
            showLegend: true,
            total: input.quotaUsage ?? 0,
            slices: input.pieChartSlices,
        };
        const onEditorInput = (event) => {
            input.onQuotaOverrideInput(event.target.value);
        };
        const onEditorKeyUp = (event) => {
            if (event.key === 'Enter' && !event.isComposing) {
                input.onApplyQuotaOverride(event.target.value);
                event.consume(true);
            }
        };
        const onEditorFocusOut = (event) => {
            input.onApplyQuotaOverride(event.target.value);
            event.consume(true);
        };
        // clang-format off
        return html `
      <div class="report-section" jslog=${VisualLogging.section('usage')}>
        <devtools-report-section-header role="heading" aria-level="2">
          ${i18nString(UIStrings.usage)}
        </devtools-report-section-header>
        <devtools-report-section class="quota-usage-row" jslog=${VisualLogging.item('storage-usage')}
            title=${ifDefined(quotaTooltip())}>${renderQuotaRow()}</devtools-report-section>
        <devtools-report-section>
          <devtools-link href="https://developer.chrome.com/docs/devtools/progressive-web-apps#opaque-responses"
              jslogcontext="learn-more">${i18nString(UIStrings.learnMore)}</devtools-link>
        </devtools-report-section>
        <devtools-report-section class="usage-breakdown-row" jslog=${VisualLogging.item('usage-breakdown')}>
          <devtools-perf-piechart .data=${pieChartData}></devtools-perf-piechart>
        </devtools-report-section>
        <devtools-report-section class="quota-override-row">
          <devtools-checkbox .checked=${live(input.quotaOverrideEnabled)}
              title=${i18nString(UIStrings.simulateCustomStorage)}
              @change=${input.onToggleQuotaOverride}
              jslog=${VisualLogging.toggle('simulate-custom-quota').track({ change: true })}>
            ${i18nString(UIStrings.simulateCustomStorage)}
          </devtools-checkbox>
        </devtools-report-section>
        <devtools-report-section class=${classMap({ hidden: !input.quotaOverrideEnabled })}>
          <input class="quota-override-notification-editor"
              aria-label=${i18nString(UIStrings.simulateCustomStorage)}
              placeholder=${i18nString(UIStrings.pleaseEnterANumber)}
              .value=${live(input.quotaOverrideValue)}
              @input=${onEditorInput}
              @keyup=${onEditorKeyUp}
              @focusout=${onEditorFocusOut}
              ${ref(e => {
            output.focusQuotaOverrideEditor = e instanceof HTMLElement ? () => e.focus() : undefined;
        })}
              jslog=${VisualLogging.textField('quota-override').track({ change: true })}>
          <label>${i18nString(UIStrings.mb)}</label>
        </devtools-report-section>
        <devtools-report-section><div class="quota-override-error">${input.quotaOverrideError}</div></devtools-report-section>
      </div>`;
        // clang-format on
    }
    // clang-format off
    render(html `
    <devtools-report class="clear-storage-header" .data=${{ reportTitle: i18nString(UIStrings.storageTitle) }}>
      ${input.subtitle ? html `<div class="report-subtitle" slot="toolbar">${input.subtitle}</div>` : nothing}
      ${renderClearSiteData()}
      <devtools-report-divider></devtools-report-divider>
      ${renderUsage()}
    </devtools-report>`, target);
    // clang-format on
};
/**
 * @implements {SDK.TargetManager.Observer}
 */
export class StorageView extends UI.Widget.VBox {
    #view;
    #viewOutput = {};
    pieColors;
    target = null;
    securityOrigin = null;
    storageKey = null;
    subtitle = '';
    settings;
    includeThirdPartyCookiesSetting;
    quotaUsage = null;
    quotaQuota = null;
    quotaOverrideActive = null;
    pieChartSlices = [];
    previousOverrideFieldValue = '';
    quotaOverrideFieldValue = '';
    quotaOverrideEnabled = false;
    quotaOverrideError = '';
    clearing = false;
    clearTimerId;
    throttler = new Common.Throttler.Throttler(1000);
    boundOnCookiesSettingChanged = (event) => {
        this.onCookiesSettingChanged(event.data);
    };
    boundOnIncludeThirdPartyCookiesSettingChanged = (event) => {
        this.onIncludeThirdPartyCookiesSettingChanged(event.data);
    };
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true, jslog: `${VisualLogging.pane('clear-storage')}` });
        this.#view = view;
        this.registerRequiredCSS(storageViewStyles);
        this.pieColors = storagePieColors;
        this.settings = new Map();
        for (const type of AllStorageTypes) {
            this.settings.set(type, Common.Settings.Settings.instance().createSetting('clear-storage-' + Platform.StringUtilities.toKebabCase(type), true));
        }
        this.includeThirdPartyCookiesSetting =
            Common.Settings.Settings.instance().createSetting('clear-storage-include-third-party-cookies', false);
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
    async applyQuotaOverrideFromInputField(editorString) {
        this.quotaOverrideFieldValue = editorString;
        if (!this.target || !this.securityOrigin) {
            this.quotaOverrideError = i18nString(UIStrings.internalError);
            this.requestUpdate();
            return;
        }
        this.quotaOverrideError = '';
        if (editorString === '') {
            await this.clearQuotaForOrigin(this.target, this.securityOrigin);
            this.previousOverrideFieldValue = '';
            this.requestUpdate();
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
        this.previousOverrideFieldValue = quotaFieldValue;
        this.quotaOverrideFieldValue = quotaFieldValue;
        this.requestUpdate();
        await this.target.storageAgent().invoke_overrideQuotaForOrigin({ origin: this.securityOrigin, quotaSize: quotaInBytes });
    }
    async clearQuotaForOrigin(target, origin) {
        await target.storageAgent().invoke_overrideQuotaForOrigin({ origin });
    }
    async onClickCheckbox() {
        if (!this.quotaOverrideEnabled) {
            this.quotaOverrideEnabled = true;
            this.quotaOverrideFieldValue = this.previousOverrideFieldValue;
            this.requestUpdate();
            await this.updateComplete;
            this.#viewOutput.focusQuotaOverrideEditor?.();
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
                this.#viewOutput.focusClearButton?.();
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
        const cookiesSetting = this.settings.get("cookies" /* Protocol.Storage.StorageType.Cookies */);
        this.#view({
            subtitle: this.subtitle,
            settings: this.settings,
            includeThirdPartyCookiesSetting: this.includeThirdPartyCookiesSetting,
            includeThirdPartyCookiesDisabled: !cookiesSetting?.get(),
            clearing: this.clearing,
            quotaUsage: this.quotaUsage,
            quotaQuota: this.quotaQuota,
            quotaOverrideActive: this.quotaOverrideActive,
            pieChartSlices: this.pieChartSlices,
            quotaOverrideEnabled: this.quotaOverrideEnabled,
            quotaOverrideValue: this.quotaOverrideFieldValue,
            quotaOverrideError: this.quotaOverrideError,
            onClear: () => this.clear(),
            onToggleQuotaOverride: () => {
                void this.onClickCheckbox();
            },
            onQuotaOverrideInput: value => {
                this.quotaOverrideFieldValue = value;
            },
            onApplyQuotaOverride: value => {
                void this.applyQuotaOverrideFromInputField(value);
            },
        }, this.#viewOutput, this.contentElement);
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
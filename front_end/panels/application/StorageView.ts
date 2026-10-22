// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import '../../ui/kit/kit.js';
import '../../ui/legacy/components/perf_ui/perf_ui.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {IndexedDBModel} from './IndexedDBModel.js';
import {ResourcesPanel} from './ResourcesPanel.js';
import storageViewStyles from './storageView.css.js';

const {classMap, ifDefined, live, ref} = Directives;
const {bindToSetting} = UI.UIUtils;

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
} as const;

export const storagePieColors: Map<Protocol.Storage.StorageType, string> =
    new Map<Protocol.Storage.StorageType, string>([
      [Protocol.Storage.StorageType.Cache_storage, 'rgb(229, 113, 113)'],   // red
      [Protocol.Storage.StorageType.Cookies, 'rgb(239, 196, 87)'],          // yellow
      [Protocol.Storage.StorageType.Indexeddb, 'rgb(155, 127, 230)'],       // purple
      [Protocol.Storage.StorageType.Local_storage, 'rgb(116, 178, 102)'],   // green
      [Protocol.Storage.StorageType.Service_workers, 'rgb(255, 167, 36)'],  // orange
    ]);

const str_ = i18n.i18n.registerUIStrings('panels/application/StorageView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ClearSiteDataViewInput {
  settings: Map<Protocol.Storage.StorageType, Common.Settings.Setting<boolean>>;
  includeThirdPartyCookiesSetting: Common.Settings.Setting<boolean>;
  includeThirdPartyCookiesDisabled: boolean;
  clearing: boolean;
  onClear: () => void;
}

export interface ClearSiteDataViewOutput {
  focusClearButton?: () => void;
}

export type ClearSiteDataView = (input: ClearSiteDataViewInput, output: ClearSiteDataViewOutput, target: HTMLElement) =>
    void;

export const CLEAR_SITE_DATA_DEFAULT_VIEW: ClearSiteDataView = (input, output, target) => {
  function renderSettingCheckbox(title: Platform.UIString.LocalizedString, settingName: Protocol.Storage.StorageType,
                                 className: string): LitTemplate {
    const setting = input.settings.get(settingName);
    if (!setting) {
      throw new Error(`Missing setting for storage type: ${settingName}`);
    }
    return html`<devtools-checkbox class=${className} title=${title} ${bindToSetting(setting)}>${
        title}</devtools-checkbox>`;
  }

  // clang-format off
  render(html`
    <div class="report-row clear-site-data-checkboxes-row">
      <div class="clear-site-data-checkbox-column">
        ${renderSettingCheckbox(i18nString(UIStrings.cacheStorage), Protocol.Storage.StorageType.Cache_storage, 'cache-storage-checkbox')}
        ${renderSettingCheckbox(i18nString(UIStrings.fileSystem), Protocol.Storage.StorageType.File_systems, 'file-systems-checkbox')}
        ${renderSettingCheckbox(i18nString(UIStrings.indexDB), Protocol.Storage.StorageType.Indexeddb, 'indexeddb-checkbox')}
        ${renderSettingCheckbox(i18nString(UIStrings.localAndSessionStorage), Protocol.Storage.StorageType.Local_storage, 'local-and-session-storage-checkbox')}
      </div>
      <div class="clear-site-data-checkbox-column">
        ${renderSettingCheckbox(i18nString(UIStrings.unregisterServiceWorker), Protocol.Storage.StorageType.Service_workers, 'unregister-service-worker-checkbox')}
        ${renderSettingCheckbox(i18nString(UIStrings.cookies), Protocol.Storage.StorageType.Cookies, 'cookies-checkbox cookies-row')}
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
          .variant=${Buttons.Button.Variant.OUTLINED}
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

export interface UsageViewInput {
  quotaUsage: number|null;
  quotaQuota: number|null;
  quotaOverrideActive: boolean|null;
  pieChartSlices: PerfUI.PieChart.Slice[];
  quotaOverrideEnabled: boolean;
  quotaOverrideValue: string;
  quotaOverrideError: string;
  onToggleQuotaOverride: () => void;
  onQuotaOverrideInput: (value: string) => void;
  onApplyQuotaOverride: (value: string) => void;
}

export interface UsageViewOutput {
  focusQuotaOverrideEditor?: () => void;
}

export type UsageView = (input: UsageViewInput, output: UsageViewOutput, target: HTMLElement) => void;

export const USAGE_DEFAULT_VIEW: UsageView = (input, output, target) => {
  function quotaTooltip(): string|undefined {
    if (input.quotaUsage === null || input.quotaQuota === null) {
      return undefined;
    }
    return i18nString(UIStrings.storageQuotaUsedWithBytes,
                      {PH1: input.quotaUsage.toLocaleString(), PH2: input.quotaQuota.toLocaleString()});
  }

  function renderQuotaRow(): LitTemplate {
    if (input.quotaUsage === null || input.quotaQuota === null) {
      return nothing;
    }
    const quotaAsString = i18n.ByteUtilities.bytesToString(input.quotaQuota);
    const usageAsString = i18n.ByteUtilities.bytesToString(input.quotaUsage);
    const formattedQuotaAsString = i18nString(UIStrings.storageWithCustomMarker, {PH1: quotaAsString});
    const quota = input.quotaOverrideActive ? html`<b>${formattedQuotaAsString}</b>` : quotaAsString;
    // clang-format off
    return html`
      ${uiI18n.getFormatLocalizedStringTemplate(str_, UIStrings.storageQuotaUsed, {PH1: usageAsString, PH2: quota})}
      ${!input.quotaOverrideActive && input.quotaQuota < 125829120 /* 120 MiB */ ? html`
        <devtools-icon name="info" class="small" style="color: var(--icon-info)"
            title=${i18nString(UIStrings.storageQuotaIsLimitedIn)}></devtools-icon>` : nothing}`;
    // clang-format on
  }

  const pieChartData: PerfUI.PieChart.PieChartData = {
    chartName: i18nString(UIStrings.storageUsage),
    size: 110,
    formatter: i18n.ByteUtilities.bytesToString,
    showLegend: true,
    total: input.quotaUsage ?? 0,
    slices: input.pieChartSlices,
  };
  const onEditorInput = (event: Event): void => {
    input.onQuotaOverrideInput((event.target as HTMLInputElement).value);
  };
  const onEditorKeyUp = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && !event.isComposing) {
      input.onApplyQuotaOverride((event.target as HTMLInputElement).value);
      event.consume(true);
    }
  };
  const onEditorFocusOut = (event: FocusEvent): void => {
    input.onApplyQuotaOverride((event.target as HTMLInputElement).value);
    event.consume(true);
  };
  // clang-format off
  render(html`
    <div class="report-row report-row-selectable quota-usage-row" jslog=${VisualLogging.item('storage-usage')}
        title=${ifDefined(quotaTooltip())}>${renderQuotaRow()}</div>
    <div class="report-row">
      <devtools-link href="https://developer.chrome.com/docs/devtools/progressive-web-apps#opaque-responses"
          jslogcontext="learn-more">${i18nString(UIStrings.learnMore)}</devtools-link>
    </div>
    <div class="report-row usage-breakdown-row" jslog=${VisualLogging.item('usage-breakdown')}>
      <devtools-perf-piechart .data=${pieChartData}></devtools-perf-piechart>
    </div>
    <div class="report-row quota-override-row">
      <devtools-checkbox .checked=${live(input.quotaOverrideEnabled)}
          title=${i18nString(UIStrings.simulateCustomStorage)}
          @change=${input.onToggleQuotaOverride}
          jslog=${VisualLogging.toggle('simulate-custom-quota').track({change: true})}>
        ${i18nString(UIStrings.simulateCustomStorage)}
      </devtools-checkbox>
    </div>
    <div class=${classMap({'report-row': true, hidden: !input.quotaOverrideEnabled})}>
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
          jslog=${VisualLogging.textField('quota-override').track({change: true})}>
      <label>${i18nString(UIStrings.mb)}</label>
    </div>
    <div class="report-row"><div class="quota-override-error">${input.quotaOverrideError}</div></div>`, target);
  // clang-format on
};

/**
 * @implements {SDK.TargetManager.Observer}
 */
export class StorageView extends UI.Widget.VBox {
  private pieColors: Map<Protocol.Storage.StorageType, string>;
  private reportView: UI.ReportView.ReportView;
  private target: SDK.Target.Target|null = null;
  private securityOrigin: string|null = null;
  private storageKey: string|null = null;
  private subtitle: string|null = null;
  private settings: Map<Protocol.Storage.StorageType, Common.Settings.Setting<boolean>>;
  private includeThirdPartyCookiesSetting: Common.Settings.Setting<boolean>;
  private readonly clearSiteDataView: ClearSiteDataView;
  private readonly clearSiteDataViewOutput: ClearSiteDataViewOutput = {};
  private readonly clearSiteDataFieldList: HTMLElement;
  private readonly usageView: UsageView;
  private readonly usageViewOutput: UsageViewOutput = {};
  private readonly usageFieldList: HTMLElement;
  private quotaUsage: number|null = null;
  private quotaQuota: number|null = null;
  private quotaOverrideActive: boolean|null = null;
  private pieChartSlices: PerfUI.PieChart.Slice[] = [];
  private previousOverrideFieldValue = '';
  private quotaOverrideFieldValue = '';
  private quotaOverrideEnabled = false;
  private quotaOverrideError = '';
  private clearing = false;
  private clearTimerId?: number;
  private readonly throttler = new Common.Throttler.Throttler(1000);
  private readonly boundOnCookiesSettingChanged = (event: Common.EventTarget.EventTargetEvent<boolean>): void => {
    this.onCookiesSettingChanged(event.data);
  };
  private readonly boundOnIncludeThirdPartyCookiesSettingChanged =
      (event: Common.EventTarget.EventTargetEvent<boolean>): void => {
        this.onIncludeThirdPartyCookiesSettingChanged(event.data);
      };

  constructor(clearSiteDataView: ClearSiteDataView = CLEAR_SITE_DATA_DEFAULT_VIEW,
              usageView: UsageView = USAGE_DEFAULT_VIEW) {
    super({useShadowDom: true});
    this.registerRequiredCSS(storageViewStyles);
    this.clearSiteDataView = clearSiteDataView;
    this.usageView = usageView;

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
      this.settings.set(
          type,
          Common.Settings.Settings.instance().createSetting(
              'clear-storage-' + Platform.StringUtilities.toKebabCase(type), true));
    }

    this.includeThirdPartyCookiesSetting =
        Common.Settings.Settings.instance().createSetting('clear-storage-include-third-party-cookies', false);

    const clearSiteData = this.reportView.appendSection(i18nString(UIStrings.clearSiteData));
    clearSiteData.element.setAttribute('jslog', `${VisualLogging.section('clear-storage')}`);
    this.clearSiteDataFieldList = clearSiteData.getFieldElement();
    clearSiteData.markFieldListAsGroup();

    const quota = this.reportView.appendSection(i18nString(UIStrings.usage));
    quota.element.setAttribute('jslog', `${VisualLogging.section('usage')}`);
    this.usageFieldList = quota.getFieldElement();

    const cookiesSetting = this.settings.get(Protocol.Storage.StorageType.Cookies);
    this.onCookiesSettingChanged(Boolean(cookiesSetting?.get()));
    SDK.TargetManager.TargetManager.instance().observeTargets(this);
  }

  private onCookiesSettingChanged(cookiesEnabled: boolean): void {
    // Unchecking general cookies clearing must also uncheck third-party cookies.
    if (!cookiesEnabled && this.includeThirdPartyCookiesSetting.get()) {
      this.includeThirdPartyCookiesSetting.set(false);
      return;
    }
    this.requestUpdate();
  }

  private onIncludeThirdPartyCookiesSettingChanged(includeThirdPartyCookiesEnabled: boolean): void {
    const cookiesSetting = this.settings.get(Protocol.Storage.StorageType.Cookies);
    // Checking third-party cookies requires general cookies clearing to be enabled.
    if (includeThirdPartyCookiesEnabled && cookiesSetting && !cookiesSetting.get()) {
      cookiesSetting.set(true);
      return;
    }
    this.requestUpdate();
  }

  targetAdded(target: SDK.Target.Target): void {
    if (target !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.target = target;
    const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager) as
        SDK.SecurityOriginManager.SecurityOriginManager;
    this.updateOrigin(
        securityOriginManager.mainSecurityOrigin(), securityOriginManager.unreachableMainSecurityOrigin());
    securityOriginManager.addEventListener(
        SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, this.originChanged, this);
    const storageKeyManager =
        target.model(SDK.StorageKeyManager.StorageKeyManager) as SDK.StorageKeyManager.StorageKeyManager;
    this.updateStorageKey(storageKeyManager.mainStorageKey());
    storageKeyManager.addEventListener(
        SDK.StorageKeyManager.Events.MAIN_STORAGE_KEY_CHANGED, this.storageKeyChanged, this);
  }

  targetRemoved(target: SDK.Target.Target): void {
    if (this.target !== target) {
      return;
    }
    const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager) as
        SDK.SecurityOriginManager.SecurityOriginManager;
    securityOriginManager.removeEventListener(
        SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, this.originChanged, this);
    const storageKeyManager =
        target.model(SDK.StorageKeyManager.StorageKeyManager) as SDK.StorageKeyManager.StorageKeyManager;
    storageKeyManager.removeEventListener(
        SDK.StorageKeyManager.Events.MAIN_STORAGE_KEY_CHANGED, this.storageKeyChanged, this);
  }

  override willHide(): void {
    super.willHide();
    const cookiesSetting = this.settings.get(Protocol.Storage.StorageType.Cookies);
    cookiesSetting?.removeChangeListener(this.boundOnCookiesSettingChanged);
    this.includeThirdPartyCookiesSetting.removeChangeListener(this.boundOnIncludeThirdPartyCookiesSettingChanged);
  }

  override wasHidden(): void {
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

  private originChanged(
      event: Common.EventTarget.EventTargetEvent<SDK.SecurityOriginManager.MainSecurityOriginChangedEvent>): void {
    const {mainSecurityOrigin, unreachableMainSecurityOrigin} = event.data;
    this.updateOrigin(mainSecurityOrigin, unreachableMainSecurityOrigin);
  }

  private storageKeyChanged(
      event: Common.EventTarget.EventTargetEvent<SDK.StorageKeyManager.MainStorageKeyChangedEvent>): void {
    const {mainStorageKey} = event.data;
    this.updateStorageKey(mainStorageKey);
  }

  private updateOrigin(mainOrigin: string, unreachableMainOrigin: string|null): void {
    const oldOrigin = this.securityOrigin;
    if (unreachableMainOrigin) {
      this.securityOrigin = unreachableMainOrigin;
      this.subtitle = i18nString(UIStrings.sFailedToLoad, {PH1: unreachableMainOrigin});
    } else {
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

  private updateStorageKey(mainStorageKey: string): void {
    const oldStorageKey = this.storageKey;

    this.storageKey = mainStorageKey;
    this.subtitle = mainStorageKey;

    if (oldStorageKey !== this.storageKey) {
      this.quotaOverrideEnabled = false;
      this.quotaOverrideError = '';
    }
    this.requestUpdate();
  }

  private async applyQuotaOverrideFromInputField(editorString: string): Promise<void> {
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
      this.quotaOverrideError = i18nString(UIStrings.numberMustBeSmaller, {PH1: cutoff.toLocaleString()});
      this.requestUpdate();
      return;
    }
    const bytesPerMB = 1000 * 1000;
    const quotaInBytes = Math.round(quota * bytesPerMB);
    const quotaFieldValue = `${quotaInBytes / bytesPerMB}`;
    this.previousOverrideFieldValue = quotaFieldValue;
    this.quotaOverrideFieldValue = quotaFieldValue;
    this.requestUpdate();
    await this.target.storageAgent().invoke_overrideQuotaForOrigin(
        {origin: this.securityOrigin, quotaSize: quotaInBytes});
  }

  private async clearQuotaForOrigin(target: SDK.Target.Target, origin: string): Promise<void> {
    await target.storageAgent().invoke_overrideQuotaForOrigin({origin});
  }

  private async onClickCheckbox(): Promise<void> {
    if (!this.quotaOverrideEnabled) {
      this.quotaOverrideEnabled = true;
      this.quotaOverrideFieldValue = this.previousOverrideFieldValue;
      this.requestUpdate();
      await this.updateComplete;
      this.usageViewOutput.focusQuotaOverrideEditor?.();
    } else {
      this.quotaOverrideEnabled = false;
      this.quotaOverrideError = '';
      this.requestUpdate();
      if (this.target && this.securityOrigin) {
        await this.clearQuotaForOrigin(this.target, this.securityOrigin);
      }
    }
  }

  private clear(): void {
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
      StorageView.clear(
          this.target, this.storageKey, this.securityOrigin, selectedStorageTypes, includeThirdPartyCookies);
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

  static clear(
      target: SDK.Target.Target, storageKey: string|null, originForCookies: string|null, selectedStorageTypes: string[],
      includeThirdPartyCookies: boolean): void {
    console.assert(Boolean(storageKey));
    if (!storageKey) {
      return;
    }
    void target.storageAgent().invoke_clearDataForStorageKey(
        {storageKey, storageTypes: selectedStorageTypes.join(',')});

    const set = new Set(selectedStorageTypes);
    const hasAll = set.has(Protocol.Storage.StorageType.All);

    if (set.has(Protocol.Storage.StorageType.Local_storage) || hasAll) {
      const storageModel = target.model(SDK.DOMStorageModel.DOMStorageModel);
      if (storageModel) {
        storageModel.clearForStorageKey(storageKey);
      }
    }

    if (set.has(Protocol.Storage.StorageType.Indexeddb) || hasAll) {
      for (const target of SDK.TargetManager.TargetManager.instance().targets()) {
        const indexedDBModel = target.model(IndexedDBModel);
        if (indexedDBModel) {
          indexedDBModel.clearForStorageKey(storageKey);
        }
      }
    }

    if (originForCookies && (set.has(Protocol.Storage.StorageType.Cookies) || hasAll)) {
      void target.storageAgent().invoke_clearDataForOrigin(
          {origin: originForCookies, storageTypes: Protocol.Storage.StorageType.Cookies});
      const cookieModel = target.model(SDK.CookieModel.CookieModel);
      if (cookieModel) {
        void cookieModel.clear(undefined, includeThirdPartyCookies ? undefined : originForCookies);
      }
    }

    if (set.has(Protocol.Storage.StorageType.Cache_storage) || hasAll) {
      const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      const model = target?.model(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel);
      if (model) {
        model.clearForStorageKey(storageKey);
      }
    }
  }

  private async refreshUsageAndQuota(): Promise<void> {
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
    const response = await this.target.storageAgent().invoke_getUsageAndQuota({origin: securityOrigin});
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
        const slices: PerfUI.PieChart.Slice[] = [];
        for (const usageForType of response.usageBreakdown.sort((a, b) => b.usage - a.usage)) {
          const value = usageForType.usage;
          if (!value) {
            continue;
          }
          const title = StorageView.getStorageTypeName(usageForType.storageType);
          const color = this.pieColors.get(usageForType.storageType) || '#ccc';
          slices.push({value, color, title});
        }
        this.pieChartSlices = slices;
      }
      this.requestUpdate();
    }

    if (this.isShowing()) {
      void this.throttler.schedule(() => this.refreshUsageAndQuota());
    }
  }

  override wasShown(): void {
    super.wasShown();
    const cookiesSetting = this.settings.get(Protocol.Storage.StorageType.Cookies);
    cookiesSetting?.addChangeListener(this.boundOnCookiesSettingChanged);
    this.includeThirdPartyCookiesSetting.addChangeListener(this.boundOnIncludeThirdPartyCookiesSettingChanged);
    this.onCookiesSettingChanged(Boolean(cookiesSetting?.get()));
    void this.refreshUsageAndQuota();
  }

  override performUpdate(): void {
    if (this.subtitle !== null) {
      this.reportView.setSubtitle(this.subtitle);
    }
    const cookiesSetting = this.settings.get(Protocol.Storage.StorageType.Cookies);
    this.clearSiteDataView({
      settings: this.settings,
      includeThirdPartyCookiesSetting: this.includeThirdPartyCookiesSetting,
      includeThirdPartyCookiesDisabled: !cookiesSetting?.get(),
      clearing: this.clearing,
      onClear: () => this.clear(),
    },
                           this.clearSiteDataViewOutput, this.clearSiteDataFieldList);
    this.usageView({
      quotaUsage: this.quotaUsage,
      quotaQuota: this.quotaQuota,
      quotaOverrideActive: this.quotaOverrideActive,
      pieChartSlices: this.pieChartSlices,
      quotaOverrideEnabled: this.quotaOverrideEnabled,
      quotaOverrideValue: this.quotaOverrideFieldValue,
      quotaOverrideError: this.quotaOverrideError,
      onToggleQuotaOverride: () => {
        void this.onClickCheckbox();
      },
      onQuotaOverrideInput: value => {
        this.quotaOverrideFieldValue = value;
      },
      onApplyQuotaOverride: value => {
        void this.applyQuotaOverrideFromInputField(value);
      },
    },
                   this.usageViewOutput, this.usageFieldList);
  }

  static getStorageTypeName(type: Protocol.Storage.StorageType): string {
    switch (type) {
      case Protocol.Storage.StorageType.File_systems:
        return i18nString(UIStrings.fileSystem);
      case Protocol.Storage.StorageType.Indexeddb:
        return i18nString(UIStrings.indexDB);
      case Protocol.Storage.StorageType.Cache_storage:
        return i18nString(UIStrings.cacheStorage);
      case Protocol.Storage.StorageType.Service_workers:
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
  static getStorageTypeNameForWidget(type: string): string {
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
        return StorageView.getStorageTypeName(type as Protocol.Storage.StorageType);
    }
  }
}

export const AllStorageTypes: Protocol.Storage.StorageType[] = [
  Protocol.Storage.StorageType.Cache_storage,
  Protocol.Storage.StorageType.Cookies,
  Protocol.Storage.StorageType.File_systems,
  Protocol.Storage.StorageType.Indexeddb,
  Protocol.Storage.StorageType.Local_storage,
  Protocol.Storage.StorageType.Service_workers,
];

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'resources.clear':
        return this.handleClear(false);
      case 'resources.clear-incl-third-party-cookies':
        return this.handleClear(true);
    }
    return false;
  }

  private handleClear(includeThirdPartyCookies: boolean): boolean {
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
    }, _ => {});
    return true;
  }
}

export class StorageRevealable {
  constructor(public target: SDK.Target.Target) {
  }
}

export class StorageRevealer implements Common.Revealer.Revealer<StorageRevealable> {
  async reveal(_revealable: StorageRevealable): Promise<void> {
    const sidebar = await ResourcesPanel.showAndGetSidebar();
    sidebar.showStorage();
  }
}

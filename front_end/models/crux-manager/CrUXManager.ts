// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as EmulationModel from '../../models/emulation/emulation.js';

const UIStrings = {
  /**
   * @description Warning message indicating that the user will see real user data for a URL which is different from the URL they are currently looking at.
   */
  fieldOverrideWarning: 'Field metrics are configured for a different URL than the current page.',
} as const;

const str_ = i18n.i18n.registerUIStrings('models/crux-manager/CrUXManager.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// This key is expected to be visible in the frontend.
// b/349721878
const CRUX_API_KEY = 'AIzaSyCCSOx25vrb5z0tbedCB3_JRzzbVW6Uwgw';
const DEFAULT_ENDPOINT = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${CRUX_API_KEY}`;

export type StandardMetricNames = 'cumulative_layout_shift'|'first_contentful_paint'|'first_input_delay'|
    'interaction_to_next_paint'|'largest_contentful_paint'|'experimental_time_to_first_byte'|'round_trip_time'|
    'largest_contentful_paint_image_time_to_first_byte'|'largest_contentful_paint_image_resource_load_delay'|
    'largest_contentful_paint_image_resource_load_duration'|'largest_contentful_paint_image_element_render_delay';
export type MetricNames = StandardMetricNames|'form_factors';
export type FormFactor = 'DESKTOP'|'PHONE'|'TABLET';
export type DeviceScope = FormFactor|'ALL';
export type DeviceOption = DeviceScope|'AUTO';
export type PageScope = 'url'|'origin';
export interface Scope {
  pageScope: PageScope;
  deviceScope: DeviceScope;
}
export type ConnectionType = 'offline'|'slow-2G'|'2G'|'3G'|'4G';

export interface CrUXRequest {
  effectiveConnectionType?: ConnectionType;
  formFactor?: FormFactor;
  metrics?: MetricNames[];
  origin?: string;
  url?: string;
}

export interface MetricResponse {
  histogram?: Array<{start: number, end?: number, density?: number}>;
  percentiles?: {p75: number|string};
}

export interface FormFactorsResponse {
  fractions?: {
    desktop: number,
    phone: number,
    tablet: number,
  };
}

interface CollectionDate {
  year: number;
  month: number;
  day: number;
}

interface CrUXRecord {
  key: Omit<CrUXRequest, 'metrics'>;
  metrics: Partial<Record<StandardMetricNames, MetricResponse>>&{
    // eslint-disable-next-line @typescript-eslint/naming-convention
    form_factors?: FormFactorsResponse,
  };
  collectionPeriod: {
    firstDate: CollectionDate,
    lastDate: CollectionDate,
  };
}

export interface CrUXResponse {
  record: CrUXRecord;
  urlNormalizationDetails?: {
    originalUrl: string,
    normalizedUrl: string,
  };
}

export type PageResult = Record<`${PageScope}-${DeviceScope}`, CrUXResponse|null>&{
  warnings: string[],
};

export interface OriginMapping {
  developmentOrigin: string;
  productionOrigin: string;
}

export interface ConfigSetting {
  enabled: boolean;
  override?: string;
  overrideEnabled?: boolean;
  originMappings?: OriginMapping[];
}

let cruxManagerInstance: CrUXManager;

// TODO: Potentially support `TABLET`. Tablet field data will always be `null` until then.
export const DEVICE_SCOPE_LIST: DeviceScope[] = ['ALL', 'DESKTOP', 'PHONE'];

const pageScopeList: PageScope[] = ['origin', 'url'];
const metrics: MetricNames[] = [
  'first_contentful_paint',
  'largest_contentful_paint',
  'cumulative_layout_shift',
  'interaction_to_next_paint',
  'round_trip_time',
  'form_factors',
  'largest_contentful_paint_image_time_to_first_byte',
  'largest_contentful_paint_image_resource_load_delay',
  'largest_contentful_paint_image_resource_load_duration',
  'largest_contentful_paint_image_element_render_delay',
];

export class CrUXManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #originCache = new Map<string, CrUXResponse|null>();
  #urlCache = new Map<string, CrUXResponse|null>();
  #mainDocumentUrl?: string;
  #configSetting: Common.Settings.Setting<ConfigSetting>;
  #endpoint = DEFAULT_ENDPOINT;
  #pageResult?: PageResult;
  fieldDeviceOption: DeviceOption = 'AUTO';
  fieldPageScope: PageScope = 'url';

  private constructor() {
    super();

    /**
     * In an incognito or guest window - which is called an "OffTheRecord"
     * profile in Chromium -, we do not want to persist the user consent and
     * should ask for it every time. This is why we see what window type the
     * user is in before choosing where to look/create this setting. If the
     * user is in OTR, we store it in the session, which uses sessionStorage
     * and is short-lived. If the user is not in OTR, we use global, which is
     * the default behaviour and persists the value to the Chrome profile.
     * This behaviour has been approved by Chrome Privacy as part of the launch
     * review.
     */
    const useSessionStorage = Root.Runtime.hostConfig.isOffTheRecord === true;
    const storageTypeForConsent =
        useSessionStorage ? Common.Settings.SettingStorageType.SESSION : Common.Settings.SettingStorageType.GLOBAL;

    this.#configSetting = Common.Settings.Settings.instance().createSetting<ConfigSetting>(
        'field-data', {enabled: false, override: '', originMappings: [], overrideEnabled: false},
        storageTypeForConsent);

    this.#configSetting.addChangeListener(() => {
      void this.refresh();
    });

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.#onFrameNavigated,
        this);
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): CrUXManager {
    const {forceNew} = opts;
    if (!cruxManagerInstance || forceNew) {
      cruxManagerInstance = new CrUXManager();
    }

    return cruxManagerInstance;
  }

  /** The most recent page result from the CrUX service. */
  get pageResult(): PageResult|undefined {
    return this.#pageResult;
  }

  getConfigSetting(): Common.Settings.Setting<ConfigSetting> {
    return this.#configSetting;
  }

  isEnabled(): boolean {
    return this.#configSetting.get().enabled;
  }

  async getFieldDataForPage(pageUrl: string): Promise<PageResult> {
    const pageResult: PageResult = {
      'origin-ALL': null,
      'origin-DESKTOP': null,
      'origin-PHONE': null,
      'origin-TABLET': null,
      'url-ALL': null,
      'url-DESKTOP': null,
      'url-PHONE': null,
      'url-TABLET': null,
      warnings: [],
    };

    try {
      const normalizedUrl = this.#normalizeUrl(pageUrl);
      const promises: Array<Promise<void>> = [];

      for (const pageScope of pageScopeList) {
        for (const deviceScope of DEVICE_SCOPE_LIST) {
          const promise = this.#getScopedData(normalizedUrl, pageScope, deviceScope).then(response => {
            pageResult[`${pageScope}-${deviceScope}`] = response;
          });
          promises.push(promise);
        }
      }

      await Promise.all(promises);
    } catch (err) {
      console.error(err);
    } finally {
      return pageResult;
    }
  }

  #getMappedUrl(unmappedUrl: string): string {
    try {
      const unmapped = new URL(unmappedUrl);
      const mappings = this.#configSetting.get().originMappings || [];
      const mapping = mappings.find(m => m.developmentOrigin === unmapped.origin);
      if (!mapping) {
        return unmappedUrl;
      }

      const mapped = new URL(mapping.productionOrigin);
      mapped.pathname = unmapped.pathname;

      return mapped.href;
    } catch {
      return unmappedUrl;
    }
  }

  async getFieldDataForCurrentPageForTesting(): Promise<PageResult> {
    return await this.#getFieldDataForCurrentPage();
  }

  /**
   * In general, this function should use the main document URL
   * (i.e. the URL after all redirects but before SPA navigations)
   *
   * However, we can't detect the main document URL of the current page if it's
   * navigation occurred before DevTools was first opened. This function will fall
   * back to the currently inspected URL (i.e. what is displayed in the omnibox) if
   * the main document URL cannot be found.
   */
  async #getFieldDataForCurrentPage(): Promise<PageResult> {
    const currentUrl = this.#mainDocumentUrl || await this.#getInspectedURL();
    const urlForCrux = this.#configSetting.get().overrideEnabled ? this.#configSetting.get().override || '' :
                                                                   this.#getMappedUrl(currentUrl);

    const result = await this.getFieldDataForPage(urlForCrux);
    if (currentUrl !== urlForCrux) {
      result.warnings.push(i18nString(UIStrings.fieldOverrideWarning));
    }
    return result;
  }

  async #getInspectedURL(): Promise<string> {
    const targetManager = SDK.TargetManager.TargetManager.instance();
    let inspectedURL = targetManager.inspectedURL();
    if (!inspectedURL) {
      inspectedURL = await new Promise(resolve => {
        function handler(event: {data: SDK.Target.Target}): void {
          const newInspectedURL = event.data.inspectedURL();
          if (newInspectedURL) {
            resolve(newInspectedURL);
            targetManager.removeEventListener(SDK.TargetManager.Events.INSPECTED_URL_CHANGED, handler);
          }
        }
        targetManager.addEventListener(SDK.TargetManager.Events.INSPECTED_URL_CHANGED, handler);
      });
    }
    return inspectedURL;
  }

  async #onFrameNavigated(event: {data: SDK.ResourceTreeModel.ResourceTreeFrame}): Promise<void> {
    if (!event.data.isPrimaryFrame()) {
      return;
    }

    this.#mainDocumentUrl = event.data.url;

    await this.refresh();
  }

  async refresh(): Promise<void> {
    // This does 2 things:
    // - Tells listeners to clear old data so it isn't shown during a URL transition
    // - Tells listeners to clear old data when field data is disabled.
    this.#pageResult = undefined;
    this.dispatchEventToListeners(Events.FIELD_DATA_CHANGED, undefined);

    if (!this.#configSetting.get().enabled) {
      return;
    }

    this.#pageResult = await this.#getFieldDataForCurrentPage();
    this.dispatchEventToListeners(Events.FIELD_DATA_CHANGED, this.#pageResult);
  }

  #normalizeUrl(inputUrl: string): URL {
    const normalizedUrl = new URL(inputUrl);
    normalizedUrl.hash = '';
    normalizedUrl.search = '';
    return normalizedUrl;
  }

  async #getScopedData(normalizedUrl: URL, pageScope: PageScope, deviceScope: DeviceScope): Promise<CrUXResponse|null> {
    const {origin, href: url, hostname} = normalizedUrl;

    if (hostname === 'localhost' || hostname === '127.0.0.1' || !origin.startsWith('http')) {
      return null;
    }

    const cache = pageScope === 'origin' ? this.#originCache : this.#urlCache;
    const cacheKey = pageScope === 'origin' ? `${origin}-${deviceScope}` : `${url}-${deviceScope}`;
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse !== undefined) {
      return cachedResponse;
    }

    // We shouldn't cache the result in the case of an error
    // The error could be a transient issue with the network/CrUX server/etc.
    try {
      const formFactor = deviceScope === 'ALL' ? undefined : deviceScope;
      const result = pageScope === 'origin' ? await this.#makeRequest({origin, metrics, formFactor}) :
                                              await this.#makeRequest({url, metrics, formFactor});
      cache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async #makeRequest(request: CrUXRequest): Promise<CrUXResponse|null> {
    const body = JSON.stringify(request);
    const response = await fetch(this.#endpoint, {
      method: 'POST',
      body,
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to fetch data from CrUX server (Status code: ${response.status})`);
    }

    const responseData = await response.json();
    if (response.status === 404) {
      // This is how CrUX tells us that there is not data available for the provided url/origin
      // Since it's a valid response, just return null instead of throwing an error.
      if (responseData?.error?.status === 'NOT_FOUND') {
        return null;
      }

      throw new Error(`Failed to fetch data from CrUX server (Status code: ${response.status})`);
    }

    if (!('record' in responseData)) {
      throw new Error(`Failed to find data in CrUX response: ${JSON.stringify(responseData)}`);
    }

    return responseData;
  }

  #getAutoDeviceScope(): DeviceScope {
    const emulationModel = EmulationModel.DeviceModeModel.DeviceModeModel.tryInstance();
    if (emulationModel === null) {
      return 'ALL';
    }

    if (emulationModel.isMobile()) {
      if (this.#pageResult?.[`${this.fieldPageScope}-PHONE`]) {
        return 'PHONE';
      }

      return 'ALL';
    }

    if (this.#pageResult?.[`${this.fieldPageScope}-DESKTOP`]) {
      return 'DESKTOP';
    }

    return 'ALL';
  }

  resolveDeviceOptionToScope(option: DeviceOption): DeviceScope {
    return option === 'AUTO' ? this.#getAutoDeviceScope() : option;
  }

  getSelectedDeviceScope(): DeviceScope {
    return this.resolveDeviceOptionToScope(this.fieldDeviceOption);
  }

  getSelectedScope(): Scope {
    return {pageScope: this.fieldPageScope, deviceScope: this.getSelectedDeviceScope()};
  }

  getSelectedFieldResponse(): CrUXResponse|null|undefined {
    const pageScope = this.fieldPageScope;
    const deviceScope = this.getSelectedDeviceScope();
    return this.getFieldResponse(pageScope, deviceScope);
  }

  getSelectedFieldMetricData(fieldMetric: StandardMetricNames): MetricResponse|undefined {
    return this.getSelectedFieldResponse()?.record.metrics[fieldMetric];
  }

  getFieldResponse(pageScope: PageScope, deviceScope: DeviceScope): CrUXResponse|null|undefined {
    return this.#pageResult?.[`${pageScope}-${deviceScope}`];
  }

  setEndpointForTesting(endpoint: string): void {
    this.#endpoint = endpoint;
  }
}

export const enum Events {
  FIELD_DATA_CHANGED = 'field-data-changed',
}

interface EventTypes {
  [Events.FIELD_DATA_CHANGED]: PageResult|undefined;
}

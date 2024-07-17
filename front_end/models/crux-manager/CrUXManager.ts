// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';

// This key is expected to be visible in the frontend.
// b/349721878
const CRUX_API_KEY = 'AIzaSyCCSOx25vrb5z0tbedCB3_JRzzbVW6Uwgw';
const DEFAULT_ENDPOINT = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${CRUX_API_KEY}`;

export type MetricNames = 'cumulative_layout_shift'|'first_contentful_paint'|'first_input_delay'|
    'interaction_to_next_paint'|'largest_contentful_paint'|'experimental_time_to_first_byte'|'round_trip_time';
export type FormFactor = 'DESKTOP'|'PHONE'|'TABLET';
export type DeviceScope = FormFactor|'ALL';
export type PageScope = 'url'|'origin';
export type ConnectionType = 'offline'|'slow-2G'|'2G'|'3G'|'4G';

export interface CrUXRequest {
  effectiveConnectionType?: ConnectionType;
  formFactor?: FormFactor;
  metrics?: Array<MetricNames>;
  origin?: string;
  url?: string;
}

export interface MetricResponse {
  histogram?: Array<{start: number, end?: number, density?: number}>;
  percentiles?: {p75: number|string};
}

interface CollectionDate {
  year: number;
  month: number;
  day: number;
}

interface Record {
  key: Omit<CrUXRequest, 'metrics'>;
  metrics: {[K in MetricNames]?: MetricResponse;};
  collectionPeriod: {
    firstDate: CollectionDate,
    lastDate: CollectionDate,
  };
}

export interface CrUXResponse {
  record: Record;
  urlNormalizationDetails?: {
    originalUrl: string,
    normalizedUrl: string,
  };
}

export type PageResult = {
  [K in`${PageScope}-${DeviceScope}`]: CrUXResponse|null;
};

export interface ConfigSetting {
  enabled: boolean;
  override: string;
}

let cruxManagerInstance: CrUXManager;

// TODO: Potentially support `TABLET`. Tablet field data will always be `null` until then.
export const DEVICE_SCOPE_LIST: DeviceScope[] = ['ALL', 'DESKTOP', 'PHONE'];

const pageScopeList: PageScope[] = ['origin', 'url'];
const metrics: MetricNames[] =
    ['largest_contentful_paint', 'cumulative_layout_shift', 'interaction_to_next_paint', 'round_trip_time'];

export class CrUXManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #originCache = new Map<string, CrUXResponse|null>();
  #urlCache = new Map<string, CrUXResponse|null>();
  #mainDocumentUrl?: string;
  #configSetting =
      Common.Settings.Settings.instance().createSetting<ConfigSetting>('field-data', {enabled: false, override: ''});
  #endpoint = DEFAULT_ENDPOINT;

  private constructor() {
    super();

    this.#configSetting.addChangeListener(() => {
      void this.#automaticRefresh();
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

  getConfigSetting(): Common.Settings.Setting<ConfigSetting> {
    return this.#configSetting;
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
    };

    try {
      const normalizedUrl = this.#normalizeUrl(pageUrl);
      const promises: Promise<void>[] = [];

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

  /**
   * In general, this function should use the main document URL
   * (i.e. the URL after all redirects but before SPA navigations)
   *
   * However, we can't detect the main document URL of the current page if it's
   * navigation occurred before DevTools was first opened. This function will fall
   * back to the currently inspected URL (i.e. what is displayed in the omnibox) if
   * the main document URL cannot be found.
   */
  async getFieldDataForCurrentPage(): Promise<PageResult> {
    const pageUrl = this.#configSetting.get().override || this.#mainDocumentUrl || await this.#getInspectedURL();
    return this.getFieldDataForPage(pageUrl);
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
            targetManager.removeEventListener(SDK.TargetManager.Events.InspectedURLChanged, handler);
          }
        }
        targetManager.addEventListener(SDK.TargetManager.Events.InspectedURLChanged, handler);
      });
    }
    return inspectedURL;
  }

  async #onFrameNavigated(event: {data: SDK.ResourceTreeModel.ResourceTreeFrame}): Promise<void> {
    if (!event.data.isPrimaryFrame()) {
      return;
    }

    this.#mainDocumentUrl = event.data.url;

    await this.#automaticRefresh();
  }

  async #automaticRefresh(): Promise<void> {
    // This does 2 things:
    // - Tells listeners to clear old data so it isn't shown during a URL transition
    // - Tells listeners to clear old data when field data is disabled.
    this.dispatchEventToListeners(Events.FieldDataChanged, undefined);

    if (!this.#configSetting.get().enabled) {
      return;
    }

    const pageResult = await this.getFieldDataForCurrentPage();

    this.dispatchEventToListeners(Events.FieldDataChanged, pageResult);
  }

  #normalizeUrl(inputUrl: string): URL {
    const normalizedUrl = new URL(inputUrl);
    normalizedUrl.hash = '';
    normalizedUrl.search = '';
    return normalizedUrl;
  }

  async #getScopedData(normalizedUrl: URL, pageScope: PageScope, deviceScope: DeviceScope): Promise<CrUXResponse|null> {
    const {origin, href: url} = normalizedUrl;

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

  setEndpointForTesting(endpoint: string): void {
    this.#endpoint = endpoint;
  }
}

export const enum Events {
  FieldDataChanged = 'field-data-changed',
}

type EventTypes = {
  [Events.FieldDataChanged]: PageResult|undefined,
};

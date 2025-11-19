// gen/front_end/models/crux-manager/CrUXManager.js
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as EmulationModel from "./../emulation/emulation.js";
var UIStrings = {
  /**
   * @description Warning message indicating that the user will see real user data for a URL which is different from the URL they are currently looking at.
   */
  fieldOverrideWarning: "Field metrics are configured for a different URL than the current page."
};
var str_ = i18n.i18n.registerUIStrings("models/crux-manager/CrUXManager.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var CRUX_API_KEY = "AIzaSyCCSOx25vrb5z0tbedCB3_JRzzbVW6Uwgw";
var DEFAULT_ENDPOINT = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${CRUX_API_KEY}`;
var cruxManagerInstance;
var DEVICE_SCOPE_LIST = ["ALL", "DESKTOP", "PHONE"];
var pageScopeList = ["origin", "url"];
var metrics = [
  "first_contentful_paint",
  "largest_contentful_paint",
  "cumulative_layout_shift",
  "interaction_to_next_paint",
  "round_trip_time",
  "form_factors",
  "largest_contentful_paint_image_time_to_first_byte",
  "largest_contentful_paint_image_resource_load_delay",
  "largest_contentful_paint_image_resource_load_duration",
  "largest_contentful_paint_image_element_render_delay"
];
var CrUXManager = class _CrUXManager extends Common.ObjectWrapper.ObjectWrapper {
  #originCache = /* @__PURE__ */ new Map();
  #urlCache = /* @__PURE__ */ new Map();
  #mainDocumentUrl;
  #configSetting;
  #endpoint = DEFAULT_ENDPOINT;
  #pageResult;
  fieldDeviceOption = "AUTO";
  fieldPageScope = "url";
  constructor() {
    super();
    const useSessionStorage = Root.Runtime.hostConfig.isOffTheRecord === true;
    const storageTypeForConsent = useSessionStorage ? "Session" : "Global";
    this.#configSetting = Common.Settings.Settings.instance().createSetting("field-data", { enabled: false, override: "", originMappings: [], overrideEnabled: false }, storageTypeForConsent);
    this.#configSetting.addChangeListener(() => {
      void this.refresh();
    });
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.#onFrameNavigated, this);
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!cruxManagerInstance || forceNew) {
      cruxManagerInstance = new _CrUXManager();
    }
    return cruxManagerInstance;
  }
  /** The most recent page result from the CrUX service. */
  get pageResult() {
    return this.#pageResult;
  }
  getConfigSetting() {
    return this.#configSetting;
  }
  isEnabled() {
    return this.#configSetting.get().enabled;
  }
  async getFieldDataForPage(pageUrl) {
    const pageResult = {
      "origin-ALL": null,
      "origin-DESKTOP": null,
      "origin-PHONE": null,
      "origin-TABLET": null,
      "url-ALL": null,
      "url-DESKTOP": null,
      "url-PHONE": null,
      "url-TABLET": null,
      warnings: [],
      normalizedUrl: ""
    };
    try {
      const normalizedUrl = this.#normalizeUrl(pageUrl);
      pageResult.normalizedUrl = normalizedUrl.href;
      const promises = [];
      for (const pageScope of pageScopeList) {
        for (const deviceScope of DEVICE_SCOPE_LIST) {
          const promise = this.#getScopedData(normalizedUrl, pageScope, deviceScope).then((response) => {
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
  #getMappedUrl(unmappedUrl) {
    try {
      const unmapped = new URL(unmappedUrl);
      const mappings = this.#configSetting.get().originMappings || [];
      const mapping = mappings.find((m) => m.developmentOrigin === unmapped.origin);
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
  async getFieldDataForCurrentPageForTesting() {
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
  async #getFieldDataForCurrentPage() {
    const currentUrl = this.#mainDocumentUrl || await this.#getInspectedURL();
    const normalizedUrl = this.#configSetting.get().overrideEnabled ? this.#configSetting.get().override || "" : this.#getMappedUrl(currentUrl);
    const result = await this.getFieldDataForPage(normalizedUrl);
    if (currentUrl !== normalizedUrl) {
      result.warnings.push(i18nString(UIStrings.fieldOverrideWarning));
    }
    return result;
  }
  async #getInspectedURL() {
    const targetManager = SDK.TargetManager.TargetManager.instance();
    let inspectedURL = targetManager.inspectedURL();
    if (!inspectedURL) {
      inspectedURL = await new Promise((resolve) => {
        function handler(event) {
          const newInspectedURL = event.data.inspectedURL();
          if (newInspectedURL) {
            resolve(newInspectedURL);
            targetManager.removeEventListener("InspectedURLChanged", handler);
          }
        }
        targetManager.addEventListener("InspectedURLChanged", handler);
      });
    }
    return inspectedURL;
  }
  async #onFrameNavigated(event) {
    if (!event.data.isPrimaryFrame()) {
      return;
    }
    this.#mainDocumentUrl = event.data.url;
    await this.refresh();
  }
  async refresh() {
    this.#pageResult = void 0;
    this.dispatchEventToListeners("field-data-changed", void 0);
    if (!this.#configSetting.get().enabled) {
      return;
    }
    this.#pageResult = await this.#getFieldDataForCurrentPage();
    this.dispatchEventToListeners("field-data-changed", this.#pageResult);
  }
  #normalizeUrl(inputUrl) {
    const normalizedUrl = new URL(inputUrl);
    normalizedUrl.hash = "";
    normalizedUrl.search = "";
    return normalizedUrl;
  }
  async #getScopedData(normalizedUrl, pageScope, deviceScope) {
    const { origin, href: url, hostname } = normalizedUrl;
    if (hostname === "localhost" || hostname === "127.0.0.1" || !origin.startsWith("http")) {
      return null;
    }
    const cache = pageScope === "origin" ? this.#originCache : this.#urlCache;
    const cacheKey = pageScope === "origin" ? `${origin}-${deviceScope}` : `${url}-${deviceScope}`;
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse !== void 0) {
      return cachedResponse;
    }
    try {
      const formFactor = deviceScope === "ALL" ? void 0 : deviceScope;
      const result = pageScope === "origin" ? await this.#makeRequest({ origin, metrics, formFactor }) : await this.#makeRequest({ url, metrics, formFactor });
      cache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.error(err);
      return null;
    }
  }
  async #makeRequest(request) {
    const body = JSON.stringify(request);
    const response = await fetch(this.#endpoint, {
      method: "POST",
      body
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to fetch data from CrUX server (Status code: ${response.status})`);
    }
    const responseData = await response.json();
    if (response.status === 404) {
      if (responseData?.error?.status === "NOT_FOUND") {
        return null;
      }
      throw new Error(`Failed to fetch data from CrUX server (Status code: ${response.status})`);
    }
    if (!("record" in responseData)) {
      throw new Error(`Failed to find data in CrUX response: ${JSON.stringify(responseData)}`);
    }
    return responseData;
  }
  #getAutoDeviceScope() {
    const emulationModel = EmulationModel.DeviceModeModel.DeviceModeModel.tryInstance();
    if (emulationModel === null) {
      return "ALL";
    }
    if (emulationModel.isMobile()) {
      if (this.#pageResult?.[`${this.fieldPageScope}-PHONE`]) {
        return "PHONE";
      }
      return "ALL";
    }
    if (this.#pageResult?.[`${this.fieldPageScope}-DESKTOP`]) {
      return "DESKTOP";
    }
    return "ALL";
  }
  resolveDeviceOptionToScope(option) {
    return option === "AUTO" ? this.#getAutoDeviceScope() : option;
  }
  getSelectedDeviceScope() {
    return this.resolveDeviceOptionToScope(this.fieldDeviceOption);
  }
  getSelectedScope() {
    return { pageScope: this.fieldPageScope, deviceScope: this.getSelectedDeviceScope() };
  }
  getSelectedFieldResponse() {
    const pageScope = this.fieldPageScope;
    const deviceScope = this.getSelectedDeviceScope();
    return this.getFieldResponse(pageScope, deviceScope);
  }
  getSelectedFieldMetricData(fieldMetric) {
    return this.getSelectedFieldResponse()?.record.metrics[fieldMetric];
  }
  getFieldResponse(pageScope, deviceScope) {
    return this.#pageResult?.[`${pageScope}-${deviceScope}`];
  }
  setEndpointForTesting(endpoint) {
    this.#endpoint = endpoint;
  }
};
export {
  CrUXManager,
  DEVICE_SCOPE_LIST
};
//# sourceMappingURL=crux-manager.js.map

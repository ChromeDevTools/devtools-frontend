var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/application/components/AdsView.js
var AdsView_exports = {};
__export(AdsView_exports, {
  AdsView: () => AdsView
});
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import "./../../../ui/kit/kit.js";
import * as Common from "./../../../core/common/common.js";
import * as i18n from "./../../../core/i18n/i18n.js";
import * as SDK from "./../../../core/sdk/sdk.js";
import * as UI from "./../../../ui/legacy/legacy.js";
import * as Lit from "./../../../ui/lit/lit.js";
import * as VisualLogging from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/adsView.css.js
var adsView_css_default = `/*
 * Copyright 2026 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  padding: var(--sys-size-6);
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.ads-view-container {
  display: flex;
  flex-direction: column;
  flex: auto;
}

.metrics-container {
  flex: 0 0 auto;
  margin: 0;
  border: 1px solid var(--sys-color-divider);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sys-size-1);
  background-color: var(--sys-color-divider);
}

.metric-box {
  background-color: var(--sys-color-surface);
  padding: var(--sys-size-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.metric-title {
  font-size: var(--sys-typescale-body4-size);
  color: var(--sys-color-on-surface-subtle);
  margin: 0 0 var(--sys-size-3);
}

.metric-value {
  font-size: var(--sys-typescale-headline3-size);
  font-weight: bold;
  color: var(--sys-color-on-surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0;
  gap: var(--sys-size-2);
}

.metric-average {
  font-size: var(--sys-typescale-body4-size);
  font-weight: normal;
  color: var(--sys-color-on-surface-subtle);
}

.metrics-title,
.ad-frames-title,
.settings-title {
  color: var(--sys-color-on-surface);
  flex: 0 0 auto;
  font-weight: bold;
  margin-bottom: var(--sys-size-5);
}

.ad-frames-data-grid {
  flex: auto;
}

.ad-frames-container {
  border: 1px solid var(--sys-color-divider);
  display: flex;
  flex: 1; /* Takes up remaining space */
  flex-direction: column;
  margin-bottom: 0;
  min-height: var(--sys-size-22); /* 144px */
  position: relative;
  overflow: hidden;
}

.divider {
  border: none;
  border-top: 1px solid var(--sys-color-divider);
  margin: var(--sys-size-8) 0 var(--sys-size-6);
}

.setting-text-container {
  display: flex;
  flex-direction: column;
}

.setting-explanation {
  color: var(--sys-color-token-subtle);
  white-space: break-spaces;
  margin-top: 0;
}

.footer-text {
  margin-bottom: var(--sys-size-6);
}

.inline-icon {
  width: var(--sys-size-8);
  height: var(--sys-size-8);
  vertical-align: text-bottom;
}

/*# sourceURL=${import.meta.resolve("./adsView.css")} */`;

// gen/front_end/panels/application/components/AdsView.js
var { html } = Lit;
var { bindToSetting } = UI.UIUtils;
var UIStrings = {
  /**
   * @description Title for the metrics table.
   */
  metrics: "Metrics",
  /**
   * @description Title for a metric showing the percentage of the viewport covered by ads.
   */
  viewportAdDensity: "Viewport ad density",
  /**
   * @description Title for a metric showing the number of ads in the viewport.
   */
  viewportAdCount: "Viewport ad count",
  /**
   * @description Title for a metric showing the total CPU usage by ads.
   */
  totalCpuUsage: "Total CPU usage by ads",
  /**
   * @description Title for a metric showing the total network usage by ads.
   */
  totalNetworkUsage: "Total network usage by ads",
  /**
   * @description Subtext showing the average value of a metric.
   * @example {5.00%} PH1
   */
  average: "(Average: {PH1})",
  /**
   * @description Title for the ad iframes table.
   * @example {3} PH1
   */
  adIframesTitle: "Ad iframes (total {PH1})",
  /**
   * @description Text to display when a value is not available.
   */
  notAvailable: "N/A",
  /**
   * @description Text to display when a frame has no name/id.
   */
  unnamed: "<unnamed>",
  /**
   * @description Title for the Element Id column in the ad iframes table.
   */
  elementId: "Element ID",
  /**
   * @description Title for the Initial origin column in the ad iframes table.
   */
  initialOrigin: "Initial origin",
  /**
   * @description Title for the CPU column in the ad iframes table.
   */
  cpu: "CPU",
  /**
   * @description Title for the Network column in the ad iframes table.
   */
  network: "Network",
  /**
   * @description Accessible name for the ad iframes table.
   */
  adIframes: "Ad iframes",
  /**
   * @description Title for the settings section.
   */
  settings: "Settings",
  /**
   * @description The name of a checkbox setting. This setting highlights the
   * rendering elements for ads that are found on the page.
   */
  highlightAds: "Highlight ads",
  /**
   * @description Explanation text for the 'Highlight ads' setting.
   */
  highlightsElementsRedDetectedToBe: "Highlights elements (red) detected to be ads.",
  /**
   * @description Text explaining that ad detection is not perfect.
   */
  adDetectionMistakes: "Chrome\u2019s ad detection can make mistakes.",
  /**
   * @description Link text for learning more about ad detection in Chrome.
   */
  learnMore: "Learn more"
};
var str_ = i18n.i18n.registerUIStrings("panels/application/components/AdsView.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var formatMetric = (val, formatter) => {
  if (val === void 0 || val === -1) {
    return i18nString(UIStrings.notAvailable);
  }
  return formatter(val);
};
var formatCpu = (val) => {
  return formatMetric(val, (v) => i18n.TimeUtilities.millisToString(v));
};
var formatNetwork = (val) => {
  return formatMetric(val, (v) => i18n.ByteUtilities.bytesToString(v));
};
var DEFAULT_VIEW = (input, output, target) => {
  const metrics = input.metrics;
  const formatValue = (val, isPercentage) => {
    return formatMetric(val, (v) => {
      if (isPercentage) {
        return new Intl.NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
          style: "percent",
          maximumFractionDigits: 0
        }).format(v / 100);
      }
      return new Intl.NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale).format(v);
    });
  };
  const formatAverage = (val, isPercentage) => {
    return formatMetric(val, (v) => {
      if (isPercentage) {
        return new Intl.NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
          style: "percent",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(v / 100);
      }
      return new Intl.NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(v);
    });
  };
  Lit.render(html`
    <style>${adsView_css_default}</style>
    <div class="ads-view-container" jslog=${VisualLogging.pane("ads")}>
      <div class="metrics-title">${i18nString(UIStrings.metrics)}</div>
      <dl class="metrics-container">
        <div class="metric-box">
          <dt class="metric-title">${i18nString(UIStrings.viewportAdDensity)}</dt>
          <dd class="metric-value">
            <span>${formatValue(metrics.viewportAdDensityByArea, true)}</span>
            <span class="metric-average">${i18nString(UIStrings.average, {
    PH1: formatAverage(metrics.averageViewportAdDensityByArea, true)
  })}</span>
          </dd>
        </div>
        <div class="metric-box">
          <dt class="metric-title">${i18nString(UIStrings.viewportAdCount)}</dt>
          <dd class="metric-value">
            <span>${formatValue(metrics.viewportAdCount, false)}</span>
            <span class="metric-average">${i18nString(UIStrings.average, {
    PH1: formatAverage(metrics.averageViewportAdCount, false)
  })}</span>
          </dd>
        </div>
        <div class="metric-box">
          <dt class="metric-title">${i18nString(UIStrings.totalCpuUsage)}</dt>
          <dd class="metric-value">
            <span>${formatCpu(metrics.totalAdCpuTime)}</span>
          </dd>
        </div>
        <div class="metric-box">
          <dt class="metric-title">${i18nString(UIStrings.totalNetworkUsage)}</dt>
          <dd class="metric-value">
            <span>${formatNetwork(metrics.totalAdNetworkBytes)}</span>
          </dd>
        </div>
      </dl>
      <hr class="divider">
      <div class="ad-frames-title">${i18nString(UIStrings.adIframesTitle, { PH1: input.adFrames.length })}</div>
      <div class="ad-frames-container">
        <devtools-data-grid striped resize="last" class="ad-frames-data-grid" name=${i18nString(UIStrings.adIframes)}>
          <table>
            <tr>
              <th id="elementId" weight="1" sortable>${i18nString(UIStrings.elementId)}</th>
              <th id="initialOrigin" weight="2" sortable>${i18nString(UIStrings.initialOrigin)}</th>
              <th id="cpuTime" weight="1" sortable type="numeric">${i18nString(UIStrings.cpu)}</th>
              <th id="networkBytes" weight="1" sortable type="numeric">${i18nString(UIStrings.network)}</th>
            </tr>
            ${input.adFrames.map((frame) => html`
              <tr>
                <td title=${frame.elementId}>
                  ${frame.elementId ? html`
                        <button class="text-button link-style devtools-link" @click=${frame.revealFrame}>
                          ${frame.elementId}
                        </button>
                      ` : Lit.nothing}
                </td>
                <td title=${frame.initialOrigin}>${frame.initialOrigin}</td>
                <td title=${frame.cpuTime} data-value=${frame.rawCpuTime}>${frame.cpuTime}</td>
                <td title=${frame.networkBytes} data-value=${frame.rawNetworkBytes}>${frame.networkBytes}</td>
              </tr>
            `)}
          </table>
        </devtools-data-grid>
      </div>
      <hr class="divider">
      <div class="settings-title">${i18nString(UIStrings.settings)}</div>
      <devtools-checkbox class="setting-container small"
          ${bindToSetting(Common.Settings.Settings.instance().resolve(SDK.SDKSettings.showAdHighlightsSettingDescriptor))}>
        <div class="setting-text-container">
          <div class="setting-label">${i18nString(UIStrings.highlightAds)}</div>
          <div class="setting-explanation">${i18nString(UIStrings.highlightsElementsRedDetectedToBe)}</div>
        </div>
      </devtools-checkbox>
      <hr class="divider">
      <div class="footer-text">
        <devtools-icon class="inline-icon" name="info"></devtools-icon>
        &#32;
        <span>
          ${i18nString(UIStrings.adDetectionMistakes)}
          &#32;
          <devtools-link class="link devtools-link" href="https://chromium.googlesource.com/chromium/src/+/main/docs/ad_tagging.md" jslogcontext="learn-more">
            ${i18nString(UIStrings.learnMore)}
          </devtools-link>
        </span>
      </div>
    </div>
  `, target);
};
var AdsView = class extends UI.Widget.Widget {
  #currentMetrics;
  #pollTimer;
  #isPolling = false;
  #pollSessionId = 0;
  #view;
  #adFrames = /* @__PURE__ */ new Map();
  #adIframeElementIds = /* @__PURE__ */ new Map();
  #fetchingElementIds = /* @__PURE__ */ new Set();
  constructor(view = DEFAULT_VIEW) {
    super({ useShadowDom: true });
    this.#view = view;
    this.#currentMetrics = {
      viewportAdDensityByArea: 0,
      averageViewportAdDensityByArea: 0,
      viewportAdCount: 0,
      averageViewportAdCount: 0,
      totalAdCpuTime: 0,
      totalAdNetworkBytes: 0,
      updateAdFrames: [],
      removeAdFrames: []
    };
    this.requestUpdate();
  }
  wasShown() {
    super.wasShown();
    this.#startPolling();
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.#onPrimaryPageChanged, this);
  }
  willHide() {
    this.#stopPolling();
    SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.#onPrimaryPageChanged, this);
    super.willHide();
  }
  #startPolling() {
    if (this.#isPolling) {
      return;
    }
    this.#isPolling = true;
    this.#pollSessionId++;
    void this.#pollMetrics(this.#pollSessionId);
  }
  #stopPolling() {
    this.#isPolling = false;
    if (this.#pollTimer !== void 0) {
      window.clearTimeout(this.#pollTimer);
      this.#pollTimer = void 0;
    }
  }
  async #pollMetrics(sessionId) {
    if (!this.#isPolling || this.#pollSessionId !== sessionId) {
      return;
    }
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (target) {
      const adsAgent = target.adsAgent();
      if (adsAgent) {
        const response = await adsAgent.invoke_getAdMetrics();
        if (!this.#isPolling || this.#pollSessionId !== sessionId) {
          return;
        }
        if (!response.getError()) {
          this.#currentMetrics = response.metrics;
          this.#processAdFrames(response.metrics);
          this.requestUpdate();
        }
      }
    }
    if (this.#isPolling && this.#pollSessionId === sessionId) {
      this.#pollTimer = window.setTimeout(() => this.#pollMetrics(sessionId), 500);
    }
  }
  #processAdFrames(metrics) {
    for (const frameId of metrics.removeAdFrames || []) {
      this.#adFrames.delete(frameId);
      this.#adIframeElementIds.delete(frameId);
    }
    for (const frame of metrics.updateAdFrames || []) {
      const frameId = frame.frameId;
      const existingFrame = this.#adFrames.get(frameId) || {};
      const newFrame = { ...existingFrame, ...frame };
      this.#adFrames.set(frameId, newFrame);
    }
    for (const frameId of this.#adFrames.keys()) {
      if (!this.#adIframeElementIds.has(frameId) && !this.#fetchingElementIds.has(frameId)) {
        this.#fetchingElementIds.add(frameId);
        void this.#fetchIframeElementId(frameId).then((elementId) => {
          if (this.#adFrames.has(frameId) && elementId !== void 0) {
            this.#adIframeElementIds.set(frameId, elementId);
          }
        }).catch(() => {
        }).finally(() => {
          this.#fetchingElementIds.delete(frameId);
          this.requestUpdate();
        });
      }
    }
  }
  async #fetchIframeElementId(frameId) {
    const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
    if (!frame) {
      return void 0;
    }
    const deferredNode = await frame.getOwnerDeferredDOMNode();
    if (deferredNode) {
      const node = await deferredNode.resolvePromise();
      return node?.getAttribute("id") || null;
    }
    return null;
  }
  #onPrimaryPageChanged() {
    this.#currentMetrics = {
      viewportAdDensityByArea: 0,
      averageViewportAdDensityByArea: 0,
      viewportAdCount: 0,
      averageViewportAdCount: 0,
      totalAdCpuTime: 0,
      totalAdNetworkBytes: 0,
      updateAdFrames: [],
      removeAdFrames: []
    };
    this.#adFrames.clear();
    this.#adIframeElementIds.clear();
    this.#fetchingElementIds.clear();
    this.requestUpdate();
  }
  performUpdate() {
    const adFramesArray = [];
    for (const [frameId, frame] of this.#adFrames) {
      const elementIdText = this.#adIframeElementIds.has(frameId) ? this.#adIframeElementIds.get(frameId) || i18nString(UIStrings.unnamed) : "";
      const revealFrame = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const frameToReveal = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
        if (frameToReveal) {
          void Common.Revealer.reveal(frameToReveal);
        }
      };
      adFramesArray.push({
        elementId: elementIdText,
        initialOrigin: frame.initialOrigin || "",
        cpuTime: formatCpu(frame.cpuTime),
        rawCpuTime: frame.cpuTime ?? -1,
        networkBytes: formatNetwork(frame.networkBytes),
        rawNetworkBytes: frame.networkBytes ?? -1,
        revealFrame
      });
    }
    const viewInput = {
      metrics: this.#currentMetrics,
      adFrames: adFramesArray
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
};

// gen/front_end/panels/application/components/BackForwardCacheView.js
var BackForwardCacheView_exports = {};
__export(BackForwardCacheView_exports, {
  BackForwardCacheView: () => BackForwardCacheView
});
import "./../../../ui/components/expandable_list/expandable_list.js";
import "./../../../ui/components/report_view/report_view.js";
import "./../../../ui/legacy/legacy.js";
import "./../../../ui/kit/kit.js";
import * as Common2 from "./../../../core/common/common.js";
import * as i18n5 from "./../../../core/i18n/i18n.js";
import * as SDK2 from "./../../../core/sdk/sdk.js";
import * as Buttons from "./../../../ui/components/buttons/buttons.js";
import * as Components from "./../../../ui/legacy/components/utils/utils.js";
import * as UI2 from "./../../../ui/legacy/legacy.js";
import { html as html2, nothing as nothing2, render as render2 } from "./../../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/BackForwardCacheStrings.js
import * as i18n3 from "./../../../core/i18n/i18n.js";
var UIStrings2 = {
  /**
   * @description Description text for not restored reason NotMainFrame.
   */
  notMainFrame: "Navigation happened in a frame other than the main frame.",
  /**
   * @description Description text for not restored reason BackForwardCacheDisabled.
   */
  backForwardCacheDisabled: "Back/forward cache is disabled by flags. Visit chrome://flags/#back-forward-cache to enable it locally on this device.",
  /**
   * @description Description text for not restored reason RelatedActiveContentsExist.
   * Note: "window.open()" is the name of a JavaScript method and should not be translated.
   */
  relatedActiveContentsExist: "The page was opened using '`window.open()`' and another tab has a reference to it, or the page opened a window.",
  /**
   * @description Description text for not restored reason HTTPStatusNotOK.
   */
  HTTPStatusNotOK: "Only pages with a status code of 2XX can be cached.",
  /**
   * @description Description text for not restored reason SchemeNotHTTPOrHTTPS.
   */
  schemeNotHTTPOrHTTPS: "Only pages whose URL scheme is HTTP / HTTPS can be cached.",
  /**
   * @description Description text for not restored reason Loading.
   */
  loading: "The page did not finish loading before navigating away.",
  /**
   * @description Description text for not restored reason WasGrantedMediaAccess.
   */
  wasGrantedMediaAccess: "Pages that have granted access to record video or audio are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason HTTPMethodNotGET.
   */
  HTTPMethodNotGET: "Only pages loaded via a GET request are eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason SubframeIsNavigating.
   */
  subframeIsNavigating: "An iframe on the page started a navigation that did not complete.",
  /**
   * @description Description text for not restored reason Timeout.
   */
  timeout: "The page exceeded the maximum time in back/forward cache and was expired.",
  /**
   * @description Description text for not restored reason CacheLimit.
   */
  cacheLimit: "The page was evicted from the cache to allow another page to be cached.",
  /**
   * @description Description text for not restored reason JavaScriptExecution.
   */
  JavaScriptExecution: "Chrome detected an attempt to execute JavaScript while in the cache.",
  /**
   * @description Description text for not restored reason RendererProcessKilled.
   */
  rendererProcessKilled: "The renderer process for the page in back/forward cache was killed.",
  /**
   * @description Description text for not restored reason RendererProcessCrashed.
   */
  rendererProcessCrashed: "The renderer process for the page in back/forward cache crashed.",
  /**
   * @description Description text for not restored reason GrantedMediaStreamAccess.
   */
  grantedMediaStreamAccess: "Pages that have granted media stream access are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason CacheFlushed.
   */
  cacheFlushed: "The cache was intentionally cleared.",
  /**
   * @description Description text for not restored reason ServiceWorkerVersionActivation.
   */
  serviceWorkerVersionActivation: "The page was evicted from back/forward cache due to a service worker activation.",
  /**
   * @description Description text for not restored reason SessionRestored.
   */
  sessionRestored: "Chrome restarted and cleared the back/forward cache entries.",
  /**
   * @description Description text for not restored reason ServiceWorkerPostMessage.
   * Note: "MessageEvent" should not be translated.
   */
  serviceWorkerPostMessage: "A service worker attempted to send the page in back/forward cache a `MessageEvent`.",
  /**
   * @description Description text for not restored reason EnteredBackForwardCacheBeforeServiceWorkerHostAdded.
   */
  enteredBackForwardCacheBeforeServiceWorkerHostAdded: "A service worker was activated while the page was in back/forward cache.",
  /**
   * @description Description text for not restored reason ServiceWorkerClaim.
   */
  serviceWorkerClaim: "The page was claimed by a service worker while it is in back/forward cache.",
  /**
   * @description Description text for not restored reason HaveInnerContents.
   */
  haveInnerContents: "Pages that have certain kinds of embedded content (e.g. PDFs) are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason TimeoutPuttingInCache.
   */
  timeoutPuttingInCache: "The page timed out entering back/forward cache (likely due to long-running pagehide handlers).",
  /**
   * @description Description text for not restored reason BackForwardCacheDisabledByLowMemory.
   */
  backForwardCacheDisabledByLowMemory: "Back/forward cache is disabled due to insufficient memory.",
  /**
   * @description Description text for not restored reason BackForwardcCacheDisabledByCommandLine.
   */
  backForwardCacheDisabledByCommandLine: "Back/forward cache is disabled by the command line.",
  /**
   * @description Description text for not restored reason NetworkRequestDatapipeDrainedAsBytesConsumer.
   */
  networkRequestDatapipeDrainedAsBytesConsumer: "Pages that have inflight fetch() or XHR are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason NetworkRequestRedirected.
   */
  networkRequestRedirected: "The page was evicted from back/forward cache because an active network request involved a redirect.",
  /**
   * @description Description text for not restored reason NetworkRequestTimeout.
   */
  networkRequestTimeout: "The page was evicted from the cache because a network connection was open too long. Chrome limits the amount of time that a page may receive data while cached.",
  /**
   * @description Description text for not restored reason NetworkExceedsBufferLimit.
   */
  networkExceedsBufferLimit: "The page was evicted from the cache because an active network connection received too much data. Chrome limits the amount of data that a page may receive while cached.",
  /**
   * @description Description text for not restored reason NavigationCancelledWhileRestoring.
   */
  navigationCancelledWhileRestoring: "Navigation was cancelled before the page could be restored from back/forward cache.",
  /**
   * @description Description text for not restored reason BackForwardCacheDisabledForPrerender.
   */
  backForwardCacheDisabledForPrerender: "Back/forward cache is disabled for prerenderer.",
  /**
   * @description Description text for not restored reason userAgentOverrideDiffers.
   */
  userAgentOverrideDiffers: "Browser has changed the user agent override header.",
  /**
   * @description Description text for not restored reason ForegroundCacheLimit.
   */
  foregroundCacheLimit: "The page was evicted from the cache to allow another page to be cached.",
  /**
   * @description Description text for not restored reason BackForwardCacheDisabledForDelegate.
   */
  backForwardCacheDisabledForDelegate: "Back/forward cache is not supported by delegate.",
  /**
   * @description Description text for not restored reason UnloadHandlerExistsInMainFrame.
   */
  unloadHandlerExistsInMainFrame: "The page has an unload handler in the main frame.",
  /**
   * @description Description text for not restored reason UnloadHandlerExistsInSubFrame.
   */
  unloadHandlerExistsInSubFrame: "The page has an unload handler in a sub frame.",
  /**
   * @description Description text for not restored reason ServiceWorkerUnregistration.
   */
  serviceWorkerUnregistration: "ServiceWorker was unregistered while a page was in back/forward cache.",
  /**
   * @description Description text for not restored reason NoResponseHead.
   */
  noResponseHead: "Pages that do not have a valid response head cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason CacheControlNoStore.
   */
  cacheControlNoStore: "Pages with cache-control:no-store header cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason IneligibleAPI.
   */
  ineligibleAPI: "Ineligible APIs were used.",
  /**
   * @description Description text for not restored reason InternalError.
   */
  internalError: "Internal error.",
  /**
   * @description Description text for not restored reason WebSocket.
   */
  webSocket: "Pages with WebSocket cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason WebTransport.
   */
  webTransport: "Pages with WebTransport cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason WebRTC.
   */
  webRTC: "Pages with WebRTC cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason MainResourceHasCacheControlNoStore.
   */
  mainResourceHasCacheControlNoStore: "Pages whose main resource has cache-control:no-store cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason MainResourceHasCacheControlNoCache.
   */
  mainResourceHasCacheControlNoCache: "Pages whose main resource has cache-control:no-cache cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason SubresourceHasCacheControlNoStore.
   */
  subresourceHasCacheControlNoStore: "Pages whose subresource has cache-control:no-store cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason SubresourceHasCacheControlNoCache.
   */
  subresourceHasCacheControlNoCache: "Pages whose subresource has cache-control:no-cache cannot enter back/forward cache.",
  /**
   * @description Description text for not restored reason ContainsPlugins.
   */
  containsPlugins: "Pages containing plugins are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason DocumentLoaded.
   */
  documentLoaded: "The document did not finish loading before navigating away.",
  /**
   * @description Description text for not restored reason DedicatedWorkerOrWorklet.
   */
  dedicatedWorkerOrWorklet: "Pages that use a dedicated worker or worklet are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason OutstandingNetworkRequestOthers.
   */
  outstandingNetworkRequestOthers: "Pages with an in-flight network request are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason OutstandingIndexedDBTransaction.
   */
  outstandingIndexedDBTransaction: "Page with ongoing indexed DB transactions are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason RequestedNotificationsPermission.
   */
  requestedNotificationsPermission: "Pages that have requested notifications permissions are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason RequestedMIDIPermission.
   */
  requestedMIDIPermission: "Pages that have requested MIDI permissions are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason RequestedAudioCapturePermission.
   */
  requestedAudioCapturePermission: "Pages that have requested audio capture permissions are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason RequestedVideoCapturePermission.
   */
  requestedVideoCapturePermission: "Pages that have requested video capture permissions are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason RequestedBackForwardCacheBlockedSensors.
   */
  requestedBackForwardCacheBlockedSensors: "Pages that have requested sensor permissions are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason RequestedBackgroundWorkPermission.
   */
  requestedBackgroundWorkPermission: "Pages that have requested background sync or fetch permissions are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason BroadcastChannel.
   */
  broadcastChannel: "The page cannot be cached because it has a BroadcastChannel instance with registered listeners.",
  /**
   * @description Description text for not restored reason IndexedDBConnection.
   */
  indexedDBConnection: "Pages that have an open IndexedDB connection are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason WebXR.
   */
  webXR: "Pages that use WebXR are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason SharedWorker.
   */
  sharedWorker: "Pages that use SharedWorker are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason SharedWorkerMessage.
   */
  sharedWorkerMessage: "The page was evicted from the cache because it received a message from a SharedWorker",
  /**
   * @description Description text for not restored reason WebLocks.
   */
  webLocks: "Pages that use WebLocks are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason WebHID.
   */
  webHID: "Pages that use WebHID are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason WebShare.
   */
  webShare: "Pages that use WebShare are not currently eligible for back/forwad cache.",
  /**
   * @description Description text for not restored reason RequestedStorageAccessGrant.
   */
  requestedStorageAccessGrant: "Pages that have requested storage access are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason WebNfc.
   */
  webNfc: "Pages that use WebNfc are not currently eligible for back/forwad cache.",
  /**
   * @description Description text for not restored reason OutstandingNetworkRequestFetch.
   */
  outstandingNetworkRequestFetch: "Pages with an in-flight fetch network request are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason OutstandingNetworkRequestXHR.
   */
  outstandingNetworkRequestXHR: "Pages with an in-flight XHR network request are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason AppBanner.
   */
  appBanner: "Pages that requested an AppBanner are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason Printing.
   */
  printing: "Pages that show Printing UI are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason WebDatabase.
   */
  webDatabase: "Pages that use WebDatabase are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason PictureInPicture.
   */
  pictureInPicture: "Pages that use Picture-in-Picture are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason SpeechRecognizer.
   */
  speechRecognizer: "Pages that use SpeechRecognizer are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason IdleManager.
   */
  idleManager: "Pages that use IdleManager are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason PaymentManager.
   */
  paymentManager: "Pages that use PaymentManager are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason SpeechSynthesis.
   */
  speechSynthesis: "Pages that use SpeechSynthesis are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason KeyboardLock.
   */
  keyboardLock: "Pages that use Keyboard lock are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason WebOTPService.
   */
  webOTPService: "Pages that use WebOTPService are not currently eligible for bfcache.",
  /**
   * @description Description text for not restored reason OutstandingNetworkRequestDirectSocket.
   */
  outstandingNetworkRequestDirectSocket: "Pages with an in-flight network request are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason InjectedJavascript.
   */
  injectedJavascript: "Pages that `JavaScript` is injected into by extensions are not currently eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason InjectedStyleSheet.
   */
  injectedStyleSheet: "Pages that a `StyleSheet` is injected into by extensions are not currently eligible for back/forward cache.",
  // TODO(tluk): Please provide meaningful description.
  /**
   * @description Description text for not restored reason ContentDiscarded.
   */
  contentDiscarded: "Undefined",
  /**
   * @description Description text for not restored reason ContentSecurityHandler.
   */
  contentSecurityHandler: "Pages that use SecurityHandler are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason NotMainFrame.
   */
  contentWebAuthenticationAPI: "Pages that use WebAuthetication API are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason NotMainFrame.
   */
  contentFileChooser: "Pages that use FileChooser API are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason NotMainFrame.
   */
  contentSerial: "Pages that use Serial API are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason NotMainFrame.
   */
  contentFileSystemAccess: "Pages that use File System Access API are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason NotMainFrame.
   */
  contentMediaDevicesDispatcherHost: "Pages that use Media Device Dispatcher are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason NotMainFrame.
   */
  contentWebBluetooth: "Pages that use WebBluetooth API are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason ContentWebUSB.
   */
  contentWebUSB: "Pages that use WebUSB API are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason ContentMediaSession.
   */
  contentMediaSession: "Pages that use MediaSession API and set a playback state are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason ContentMediaSessionService.
   */
  contentMediaSessionService: "Pages that use MediaSession API and set action handlers are not eligible for back/forward cache.",
  /**
   * @description Description text for not restored reason ContentMediaPlay.
   */
  contentMediaPlay: "A media player was playing upon navigating away.",
  /**
   * @description Description text for not restored reason ContentScreenReader.
   */
  contentScreenReader: "Back/forward cache is disabled due to screen reader.",
  /**
   *  @description Description text for not restored reason EmbedderPopupBlockerTabHelper.
   */
  embedderPopupBlockerTabHelper: "Popup blocker was present upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderSafeBrowsingTriggeredPopupBlocker.
   */
  embedderSafeBrowsingTriggeredPopupBlocker: "Safe Browsing considered this page to be abusive and blocked popup.",
  /**
   *  @description Description text for not restored reason EmbedderSafeBrowsingThreatDetails.
   */
  embedderSafeBrowsingThreatDetails: "Safe Browsing details were shown upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderAppBannerManager.
   */
  embedderAppBannerManager: "App Banner was present upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderDomDistillerViewerSource.
   */
  embedderDomDistillerViewerSource: "DOM Distiller Viewer was present upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderDomDistillerSelfDeletingRequestDelegate.
   */
  embedderDomDistillerSelfDeletingRequestDelegate: "DOM distillation was in progress upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderOomInterventionTabHelper.
   */
  embedderOomInterventionTabHelper: "Out-Of-Memory Intervention bar was present upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderOfflinePage.
   */
  embedderOfflinePage: "The offline page was shown upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderChromePasswordManagerClientBindCredentialManager.
   */
  embedderChromePasswordManagerClientBindCredentialManager: "Chrome Password Manager was present upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderPermissionRequestManager.
   */
  embedderPermissionRequestManager: "There were permission requests upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderModalDialog.
   */
  embedderModalDialog: "Modal dialog such as form resubmission or http password dialog was shown for the page upon navigating away.",
  /**
   *  @description Description text for not restored reason EmbedderExtensions.
   */
  embedderExtensions: "Back/forward cache is disabled due to extensions.",
  /**
   *  @description Description text for not restored reason EmbedderExtensionMessaging.
   */
  embedderExtensionMessaging: "Back/forward cache is disabled due to extensions using messaging API.",
  /**
   *  @description Description text for not restored reason EmbedderExtensionMessagingForOpenPort.
   */
  embedderExtensionMessagingForOpenPort: "Extensions with long-lived connection should close the connection before entering back/forward cache.",
  /**
   *  @description Description text for not restored reason EmbedderExtensionSentMessageToCachedFrame.
   */
  embedderExtensionSentMessageToCachedFrame: "Extensions with long-lived connection attempted to send messages to frames in back/forward cache.",
  /**
   *  @description Description text for not restored reason ErrorDocument.
   */
  errorDocument: "Back/forward cache is disabled due to a document error.",
  /**
   *  @description Description text for not restored reason FencedFramesEmbedder.
   */
  fencedFramesEmbedder: "Pages using FencedFrames cannot be stored in bfcache.",
  /**
   *  @description Description text for not restored reason KeepaliveRequest.
   */
  keepaliveRequest: "Back/forward cache is disabled due to a keepalive request.",
  /**
   *  @description Description text for not restored reason JsNetworkRequestReceivedCacheControlNoStoreResource.
   */
  jsNetworkRequestReceivedCacheControlNoStoreResource: "Back/forward cache is disabled because some JavaScript network request received resource with `Cache-Control: no-store` header.",
  /**
   *  @description Description text for not restored reason IndexedDBEvent.
   */
  indexedDBEvent: "Back/forward cache is disabled due to an IndexedDB event.",
  /**
   * @description Description text for not restored reason CookieDisabled.
   */
  cookieDisabled: "Back/forward cache is disabled because cookies are disabled on a page that uses `Cache-Control: no-store`.",
  /**
   * @description Description text for not restored reason WebRTCUsedWithCCNS.
   */
  webRTCUsedWithCCNS: "Back/forward cache is disabled because WebRTC has been used.",
  /**
   * @description Description text for not restored reason WebTransportUsedWithCCNS.
   */
  webTransportUsedWithCCNS: "Back/forward cache is disabled because WebTransport has been used.",
  /**
   * @description Description text for not restored reason WebSocketUsedWithCCNS.
   */
  webSocketUsedWithCCNS: "Back/forward cache is disabled because WebSocket has been used."
};
var str_2 = i18n3.i18n.registerUIStrings("panels/application/components/BackForwardCacheStrings.ts", UIStrings2);
var i18nLazyString = i18n3.i18n.getLazilyComputedLocalizedString.bind(void 0, str_2);
var NotRestoredReasonDescription = {
  NotPrimaryMainFrame: { name: i18nLazyString(UIStrings2.notMainFrame) },
  BackForwardCacheDisabled: { name: i18nLazyString(UIStrings2.backForwardCacheDisabled) },
  RelatedActiveContentsExist: { name: i18nLazyString(UIStrings2.relatedActiveContentsExist) },
  HTTPStatusNotOK: { name: i18nLazyString(UIStrings2.HTTPStatusNotOK) },
  SchemeNotHTTPOrHTTPS: { name: i18nLazyString(UIStrings2.schemeNotHTTPOrHTTPS) },
  Loading: { name: i18nLazyString(UIStrings2.loading) },
  WasGrantedMediaAccess: { name: i18nLazyString(UIStrings2.wasGrantedMediaAccess) },
  HTTPMethodNotGET: { name: i18nLazyString(UIStrings2.HTTPMethodNotGET) },
  SubframeIsNavigating: { name: i18nLazyString(UIStrings2.subframeIsNavigating) },
  Timeout: { name: i18nLazyString(UIStrings2.timeout) },
  CacheLimit: { name: i18nLazyString(UIStrings2.cacheLimit) },
  JavaScriptExecution: { name: i18nLazyString(UIStrings2.JavaScriptExecution) },
  RendererProcessKilled: { name: i18nLazyString(UIStrings2.rendererProcessKilled) },
  RendererProcessCrashed: { name: i18nLazyString(UIStrings2.rendererProcessCrashed) },
  // @ts-expect-error kept for backwards compatibly
  GrantedMediaStreamAccess: { name: i18nLazyString(UIStrings2.grantedMediaStreamAccess) },
  CacheFlushed: { name: i18nLazyString(UIStrings2.cacheFlushed) },
  ServiceWorkerVersionActivation: { name: i18nLazyString(UIStrings2.serviceWorkerVersionActivation) },
  SessionRestored: { name: i18nLazyString(UIStrings2.sessionRestored) },
  ServiceWorkerPostMessage: { name: i18nLazyString(UIStrings2.serviceWorkerPostMessage) },
  EnteredBackForwardCacheBeforeServiceWorkerHostAdded: { name: i18nLazyString(UIStrings2.enteredBackForwardCacheBeforeServiceWorkerHostAdded) },
  ServiceWorkerClaim: { name: i18nLazyString(UIStrings2.serviceWorkerClaim) },
  HaveInnerContents: { name: i18nLazyString(UIStrings2.haveInnerContents) },
  TimeoutPuttingInCache: { name: i18nLazyString(UIStrings2.timeoutPuttingInCache) },
  BackForwardCacheDisabledByLowMemory: { name: i18nLazyString(UIStrings2.backForwardCacheDisabledByLowMemory) },
  BackForwardCacheDisabledByCommandLine: { name: i18nLazyString(UIStrings2.backForwardCacheDisabledByCommandLine) },
  NetworkRequestDatapipeDrainedAsBytesConsumer: { name: i18nLazyString(UIStrings2.networkRequestDatapipeDrainedAsBytesConsumer) },
  NetworkRequestRedirected: { name: i18nLazyString(UIStrings2.networkRequestRedirected) },
  NetworkRequestTimeout: { name: i18nLazyString(UIStrings2.networkRequestTimeout) },
  NetworkExceedsBufferLimit: { name: i18nLazyString(UIStrings2.networkExceedsBufferLimit) },
  NavigationCancelledWhileRestoring: { name: i18nLazyString(UIStrings2.navigationCancelledWhileRestoring) },
  BackForwardCacheDisabledForPrerender: { name: i18nLazyString(UIStrings2.backForwardCacheDisabledForPrerender) },
  UserAgentOverrideDiffers: { name: i18nLazyString(UIStrings2.userAgentOverrideDiffers) },
  ForegroundCacheLimit: { name: i18nLazyString(UIStrings2.foregroundCacheLimit) },
  BackForwardCacheDisabledForDelegate: { name: i18nLazyString(UIStrings2.backForwardCacheDisabledForDelegate) },
  UnloadHandlerExistsInMainFrame: { name: i18nLazyString(UIStrings2.unloadHandlerExistsInMainFrame) },
  UnloadHandlerExistsInSubFrame: { name: i18nLazyString(UIStrings2.unloadHandlerExistsInSubFrame) },
  ServiceWorkerUnregistration: { name: i18nLazyString(UIStrings2.serviceWorkerUnregistration) },
  NoResponseHead: { name: i18nLazyString(UIStrings2.noResponseHead) },
  CacheControlNoStore: { name: i18nLazyString(UIStrings2.cacheControlNoStore) },
  CacheControlNoStoreCookieModified: { name: i18nLazyString(UIStrings2.cacheControlNoStore) },
  CacheControlNoStoreHTTPOnlyCookieModified: { name: i18nLazyString(UIStrings2.cacheControlNoStore) },
  DisableForRenderFrameHostCalled: { name: i18nLazyString(UIStrings2.ineligibleAPI) },
  BlocklistedFeatures: { name: i18nLazyString(UIStrings2.ineligibleAPI) },
  SchedulerTrackedFeatureUsed: { name: i18nLazyString(UIStrings2.ineligibleAPI) },
  DomainNotAllowed: { name: i18nLazyString(UIStrings2.internalError) },
  ConflictingBrowsingInstance: { name: i18nLazyString(UIStrings2.internalError) },
  NotMostRecentNavigationEntry: { name: i18nLazyString(UIStrings2.internalError) },
  IgnoreEventAndEvict: { name: i18nLazyString(UIStrings2.internalError) },
  BrowsingInstanceNotSwapped: { name: i18nLazyString(UIStrings2.internalError) },
  ActivationNavigationsDisallowedForBug1234857: { name: i18nLazyString(UIStrings2.internalError) },
  Unknown: { name: i18nLazyString(UIStrings2.internalError) },
  RenderFrameHostReused_SameSite: { name: i18nLazyString(UIStrings2.internalError) },
  RenderFrameHostReused_CrossSite: { name: i18nLazyString(UIStrings2.internalError) },
  WebSocket: { name: i18nLazyString(UIStrings2.webSocket) },
  WebTransport: { name: i18nLazyString(UIStrings2.webTransport) },
  WebRTC: { name: i18nLazyString(UIStrings2.webRTC) },
  MainResourceHasCacheControlNoStore: { name: i18nLazyString(UIStrings2.mainResourceHasCacheControlNoStore) },
  MainResourceHasCacheControlNoCache: { name: i18nLazyString(UIStrings2.mainResourceHasCacheControlNoCache) },
  SubresourceHasCacheControlNoStore: { name: i18nLazyString(UIStrings2.subresourceHasCacheControlNoStore) },
  SubresourceHasCacheControlNoCache: { name: i18nLazyString(UIStrings2.subresourceHasCacheControlNoCache) },
  ContainsPlugins: { name: i18nLazyString(UIStrings2.containsPlugins) },
  DocumentLoaded: { name: i18nLazyString(UIStrings2.documentLoaded) },
  DedicatedWorkerOrWorklet: { name: i18nLazyString(UIStrings2.dedicatedWorkerOrWorklet) },
  OutstandingNetworkRequestOthers: { name: i18nLazyString(UIStrings2.outstandingNetworkRequestOthers) },
  OutstandingIndexedDBTransaction: { name: i18nLazyString(UIStrings2.outstandingIndexedDBTransaction) },
  RequestedNotificationsPermission: { name: i18nLazyString(UIStrings2.requestedNotificationsPermission) },
  RequestedMIDIPermission: { name: i18nLazyString(UIStrings2.requestedMIDIPermission) },
  RequestedAudioCapturePermission: { name: i18nLazyString(UIStrings2.requestedAudioCapturePermission) },
  RequestedVideoCapturePermission: { name: i18nLazyString(UIStrings2.requestedVideoCapturePermission) },
  RequestedBackForwardCacheBlockedSensors: { name: i18nLazyString(UIStrings2.requestedBackForwardCacheBlockedSensors) },
  RequestedBackgroundWorkPermission: { name: i18nLazyString(UIStrings2.requestedBackgroundWorkPermission) },
  BroadcastChannel: { name: i18nLazyString(UIStrings2.broadcastChannel) },
  IndexedDBConnection: { name: i18nLazyString(UIStrings2.indexedDBConnection) },
  WebXR: { name: i18nLazyString(UIStrings2.webXR) },
  SharedWorker: { name: i18nLazyString(UIStrings2.sharedWorker) },
  SharedWorkerMessage: { name: i18nLazyString(UIStrings2.sharedWorkerMessage) },
  WebLocks: { name: i18nLazyString(UIStrings2.webLocks) },
  WebHID: { name: i18nLazyString(UIStrings2.webHID) },
  WebShare: { name: i18nLazyString(UIStrings2.webShare) },
  RequestedStorageAccessGrant: { name: i18nLazyString(UIStrings2.requestedStorageAccessGrant) },
  WebNfc: { name: i18nLazyString(UIStrings2.webNfc) },
  OutstandingNetworkRequestFetch: { name: i18nLazyString(UIStrings2.outstandingNetworkRequestFetch) },
  OutstandingNetworkRequestXHR: { name: i18nLazyString(UIStrings2.outstandingNetworkRequestXHR) },
  AppBanner: { name: i18nLazyString(UIStrings2.appBanner) },
  Printing: { name: i18nLazyString(UIStrings2.printing) },
  WebDatabase: { name: i18nLazyString(UIStrings2.webDatabase) },
  PictureInPicture: { name: i18nLazyString(UIStrings2.pictureInPicture) },
  SpeechRecognizer: { name: i18nLazyString(UIStrings2.speechRecognizer) },
  IdleManager: { name: i18nLazyString(UIStrings2.idleManager) },
  PaymentManager: { name: i18nLazyString(UIStrings2.paymentManager) },
  SpeechSynthesis: { name: i18nLazyString(UIStrings2.speechSynthesis) },
  KeyboardLock: { name: i18nLazyString(UIStrings2.keyboardLock) },
  WebOTPService: { name: i18nLazyString(UIStrings2.webOTPService) },
  OutstandingNetworkRequestDirectSocket: { name: i18nLazyString(UIStrings2.outstandingNetworkRequestDirectSocket) },
  InjectedJavascript: { name: i18nLazyString(UIStrings2.injectedJavascript) },
  InjectedStyleSheet: { name: i18nLazyString(UIStrings2.injectedStyleSheet) },
  Dummy: { name: i18nLazyString(UIStrings2.internalError) },
  ContentDiscarded: { name: i18nLazyString(UIStrings2.contentDiscarded) },
  ContentSecurityHandler: { name: i18nLazyString(UIStrings2.contentSecurityHandler) },
  ContentWebAuthenticationAPI: { name: i18nLazyString(UIStrings2.contentWebAuthenticationAPI) },
  ContentFileChooser: { name: i18nLazyString(UIStrings2.contentFileChooser) },
  ContentSerial: { name: i18nLazyString(UIStrings2.contentSerial) },
  ContentFileSystemAccess: { name: i18nLazyString(UIStrings2.contentFileSystemAccess) },
  ContentMediaDevicesDispatcherHost: { name: i18nLazyString(UIStrings2.contentMediaDevicesDispatcherHost) },
  ContentWebBluetooth: { name: i18nLazyString(UIStrings2.contentWebBluetooth) },
  ContentWebUSB: { name: i18nLazyString(UIStrings2.contentWebUSB) },
  ContentMediaSession: { name: i18nLazyString(UIStrings2.contentMediaSession) },
  ContentMediaSessionService: { name: i18nLazyString(UIStrings2.contentMediaSessionService) },
  ContentMediaPlay: { name: i18nLazyString(UIStrings2.contentMediaPlay) },
  ContentScreenReader: { name: i18nLazyString(UIStrings2.contentScreenReader) },
  EmbedderPopupBlockerTabHelper: { name: i18nLazyString(UIStrings2.embedderPopupBlockerTabHelper) },
  EmbedderSafeBrowsingTriggeredPopupBlocker: { name: i18nLazyString(UIStrings2.embedderSafeBrowsingTriggeredPopupBlocker) },
  EmbedderSafeBrowsingThreatDetails: { name: i18nLazyString(UIStrings2.embedderSafeBrowsingThreatDetails) },
  EmbedderAppBannerManager: { name: i18nLazyString(UIStrings2.embedderAppBannerManager) },
  EmbedderDomDistillerViewerSource: { name: i18nLazyString(UIStrings2.embedderDomDistillerViewerSource) },
  EmbedderDomDistillerSelfDeletingRequestDelegate: { name: i18nLazyString(UIStrings2.embedderDomDistillerSelfDeletingRequestDelegate) },
  EmbedderOomInterventionTabHelper: { name: i18nLazyString(UIStrings2.embedderOomInterventionTabHelper) },
  EmbedderOfflinePage: { name: i18nLazyString(UIStrings2.embedderOfflinePage) },
  EmbedderChromePasswordManagerClientBindCredentialManager: { name: i18nLazyString(UIStrings2.embedderChromePasswordManagerClientBindCredentialManager) },
  EmbedderPermissionRequestManager: { name: i18nLazyString(UIStrings2.embedderPermissionRequestManager) },
  EmbedderModalDialog: { name: i18nLazyString(UIStrings2.embedderModalDialog) },
  EmbedderExtensions: { name: i18nLazyString(UIStrings2.embedderExtensions) },
  EmbedderExtensionMessaging: { name: i18nLazyString(UIStrings2.embedderExtensionMessaging) },
  EmbedderExtensionMessagingForOpenPort: { name: i18nLazyString(UIStrings2.embedderExtensionMessagingForOpenPort) },
  EmbedderExtensionSentMessageToCachedFrame: { name: i18nLazyString(UIStrings2.embedderExtensionSentMessageToCachedFrame) },
  ErrorDocument: { name: i18nLazyString(UIStrings2.errorDocument) },
  FencedFramesEmbedder: { name: i18nLazyString(UIStrings2.fencedFramesEmbedder) },
  KeepaliveRequest: { name: i18nLazyString(UIStrings2.keepaliveRequest) },
  JsNetworkRequestReceivedCacheControlNoStoreResource: { name: i18nLazyString(UIStrings2.jsNetworkRequestReceivedCacheControlNoStoreResource) },
  IndexedDBEvent: { name: i18nLazyString(UIStrings2.indexedDBEvent) },
  CookieDisabled: { name: i18nLazyString(UIStrings2.cookieDisabled) },
  WebRTCUsedWithCCNS: { name: i18nLazyString(UIStrings2.webRTCUsedWithCCNS) },
  WebTransportUsedWithCCNS: { name: i18nLazyString(UIStrings2.webTransportUsedWithCCNS) },
  WebSocketUsedWithCCNS: { name: i18nLazyString(UIStrings2.webSocketUsedWithCCNS) },
  HTTPAuthRequired: { name: i18n3.i18n.lockedLazyString("HTTPAuthRequired") },
  CookieFlushed: { name: i18n3.i18n.lockedLazyString("CookieFlushed") },
  SmartCard: { name: i18n3.i18n.lockedLazyString("SmartCard") },
  LiveMediaStreamTrack: { name: i18n3.i18n.lockedLazyString("LiveMediaStreamTrack") },
  UnloadHandler: { name: i18n3.i18n.lockedLazyString("UnloadHandler") },
  ParserAborted: { name: i18n3.i18n.lockedLazyString("ParserAborted") },
  BroadcastChannelOnMessage: { name: i18n3.i18n.lockedLazyString("BroadcastChannelOnMessage") },
  RequestedByWebViewClient: { name: i18n3.i18n.lockedLazyString("RequestedByWebViewClient") },
  PostMessageByWebViewClient: { name: i18n3.i18n.lockedLazyString("PostMessageByWebViewClient") },
  WebViewSettingsChanged: { name: i18n3.i18n.lockedLazyString("WebViewSettingsChanged") },
  WebViewJavaScriptObjectChanged: { name: i18n3.i18n.lockedLazyString("WebViewJavaScriptObjectChanged") },
  WebViewMessageListenerInjected: { name: i18n3.i18n.lockedLazyString("WebViewMessageListenerInjected") },
  WebViewSafeBrowsingAllowlistChanged: { name: i18n3.i18n.lockedLazyString("WebViewSafeBrowsingAllowlistChanged") },
  WebViewDocumentStartJavascriptChanged: { name: i18n3.i18n.lockedLazyString("WebViewDocumentStartJavascriptChanged") },
  CacheControlNoStoreDeviceBoundSessionTerminated: { name: i18nLazyString(UIStrings2.cacheControlNoStore) },
  CacheLimitPrunedOnModerateMemoryPressure: { name: i18n3.i18n.lockedLazyString("CacheLimitPrunedOnModerateMemoryPressure") },
  CacheLimitPrunedOnCriticalMemoryPressure: { name: i18n3.i18n.lockedLazyString("CacheLimitPrunedOnCriticalMemoryPressure") }
};

// gen/front_end/panels/application/components/backForwardCacheView.css.js
var backForwardCacheView_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  overflow: auto;
}

devtools-report-value {
  overflow: hidden;
}

.inline-icon {
  vertical-align: sub;
}

.gray-text {
  color: var(--sys-color-token-subtle);
  margin: 0 0 5px 56px;
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: auto;
  overflow-wrap: break-word;
  overflow: hidden;
  grid-column-start: span 2;
}

.details-list {
  margin-left: 56px;
  grid-column-start: span 2;
}

.help-outline-icon {
  margin: 0 2px;
}

.circled-exclamation-icon {
  margin-right: 10px;
  flex-shrink: 0;
}

.status {
  margin-right: 11px;
  flex-shrink: 0;
}

.report-line {
  grid-column-start: span 2;
  display: flex;
  align-items: center;
  margin: 0 30px;
  line-height: 26px;
}

.report-key {
  color: var(--sys-color-token-subtle);
  min-width: auto;
  overflow-wrap: break-word;
  align-self: start;
}

.report-value {
  padding: 0 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link,
.devtools-link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
}

devtools-report-value:has(devtools-tree-outline) {
  margin-left: var(--sys-size-7);
}

.cache-status-section:focus-visible {
 outline: 0;
}

.tree-outline li .selection {
  margin-left: -5px;
}

@media (forced-colors: active) {
  .link,
  .devtools-link {
    color: linktext;
    text-decoration-color: linktext;
  }
}

/*# sourceURL=${import.meta.resolve("./backForwardCacheView.css")} */`;

// gen/front_end/panels/application/components/BackForwardCacheView.js
var UIStrings3 = {
  /**
   * @description Title text in back/forward cache view of the Application panel
   */
  mainFrame: "Main Frame",
  /**
   * @description Title text in back/forward cache view of the Application panel
   */
  backForwardCacheTitle: "Back/forward cache",
  /**
   * @description Status text for the status of the main frame
   */
  unavailable: "unavailable",
  /**
   * @description Entry name text in the back/forward cache view of the Application panel
   */
  url: "URL",
  /**
   * @description Status text for the status of the back/forward cache status
   */
  unknown: "Unknown Status",
  /**
   * @description Status text for the status of the back/forward cache status indicating that
   * the back/forward cache was not used and a normal navigation occurred instead.
   */
  normalNavigation: "Not served from back/forward cache: to trigger back/forward cache, use Chrome\u2019s back/forward buttons, or use the test button below to automatically navigate away and back.",
  /**
   * @description Status text for the status of the back/forward cache status indicating that
   * the back/forward cache was used to restore the page instead of reloading it.
   */
  restoredFromBFCache: "Successfully served from back/forward cache.",
  /**
   * @description Label for a list of reasons which prevent the page from being eligible for
   * back/forward cache. These reasons are actionable i.e. they can be cleaned up to make the
   * page eligible for back/forward cache.
   */
  pageSupportNeeded: "Actionable",
  /**
   * @description Label for the completion of the back/forward cache test
   */
  testCompleted: "Back/forward cache test completed.",
  /**
   * @description Explanation for actionable items which prevent the page from being eligible
   * for back/forward cache.
   */
  pageSupportNeededExplanation: "These reasons are actionable i.e. they can be cleaned up to make the page eligible for back/forward cache.",
  /**
   * @description Label for a list of reasons which prevent the page from being eligible for
   * back/forward cache. These reasons are circumstantial / not actionable i.e. they cannot be
   * cleaned up by developers to make the page eligible for back/forward cache.
   */
  circumstantial: "Not Actionable",
  /**
   * @description Explanation for circumstantial/non-actionable items which prevent the page from being eligible
   * for back/forward cache.
   */
  circumstantialExplanation: "These reasons are not actionable i.e. caching was prevented by something outside of the direct control of the page.",
  /**
   * @description Label for a list of reasons which prevent the page from being eligible for
   * back/forward cache. These reasons are pending support by chrome i.e. in a future version
   * of chrome they will not prevent back/forward cache usage anymore.
   */
  supportPending: "Pending Support",
  /**
   * @description Label for the button to test whether BFCache is available for the page
   */
  runTest: "Test back/forward cache",
  /**
   * @description Label for the disabled button while the test is running
   */
  runningTest: "Running test",
  /**
   * @description Link Text about explanation of back/forward cache
   */
  learnMore: "Learn more: back/forward cache eligibility",
  /**
   * @description Link Text about unload handler
   */
  neverUseUnload: "Learn more: Never use unload handler",
  /**
   * @description Explanation for 'pending support' items which prevent the page from being eligible
   * for back/forward cache.
   */
  supportPendingExplanation: "Chrome support for these reasons is pending i.e. they will not prevent the page from being eligible for back/forward cache in a future version of Chrome.",
  /**
   * @description Text that precedes displaying a link to the extension which blocked the page from being eligible for back/forward cache.
   */
  blockingExtensionId: "Extension id: ",
  /**
   * @description Label for the 'Frames' section of the back/forward cache view, which shows a frame tree of the
   * page with reasons why the frames can't be cached.
   */
  framesTitle: "Frames",
  /**
   * @description Top level summary of the total number of issues found in a single frame.
   */
  issuesInSingleFrame: "{n, plural, =1 {# issue found in 1 frame.} other {# issues found in 1 frame.}}",
  /**
   * @description Top level summary of the total number of issues found and the number of frames they were found in.
   * 'm' is never less than 2.
   * @example {3} m
   */
  issuesInMultipleFrames: "{n, plural, =1 {# issue found in {m} frames.} other {# issues found in {m} frames.}}",
  /**
   * @description Shows the number of frames with a particular issue.
   */
  framesPerIssue: "{n, plural, =1 {# frame} other {# frames}}",
  /**
   * @description Title for a frame in the frame tree that doesn't have a URL. Placeholder indicates which number frame with a blank URL it is.
   * @example {3} PH1
   */
  blankURLTitle: "Blank URL [{PH1}]",
  /**
   * @description Shows the number of files with a particular issue.
   */
  filesPerIssue: "{n, plural, =1 {# file} other {# files}}"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/application/components/BackForwardCacheView.ts", UIStrings3);
var i18nString2 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var { widget } = UI2.Widget;
function renderMainFrameInformation(frame, frameTreeData, reasonToFramesMap, screenStatus, navigateAwayAndBack) {
  if (!frame) {
    return html2`
      <devtools-report-key>
        ${i18nString2(UIStrings3.mainFrame)}
      </devtools-report-key>
      <devtools-report-value>
        ${i18nString2(UIStrings3.unavailable)}
      </devtools-report-value>`;
  }
  const isTestRunning = screenStatus === "Running";
  const isTestingForbidden = Common2.ParsedURL.schemeIs(frame.url, "devtools:");
  return html2`
    ${renderBackForwardCacheStatus(frame.backForwardCacheDetails.restoredFromCache)}
    <devtools-report-key>${i18nString2(UIStrings3.url)}</devtools-report-key>
    <devtools-report-value>${frame.url}</devtools-report-value>
    ${maybeRenderFrameTree(frameTreeData)}
    <devtools-report-section>
      <devtools-button
        aria-label=${i18nString2(UIStrings3.runTest)}
        .disabled=${isTestRunning || isTestingForbidden}
        .spinner=${isTestRunning}
        .variant=${"primary"}
        @click=${navigateAwayAndBack}
        jslog=${VisualLogging2.action("back-forward-cache.run-test").track({ click: true })}>
        ${isTestRunning ? html2`
          ${i18nString2(UIStrings3.runningTest)}` : `
          ${i18nString2(UIStrings3.runTest)}
        `}
      </devtools-button>
    </devtools-report-section>
    <devtools-report-divider>
    </devtools-report-divider>
    ${maybeRenderExplanations(frame.backForwardCacheDetails.explanations, frame.backForwardCacheDetails.explanationsTree, reasonToFramesMap)}
    <devtools-report-section>
      <devtools-link href="https://web.dev/bfcache/" class="link"
      jslogcontext="learn-more.eligibility">
        ${i18nString2(UIStrings3.learnMore)}
      </devtools-link>
    </devtools-report-section>`;
}
function maybeRenderFrameTree(frameTreeData) {
  if (!frameTreeData || frameTreeData.frameCount === 0 && frameTreeData.issueCount === 0) {
    return nothing2;
  }
  function renderFrameTreeNode(node) {
    return html2`
      <li role="treeitem" class="text-ellipsis">
        ${node.iconName ? html2`
          <devtools-icon class="inline-icon extra-large" .name=${node.iconName} style="margin-bottom: -3px;">
          </devtools-icon>
        ` : nothing2}
        ${node.text}
        ${node.children?.length ? html2`
          <ul role="group">
            ${node.children.map((child) => renderFrameTreeNode(child))}
          </ul>` : nothing2}
      </li>`;
  }
  let title = "";
  if (frameTreeData.frameCount === 1) {
    title = i18nString2(UIStrings3.issuesInSingleFrame, { n: frameTreeData.issueCount });
  } else {
    title = i18nString2(UIStrings3.issuesInMultipleFrames, { n: frameTreeData.issueCount, m: frameTreeData.frameCount });
  }
  return html2`
    <devtools-report-key jslog=${VisualLogging2.section("frames")}>${i18nString2(UIStrings3.framesTitle)}</devtools-report-key>
    <devtools-report-value>
      <devtools-tree .template=${html2`
        <ul role="tree">
          <li role="treeitem" class="text-ellipsis">
            ${title}
            <ul role="group">
              ${renderFrameTreeNode(frameTreeData.node)}
            </ul>
          </li>
        </ul>
      `}>
      </devtools-tree>
    </devtools-report-value>`;
}
function renderBackForwardCacheStatus(status) {
  switch (status) {
    case true:
      return html2`
        <devtools-report-section autofocus tabindex="-1">
          <div class="status extra-large">
            <devtools-icon class="inline-icon extra-large" name="check-circle" style="color: var(--icon-checkmark-green);">
            </devtools-icon>
          </div>
          ${i18nString2(UIStrings3.restoredFromBFCache)}
        </devtools-report-section>`;
    // clang-format on
    case false:
      return html2`
        <devtools-report-section autofocus tabindex="-1">
          <div class="status">
            <devtools-icon class="inline-icon extra-large" name="clear">
            </devtools-icon>
          </div>
          ${i18nString2(UIStrings3.normalNavigation)}
        </devtools-report-section>`;
  }
  return html2`
    <devtools-report-section autofocus tabindex="-1">
      ${i18nString2(UIStrings3.unknown)}
    </devtools-report-section>`;
}
function maybeRenderExplanations(explanations, explanationTree, reasonToFramesMap) {
  if (explanations.length === 0) {
    return nothing2;
  }
  const pageSupportNeeded = explanations.filter(
    (explanation) => explanation.type === "PageSupportNeeded"
    /* Protocol.Page.BackForwardCacheNotRestoredReasonType.PageSupportNeeded */
  );
  const supportPending = explanations.filter(
    (explanation) => explanation.type === "SupportPending"
    /* Protocol.Page.BackForwardCacheNotRestoredReasonType.SupportPending */
  );
  const circumstantial = explanations.filter(
    (explanation) => explanation.type === "Circumstantial"
    /* Protocol.Page.BackForwardCacheNotRestoredReasonType.Circumstantial */
  );
  return html2`
    ${renderExplanations(i18nString2(UIStrings3.pageSupportNeeded), i18nString2(UIStrings3.pageSupportNeededExplanation), pageSupportNeeded, reasonToFramesMap)}
    ${renderExplanations(i18nString2(UIStrings3.supportPending), i18nString2(UIStrings3.supportPendingExplanation), supportPending, reasonToFramesMap)}
    ${renderExplanations(i18nString2(UIStrings3.circumstantial), i18nString2(UIStrings3.circumstantialExplanation), circumstantial, reasonToFramesMap)}`;
}
function renderExplanations(category, explainerText, explanations, reasonToFramesMap) {
  return html2`
    ${explanations.length > 0 ? html2`
      <devtools-report-section-header>
        ${category}
        <div class="help-outline-icon">
          <devtools-icon class="inline-icon medium" name="help" title=${explainerText}>
          </devtools-icon>
        </div>
      </devtools-report-section-header>
      ${explanations.map((explanation) => renderReason(explanation, reasonToFramesMap.get(explanation.reason)))}
    ` : nothing2}`;
}
function maybeRenderReasonContext(explanation) {
  if (explanation.reason === "EmbedderExtensionSentMessageToCachedFrame" && explanation.context) {
    const link = "chrome://extensions/?id=" + explanation.context;
    return html2`${i18nString2(UIStrings3.blockingExtensionId)}
      <devtools-link .href=${link} allow-privileged>${explanation.context}</devtools-link>`;
  }
  return nothing2;
}
function renderFramesPerReason(frames) {
  if (frames === void 0 || frames.length === 0) {
    return nothing2;
  }
  const rows = [html2`<div>${i18nString2(UIStrings3.framesPerIssue, { n: frames.length })}</div>`];
  rows.push(...frames.map((url) => html2`<div class="text-ellipsis" title=${url}
    jslog=${VisualLogging2.treeItem().track({ resize: true })}>${url}</div>`));
  return html2`
      <div class="details-list"
      jslog=${VisualLogging2.tree("frames-per-issue")}>
        <devtools-expandable-list .data=${{
    rows,
    title: i18nString2(UIStrings3.framesPerIssue, { n: frames.length })
  }}
        jslog=${VisualLogging2.treeItem().track({
    resize: true
  })}></devtools-expandable-list>
      </div>
    `;
}
function maybeRenderDeepLinkToUnload(explanation) {
  if (explanation.reason === "UnloadHandlerExistsInMainFrame" || explanation.reason === "UnloadHandlerExistsInSubFrame") {
    return html2`
        <devtools-link href="https://web.dev/bfcache/#never-use-the-unload-event" class="link"
        jslogContext=${"learn-more.never-use-unload"}>
          ${i18nString2(UIStrings3.neverUseUnload)}
        </devtools-link>`;
  }
  return nothing2;
}
function maybeRenderJavaScriptDetails(details) {
  if (details === void 0 || details.length === 0) {
    return nothing2;
  }
  const maxLengthForDisplayedURLs = 50;
  const rows = [html2`<div>${i18nString2(UIStrings3.filesPerIssue, { n: details.length })}</div>`];
  rows.push(...details.map((detail) => html2`
          ${widget(Components.Linkifier.ScriptLocationLink, {
    sourceURL: detail.url,
    lineNumber: detail.lineNumber,
    options: {
      columnNumber: detail.columnNumber,
      showColumnNumber: true,
      maxLength: maxLengthForDisplayedURLs
    }
  })}`));
  return html2`
      <div class="details-list">
        <devtools-expandable-list .data=${{ rows }}></devtools-expandable-list>
      </div>
    `;
}
function renderReason(explanation, frames) {
  return html2`
    <devtools-report-section>
      ${explanation.reason in NotRestoredReasonDescription ? html2`
          <div class="circled-exclamation-icon">
            <devtools-icon class="inline-icon medium" style="color: var(--icon-warning)" name="warning">
            </devtools-icon>
          </div>
          <div>
            ${NotRestoredReasonDescription[explanation.reason].name()}
            ${maybeRenderDeepLinkToUnload(explanation)}
            ${maybeRenderReasonContext(explanation)}
          </div>` : nothing2}
    </devtools-report-section>
    <div class="gray-text">
      ${explanation.reason}
    </div>
    ${maybeRenderJavaScriptDetails(explanation.details)}
    ${renderFramesPerReason(frames)}`;
}
var DEFAULT_VIEW2 = (input, output, target) => {
  render2(html2`
    <style>${backForwardCacheView_css_default}</style>
    <devtools-report .data=${{ reportTitle: i18nString2(UIStrings3.backForwardCacheTitle) }} jslog=${VisualLogging2.pane("back-forward-cache")}>

      ${renderMainFrameInformation(input.frame, input.frameTreeData, input.reasonToFramesMap, input.screenStatus, input.navigateAwayAndBack)}
    </devtools-report>
  `, target);
};
var BackForwardCacheView = class extends UI2.Widget.Widget {
  #screenStatus = "Result";
  #historyIndex = 0;
  #view;
  constructor(view = DEFAULT_VIEW2) {
    super({ useShadowDom: true, delegatesFocus: true });
    this.#view = view;
  }
  wasShown() {
    super.wasShown();
    SDK2.TargetManager.TargetManager.instance().addModelListener(SDK2.ResourceTreeModel.ResourceTreeModel, SDK2.ResourceTreeModel.Events.PrimaryPageChanged, this.requestUpdate, this);
    SDK2.TargetManager.TargetManager.instance().addModelListener(SDK2.ResourceTreeModel.ResourceTreeModel, SDK2.ResourceTreeModel.Events.BackForwardCacheDetailsUpdated, this.requestUpdate, this);
    this.requestUpdate();
  }
  willHide() {
    SDK2.TargetManager.TargetManager.instance().removeModelListener(SDK2.ResourceTreeModel.ResourceTreeModel, SDK2.ResourceTreeModel.Events.PrimaryPageChanged, this.requestUpdate, this);
    SDK2.TargetManager.TargetManager.instance().removeModelListener(SDK2.ResourceTreeModel.ResourceTreeModel, SDK2.ResourceTreeModel.Events.BackForwardCacheDetailsUpdated, this.requestUpdate, this);
    super.willHide();
  }
  #getMainResourceTreeModel() {
    const mainTarget = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
    return mainTarget?.model(SDK2.ResourceTreeModel.ResourceTreeModel) || null;
  }
  #getMainFrame() {
    return this.#getMainResourceTreeModel()?.mainFrame || null;
  }
  async performUpdate() {
    const reasonToFramesMap = /* @__PURE__ */ new Map();
    const frame = this.#getMainFrame();
    const explanationTree = frame?.backForwardCacheDetails?.explanationsTree;
    if (explanationTree) {
      this.#buildReasonToFramesMap(explanationTree, { blankCount: 1 }, reasonToFramesMap);
    }
    const frameTreeData = this.#buildFrameTreeDataRecursive(explanationTree, { blankCount: 1 });
    frameTreeData.node.iconName = "frame";
    const viewInput = {
      frame,
      frameTreeData,
      reasonToFramesMap,
      screenStatus: this.#screenStatus,
      navigateAwayAndBack: this.#navigateAwayAndBack.bind(this)
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
  #renderBackForwardCacheTestResult() {
    SDK2.TargetManager.TargetManager.instance().removeModelListener(SDK2.ResourceTreeModel.ResourceTreeModel, SDK2.ResourceTreeModel.Events.FrameNavigated, this.#renderBackForwardCacheTestResult, this);
    this.#screenStatus = "Result";
    this.requestUpdate();
    void this.updateComplete.then(() => {
      UI2.ARIAUtils.LiveAnnouncer.alert(i18nString2(UIStrings3.testCompleted));
      this.contentElement.focus();
    });
  }
  async #onNavigatedAway() {
    SDK2.TargetManager.TargetManager.instance().removeModelListener(SDK2.ResourceTreeModel.ResourceTreeModel, SDK2.ResourceTreeModel.Events.FrameNavigated, this.#onNavigatedAway, this);
    await this.#waitAndGoBackInHistory(50);
  }
  async #waitAndGoBackInHistory(delay) {
    const mainTarget = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
    const resourceTreeModel = mainTarget?.model(SDK2.ResourceTreeModel.ResourceTreeModel);
    const historyResults = await resourceTreeModel?.navigationHistory();
    if (!resourceTreeModel || !historyResults) {
      return;
    }
    if (historyResults.currentIndex === this.#historyIndex) {
      window.setTimeout(this.#waitAndGoBackInHistory.bind(this, delay * 2), delay);
    } else {
      SDK2.TargetManager.TargetManager.instance().addModelListener(SDK2.ResourceTreeModel.ResourceTreeModel, SDK2.ResourceTreeModel.Events.FrameNavigated, this.#renderBackForwardCacheTestResult, this);
      resourceTreeModel.navigateToHistoryEntry(historyResults.entries[historyResults.currentIndex - 1]);
    }
  }
  async #navigateAwayAndBack() {
    const mainTarget = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
    const resourceTreeModel = mainTarget?.model(SDK2.ResourceTreeModel.ResourceTreeModel);
    const historyResults = await resourceTreeModel?.navigationHistory();
    if (!resourceTreeModel || !historyResults) {
      return;
    }
    this.#historyIndex = historyResults.currentIndex;
    this.#screenStatus = "Running";
    this.requestUpdate();
    SDK2.TargetManager.TargetManager.instance().addModelListener(SDK2.ResourceTreeModel.ResourceTreeModel, SDK2.ResourceTreeModel.Events.FrameNavigated, this.#onNavigatedAway, this);
    void resourceTreeModel.navigate("chrome://terms");
  }
  // Builds a subtree of the frame tree, conaining only frames with BFCache issues and their ancestors.
  // Returns the root node, the number of frames in the subtree, and the number of issues in the subtree.
  #buildFrameTreeDataRecursive(explanationTree, nextBlankURLCount) {
    if (!explanationTree) {
      return { node: { text: "" }, frameCount: 0, issueCount: 0 };
    }
    let frameCount = 1;
    let issueCount = 0;
    const children = [];
    let nodeUrlText = "";
    if (explanationTree.url.length) {
      nodeUrlText = explanationTree.url;
    } else {
      nodeUrlText = i18nString2(UIStrings3.blankURLTitle, { PH1: nextBlankURLCount.blankCount });
      nextBlankURLCount.blankCount += 1;
    }
    for (const explanation of explanationTree.explanations) {
      const child = { text: explanation.reason };
      issueCount += 1;
      children.push(child);
    }
    for (const child of explanationTree.children) {
      const frameTreeData = this.#buildFrameTreeDataRecursive(child, nextBlankURLCount);
      if (frameTreeData.issueCount > 0) {
        children.push(frameTreeData.node);
        issueCount += frameTreeData.issueCount;
        frameCount += frameTreeData.frameCount;
      }
    }
    let node = {
      text: `(${issueCount}) ${nodeUrlText}`
    };
    if (children.length) {
      node = { ...node, children };
      node.iconName = "iframe";
    } else if (!explanationTree.url.length) {
      nextBlankURLCount.blankCount -= 1;
    }
    return { node, frameCount, issueCount };
  }
  #buildReasonToFramesMap(explanationTree, nextBlankURLCount, outputMap) {
    let url = explanationTree.url;
    if (url.length === 0) {
      url = i18nString2(UIStrings3.blankURLTitle, { PH1: nextBlankURLCount.blankCount });
      nextBlankURLCount.blankCount += 1;
    }
    explanationTree.explanations.forEach((explanation) => {
      let frames = outputMap.get(explanation.reason);
      if (frames === void 0) {
        frames = [url];
        outputMap.set(explanation.reason, frames);
      } else {
        frames.push(url);
      }
    });
    explanationTree.children.map((child) => {
      this.#buildReasonToFramesMap(child, nextBlankURLCount, outputMap);
    });
  }
};

// gen/front_end/panels/application/components/BounceTrackingMitigationsView.js
var BounceTrackingMitigationsView_exports = {};
__export(BounceTrackingMitigationsView_exports, {
  BounceTrackingMitigationsView: () => BounceTrackingMitigationsView,
  DEFAULT_VIEW: () => DEFAULT_VIEW3,
  i18nString: () => i18nString3
});
import "./../../../ui/components/report_view/report_view.js";
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import "./../../../ui/kit/kit.js";
import * as i18n7 from "./../../../core/i18n/i18n.js";
import * as SDK3 from "./../../../core/sdk/sdk.js";
import * as Buttons2 from "./../../../ui/components/buttons/buttons.js";
import * as UI3 from "./../../../ui/legacy/legacy.js";
import * as Lit2 from "./../../../ui/lit/lit.js";
import * as VisualLogging3 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/bounceTrackingMitigationsView.css.js
var bounceTrackingMitigationsView_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
devtools-data-grid {
  margin-top: 0;
}

.link,
.devtools-link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
}

@media (forced-colors: active) {
  .link,
  .devtools-link {
    color: linktext;
    text-decoration-color: linktext;
  }
}

/*# sourceURL=${import.meta.resolve("./bounceTrackingMitigationsView.css")} */`;

// gen/front_end/panels/application/components/BounceTrackingMitigationsView.js
var { html: html3 } = Lit2;
var UIStrings4 = {
  /**
   * @description Title text in bounce tracking mitigations view of the Application panel.
   */
  bounceTrackingMitigationsTitle: "Bounce tracking mitigations",
  /**
   * @description Label for the button to force bounce tracking mitigations to run.
   */
  forceRun: "Force run",
  /**
   * @description Label for the disabled button while bounce tracking mitigations are running
   */
  runningMitigations: "Running",
  /**
   * @description Heading of table which displays sites whose state was deleted by bounce tracking mitigations.
   */
  stateDeletedFor: "State was deleted for the following sites:",
  /**
   * @description Text shown once the deletion command has been sent to the browser process.
   */
  checkingPotentialTrackers: "Checking for potential bounce tracking sites.",
  /**
   * @description Link text about explanation of Bounce Tracking Mitigations.
   */
  learnMore: "Learn more: Bounce Tracking Mitigations",
  /**
   * @description Text shown when bounce tracking mitigations have been forced to run and
   * identified no potential bounce tracking sites to delete state for. This may also
   * indicate that bounce tracking mitigations are disabled or third-party cookies aren't being blocked.
   */
  noPotentialBounceTrackersIdentified: "State was not cleared for any potential bounce tracking sites. Either none were identified or third-party cookies are not blocked.",
  /**
   * @description Text shown when bounce tracking mitigations are disabled.
   */
  featureDisabled: "Bounce tracking mitigations are disabled."
};
var str_4 = i18n7.i18n.registerUIStrings("panels/application/components/BounceTrackingMitigationsView.ts", UIStrings4);
var i18nString3 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var renderForceRunButton = (input) => {
  const isMitigationRunning = input.screenStatus === "Running";
  return html3`
    <devtools-button
      aria-label=${i18nString3(UIStrings4.forceRun)}
      .disabled=${isMitigationRunning}
      .spinner=${isMitigationRunning}
      .variant=${"primary"}
      @click=${input.runMitigations}
      jslog=${VisualLogging3.action("force-run").track({ click: true })}>
      ${isMitigationRunning ? html3`
        ${i18nString3(UIStrings4.runningMitigations)}` : `
        ${i18nString3(UIStrings4.forceRun)}
      `}
    </devtools-button>
  `;
};
var renderDeletedSitesOrNoSitesMessage = (input) => {
  if (!input.seenButtonClick) {
    return Lit2.nothing;
  }
  if (input.trackingSites.length === 0) {
    return html3`
      <devtools-report-section>
      ${input.screenStatus === "Running" ? html3`
        ${i18nString3(UIStrings4.checkingPotentialTrackers)}` : `
        ${i18nString3(UIStrings4.noPotentialBounceTrackersIdentified)}
      `}
      </devtools-report-section>
    `;
  }
  return html3`
    <devtools-report-section>
      <devtools-data-grid striped inline>
        <table>
          <tr>
            <th id="sites" weight="10" sortable>
              ${i18nString3(UIStrings4.stateDeletedFor)}
            </th>
          </tr>
          ${input.trackingSites.map((site) => html3`
            <tr><td>${site}</td></tr>`)}
        </table>
      </devtools-data-grid>
    </devtools-report-section>
  `;
};
var renderMainFrameInformation2 = (input) => {
  if (input.screenStatus === "Initializing") {
    return Lit2.nothing;
  }
  if (input.screenStatus === "Disabled") {
    return html3`
      <devtools-report-section>
        ${i18nString3(UIStrings4.featureDisabled)}
      </devtools-report-section>
    `;
  }
  return html3`
    <devtools-report-section>
      ${renderForceRunButton(input)}
    </devtools-report-section>
    ${renderDeletedSitesOrNoSitesMessage(input)}
    <devtools-report-divider>
    </devtools-report-divider>
    <devtools-report-section>
      <devtools-link href="https://privacycg.github.io/nav-tracking-mitigations/#bounce-tracking-mitigations" class="link"
      jslogcontext="learn-more">
        ${i18nString3(UIStrings4.learnMore)}
      </devtools-link>
    </devtools-report-section>
  `;
};
var DEFAULT_VIEW3 = (input, _output, target) => {
  Lit2.render(html3`
    <style>${bounceTrackingMitigationsView_css_default}</style>
    <style>${UI3.inspectorCommonStyles}</style>
    <devtools-report .data=${{ reportTitle: i18nString3(UIStrings4.bounceTrackingMitigationsTitle) }}
                      jslog=${VisualLogging3.pane("bounce-tracking-mitigations")}>
      ${renderMainFrameInformation2(input)}
    </devtools-report>
  `, target, { container: { classes: ["overflow-auto"] } });
};
var BounceTrackingMitigationsView = class extends UI3.Widget.Widget {
  #trackingSites = [];
  #screenStatus = "Initializing";
  #seenButtonClick = false;
  #view;
  constructor(element, view = DEFAULT_VIEW3) {
    super(element, { useShadowDom: "pure" });
    this.#view = view;
    const mainTarget = SDK3.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      this.#screenStatus = "Result";
    } else {
      void mainTarget.systemInfo().invoke_getFeatureState({ featureState: "DIPS" }).then((state) => {
        this.#screenStatus = state.featureEnabled ? "Result" : "Disabled";
        this.requestUpdate();
      });
    }
  }
  wasShown() {
    super.wasShown();
    this.requestUpdate();
  }
  performUpdate() {
    this.#view({
      screenStatus: this.#screenStatus,
      trackingSites: this.#trackingSites,
      seenButtonClick: this.#seenButtonClick,
      runMitigations: this.#runMitigations.bind(this)
    }, void 0, this.contentElement);
  }
  async #runMitigations() {
    const mainTarget = SDK3.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }
    this.#seenButtonClick = true;
    this.#screenStatus = "Running";
    this.requestUpdate();
    const response = await mainTarget.storageAgent().invoke_runBounceTrackingMitigations();
    this.#trackingSites = [];
    response.deletedSites.forEach((element) => {
      this.#trackingSites.push(element);
    });
    this.#renderMitigationsResult();
  }
  #renderMitigationsResult() {
    this.#screenStatus = "Result";
    this.requestUpdate();
  }
};

// gen/front_end/panels/application/components/CrashReportContextGrid.js
var CrashReportContextGrid_exports = {};
__export(CrashReportContextGrid_exports, {
  CrashReportContextGrid: () => CrashReportContextGrid,
  DEFAULT_VIEW: () => DEFAULT_VIEW4,
  i18nString: () => i18nString4
});
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import * as Host from "./../../../core/host/host.js";
import * as i18n9 from "./../../../core/i18n/i18n.js";
import * as UI4 from "./../../../ui/legacy/legacy.js";
import { html as html4, render as render4 } from "./../../../ui/lit/lit.js";
var UIStrings5 = {
  /**
   * @description Text in Crash Report Context Items View of the Application panel
   */
  key: "Key",
  /**
   * @description Text in Crash Report Context Items View of the Application panel
   */
  value: "Value",
  /**
   * @description Context menu item to copy the key of a context entry
   */
  copyKey: "Copy key",
  /**
   * @description Context menu item to copy the value of a context entry
   */
  copyValue: "Copy value"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/application/components/CrashReportContextGrid.ts", UIStrings5);
var i18nString4 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var DEFAULT_VIEW4 = (input, output, target) => {
  render4(html4`
      <style>
        :host {
          display: block;
        }

        div {
          overflow: auto;
        }

        td {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>
      <style>${UI4.inspectorCommonStyles}</style>
      <div>
        <devtools-data-grid striped inline>
          <table>
            <thead>
              <tr>
                <th id="key" weight="50">${i18nString4(UIStrings5.key)}</th>
                <th id="value" weight="50">${i18nString4(UIStrings5.value)}</th>
              </tr>
            </thead>
            <tbody>
              ${input.entries.map((entry) => html4`
                <tr class=${input.selectedKey === entry.key ? "selected" : ""}
                    @select=${() => input.onSelect(entry.key)}
                    @contextmenu=${(e) => input.onContextMenu(e, entry.key, entry.value)}>
                  <td title=${entry.key}>${entry.key}</td>
                  <td title=${entry.value}>${entry.value}</td>
                </tr>
              `)}
            </tbody>
          </table>
        </devtools-data-grid>
      </div>
    `, target);
};
var CrashReportContextGrid = class extends UI4.Widget.Widget {
  #entries = [];
  #filteredEntries = [];
  #selectedKey;
  #filters = [];
  #view;
  constructor(element, view = DEFAULT_VIEW4) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  set data(data) {
    this.#entries = data.entries;
    this.#selectedKey = data.selectedKey;
    this.#filters = data.filters || [];
    this.requestUpdate();
  }
  #computeFilteredEntries() {
    if (this.#filters.length === 0) {
      this.#filteredEntries = this.#entries;
      return;
    }
    this.#filteredEntries = this.#entries.filter((entry) => {
      return this.#filters.every((filter) => {
        const regex = filter.regex;
        if (!regex) {
          return true;
        }
        const matches = regex.test(entry.key) || regex.test(entry.value);
        return filter.negative ? !matches : matches;
      });
    });
  }
  #onContextMenu(e, key, value) {
    const customEvent = e;
    const contextMenu = customEvent.detail;
    contextMenu.defaultSection().appendItem(i18nString4(UIStrings5.copyKey), () => {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(key);
    }, { jslogContext: "copy-key" });
    contextMenu.defaultSection().appendItem(i18nString4(UIStrings5.copyValue), () => {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(value);
    }, { jslogContext: "copy-value" });
  }
  performUpdate() {
    this.#computeFilteredEntries();
    this.#view({
      entries: this.#filteredEntries,
      selectedKey: this.#selectedKey,
      onSelect: (key) => this.element.dispatchEvent(new CustomEvent("select", { detail: key })),
      onContextMenu: (e, key, value) => this.#onContextMenu(e, key, value)
    }, void 0, this.contentElement);
  }
};

// gen/front_end/panels/application/components/EndpointsGrid.js
var EndpointsGrid_exports = {};
__export(EndpointsGrid_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW5,
  EndpointsGrid: () => EndpointsGrid,
  i18nString: () => i18nString5
});
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n11 from "./../../../core/i18n/i18n.js";
import * as UI5 from "./../../../ui/legacy/legacy.js";
import * as Lit3 from "./../../../ui/lit/lit.js";
import * as VisualLogging4 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/endpointsGrid.css.js
var endpointsGrid_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  :scope {
    overflow: auto;
    height: 100%;
  }

  .endpoints-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .endpoints-header {
    font-size: 15px;
    background-color: var(--sys-color-surface2);
    padding: 1px 4px;
    flex-shrink: 0;
  }

  devtools-data-grid {
    flex: auto;
  }
}

/*# sourceURL=${import.meta.resolve("./endpointsGrid.css")} */`;

// gen/front_end/panels/application/components/EndpointsGrid.js
var UIStrings6 = {
  /**
   * @description Placeholder text when there are no Reporting API endpoints.
   *(https://developers.google.com/web/updates/2018/09/reportingapi#tldr)
   */
  noEndpointsToDisplay: "No endpoints to display",
  /**
   * @description Placeholder text when there are no Reporting API endpoints.
   *(https://developers.google.com/web/updates/2018/09/reportingapi#tldr)
   */
  endpointsDescription: "Here you will find the list of endpoints that receive the reports"
};
var str_6 = i18n11.i18n.registerUIStrings("panels/application/components/EndpointsGrid.ts", UIStrings6);
var i18nString5 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var { render: render5, html: html5 } = Lit3;
var DEFAULT_VIEW5 = (input, output, target) => {
  render5(html5`
    <style>${endpointsGrid_css_default}</style>
    <style>${UI5.inspectorCommonStyles}</style>
    <div class="endpoints-container" jslog=${VisualLogging4.section("endpoints")}>
      <div class="endpoints-header">${i18n11.i18n.lockedString("Endpoints")}</div>
      ${input.endpoints.size > 0 ? html5`
        <devtools-data-grid striped>
         <table>
          <tr>
            <th id="origin" weight="30">${i18n11.i18n.lockedString("Origin")}</th>
            <th id="name" weight="20">${i18n11.i18n.lockedString("Name")}</th>
            <th id="url" weight="30">${i18n11.i18n.lockedString("URL")}</th>
          </tr>
          ${Array.from(input.endpoints).map(([origin, endpointArray]) => endpointArray.map((endpoint) => html5`<tr>
                <td>${origin}</td>
                <td>${endpoint.groupName}</td>
                <td>${endpoint.url}</td>
              </tr>`)).flat()}
          </table>
        </devtools-data-grid>
      ` : html5`
        <div class="empty-state">
          <span class="empty-state-header">${i18nString5(UIStrings6.noEndpointsToDisplay)}</span>
          <span class="empty-state-description">${i18nString5(UIStrings6.endpointsDescription)}</span>
        </div>
      `}
    </div>
  `, target);
};
var EndpointsGrid = class extends UI5.Widget.Widget {
  endpoints = /* @__PURE__ */ new Map();
  #view;
  constructor(element, view = DEFAULT_VIEW5) {
    super(element);
    this.#view = view;
    this.requestUpdate();
  }
  performUpdate() {
    this.#view({
      endpoints: this.endpoints
    }, void 0, this.contentElement);
  }
};

// gen/front_end/panels/application/components/PermissionsPolicySection.js
var PermissionsPolicySection_exports = {};
__export(PermissionsPolicySection_exports, {
  PermissionsPolicySection: () => PermissionsPolicySection,
  renderIconLink: () => renderIconLink
});
import "./../../../ui/kit/kit.js";
import "./../../../ui/components/report_view/report_view.js";
import * as Common3 from "./../../../core/common/common.js";
import * as i18n13 from "./../../../core/i18n/i18n.js";
import * as SDK4 from "./../../../core/sdk/sdk.js";
import * as NetworkForward from "./../../network/forward/forward.js";
import * as Buttons3 from "./../../../ui/components/buttons/buttons.js";
import * as UI6 from "./../../../ui/legacy/legacy.js";
import { html as html6, nothing as nothing4, render as render6 } from "./../../../ui/lit/lit.js";
import * as VisualLogging5 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/permissionsPolicySection.css.js
var permissionsPolicySection_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  :scope {
    display: contents;
  }

  .text-ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .link,
  .devtools-link {
    color: var(--sys-color-primary);
    text-decoration: underline;
    cursor: pointer;
    outline-offset: 2px;
  }

  button.link {
    border: none;
    background: none;
    font-family: inherit;
    font-size: inherit;
  }

  .policies-list {
    padding-top: 3px;
  }

  .permissions-row {
    display: flex;
    line-height: 22px;
  }

  .permissions-row div {
    padding-right: 5px;
  }

  .feature-name {
    width: 135px;
  }

  .allowed-icon {
    vertical-align: sub;
  }

  .block-reason {
    width: 215px;
  }

  .disabled-features-button {
    padding-left: var(--sys-size-3);
  }
}

/*# sourceURL=${import.meta.resolve("./permissionsPolicySection.css")} */`;

// gen/front_end/panels/application/components/PermissionsPolicySection.js
var UIStrings7 = {
  /**
   * @description Label for a button. When clicked more details (for the content this button refers to) will be shown.
   */
  showDetails: "Show details",
  /**
   * @description Label for a button. When clicked some details (for the content this button refers to) will be hidden.
   */
  hideDetails: "Hide details",
  /**
   * @description Label for a list of features which are allowed according to the current Permissions policy
   *(a mechanism that allows developers to enable/disable browser features and APIs (e.g. camera, geolocation, autoplay))
   */
  allowedFeatures: "Allowed Features",
  /**
   * @description Label for a list of features which are disabled according to the current Permissions policy
   *(a mechanism that allows developers to enable/disable browser features and APIs (e.g. camera, geolocation, autoplay))
   */
  disabledFeatures: "Disabled Features",
  /**
   * @description Tooltip text for a link to a specific request's headers in the Network panel.
   */
  clickToShowHeader: 'Click to reveal the request whose "`Permissions-Policy`" HTTP header disables this feature.',
  /**
   * @description Tooltip text for a link to a specific iframe in the Elements panel (Iframes can be nested, the link goes
   *  to the outer-most iframe which blocks a certain feature).
   */
  clickToShowIframe: "Click to reveal the top-most iframe which does not allow this feature in the elements panel.",
  /**
   * @description Text describing that a specific feature is blocked by not being included in the iframe's "allow" attribute.
   */
  disabledByIframe: 'missing in iframe "`allow`" attribute',
  /**
   * @description Text describing that a specific feature is blocked by a Permissions Policy specified in a request header.
   */
  disabledByHeader: 'disabled by "`Permissions-Policy`" header',
  /**
   * @description Text describing that a specific feature is blocked by virtue of being inside a fenced frame tree.
   */
  disabledByFencedFrame: "disabled inside a `fencedframe`"
};
var str_7 = i18n13.i18n.registerUIStrings("panels/application/components/PermissionsPolicySection.ts", UIStrings7);
var i18nString6 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
function renderIconLink(iconName, title, clickHandler, jsLogContext) {
  return html6`
    <devtools-button
      .iconName=${iconName}
      title=${title}
      aria-label=${title}
      .variant=${"icon"}
      .size=${"SMALL"}
      @click=${clickHandler}
      jslog=${VisualLogging5.action().track({ click: true }).context(jsLogContext)}>
    </devtools-button>`;
}
function renderAllowed(allowed) {
  if (!allowed.length) {
    return nothing4;
  }
  return html6`
    <devtools-report-key>${i18nString6(UIStrings7.allowedFeatures)}</devtools-report-key>
    <devtools-report-value>${allowed.map(({ feature }) => feature).join(", ")}</devtools-report-value>`;
}
function renderDisallowed(data, showDetails, onToggleShowDetails, onRevealDOMNode, onRevealHeader) {
  if (!data.length) {
    return nothing4;
  }
  if (!showDetails) {
    return html6`
      <devtools-report-key>${i18nString6(UIStrings7.disabledFeatures)}</devtools-report-key>
      <devtools-report-value>
        ${data.map(({ policy }) => policy.feature).join(", ")}
        <devtools-button
            class="disabled-features-button"
            .variant=${"outlined"}
            @click=${onToggleShowDetails}
            jslog=${VisualLogging5.action("show-disabled-features-details").track({ click: true })}>
          ${i18nString6(UIStrings7.showDetails)}
        </devtools-button>
      </devtools-report-value>`;
  }
  const featureRows = data.map(({ policy, blockReason, linkTargetDOMNode, linkTargetRequest }) => {
    const blockReasonText = (() => {
      switch (blockReason) {
        case "IframeAttribute":
          return i18nString6(UIStrings7.disabledByIframe);
        case "Header":
          return i18nString6(UIStrings7.disabledByHeader);
        case "InFencedFrameTree":
          return i18nString6(UIStrings7.disabledByFencedFrame);
        default:
          return "";
      }
    })();
    return html6`
      <div class="permissions-row">
        <div>
          <devtools-icon class="allowed-icon extra-large" name="cross-circle">
          </devtools-icon>
        </div>
        <div class="feature-name text-ellipsis">${policy.feature}</div>
        <div class="block-reason">${blockReasonText}</div>
        <div>
          ${linkTargetDOMNode ? renderIconLink("code-circle", i18nString6(UIStrings7.clickToShowIframe), () => onRevealDOMNode(linkTargetDOMNode), "reveal-in-elements") : nothing4}
          ${linkTargetRequest ? renderIconLink("arrow-up-down-circle", i18nString6(UIStrings7.clickToShowHeader), () => onRevealHeader(linkTargetRequest), "reveal-in-network") : nothing4}
        </div>
      </div>`;
  });
  return html6`
    <devtools-report-key>${i18nString6(UIStrings7.disabledFeatures)}</devtools-report-key>
    <devtools-report-value class="policies-list">
      ${featureRows}
      <div class="permissions-row">
        <devtools-button
            .variant=${"outlined"}
            @click=${onToggleShowDetails}
            jslog=${VisualLogging5.action("hide-disabled-features-details").track({ click: true })}>
          ${i18nString6(UIStrings7.hideDetails)}
        </devtools-button>
      </div>
    </devtools-report-value>`;
}
var DEFAULT_VIEW6 = (input, output, target) => {
  render6(html6`
    <style>${permissionsPolicySection_css_default}</style>
    <devtools-report-section-header>
      ${i18n13.i18n.lockedString("Permissions Policy")}
    </devtools-report-section-header>
    ${renderAllowed(input.allowed)}
    ${input.allowed.length > 0 && input.disallowed.length > 0 ? html6`<devtools-report-divider class="subsection-divider"></devtools-report-divider>` : nothing4}
    ${renderDisallowed(input.disallowed, input.showDetails, input.onToggleShowDetails, input.onRevealDOMNode, input.onRevealHeader)}
    <devtools-report-divider></devtools-report-divider>`, target);
};
var PermissionsPolicySection = class extends UI6.Widget.Widget {
  #policies = [];
  #showDetails = false;
  #view;
  constructor(element, view = DEFAULT_VIEW6) {
    super(element, { useShadowDom: false });
    this.#view = view;
  }
  set policies(policies) {
    this.#policies = policies;
    this.requestUpdate();
  }
  get policies() {
    return this.#policies;
  }
  set showDetails(showDetails) {
    this.#showDetails = showDetails;
    this.requestUpdate();
  }
  get showDetails() {
    return this.#showDetails;
  }
  #toggleShowPermissionsDisallowedDetails() {
    this.showDetails = !this.showDetails;
  }
  async #revealDOMNode(linkTargetDOMNode) {
    await Common3.Revealer.reveal(linkTargetDOMNode);
  }
  async #revealHeader(linkTargetRequest) {
    if (!linkTargetRequest) {
      return;
    }
    const headerName = linkTargetRequest.responseHeaderValue("permissions-policy") ? "permissions-policy" : "feature-policy";
    const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.responseHeaderMatch(linkTargetRequest, { name: headerName, value: "" });
    await Common3.Revealer.reveal(requestLocation);
  }
  async performUpdate() {
    const frameManager = SDK4.FrameManager.FrameManager.instance();
    const policies = this.#policies.sort((a, b) => a.feature.localeCompare(b.feature));
    const allowed = policies.filter((p) => p.allowed).sort((a, b) => a.feature.localeCompare(b.feature));
    const disallowed = policies.filter((p) => !p.allowed).sort((a, b) => a.feature.localeCompare(b.feature));
    const disallowedData = this.#showDetails ? await Promise.all(disallowed.map(async (policy) => {
      const frame = policy.locator ? frameManager.getFrame(policy.locator.frameId) : void 0;
      const blockReason = policy.locator?.blockReason;
      const linkTargetDOMNode = await (blockReason === "IframeAttribute" && frame?.getOwnerDOMNodeOrDocument() || void 0);
      const resource = frame?.resourceForURL(frame.url);
      const linkTargetRequest = blockReason === "Header" && resource?.request || void 0;
      return { policy, blockReason, linkTargetDOMNode, linkTargetRequest };
    })) : disallowed.map((policy) => ({ policy }));
    this.#view({
      allowed,
      disallowed: disallowedData,
      showDetails: this.#showDetails,
      onToggleShowDetails: this.#toggleShowPermissionsDisallowedDetails.bind(this),
      onRevealDOMNode: this.#revealDOMNode.bind(this),
      onRevealHeader: this.#revealHeader.bind(this)
    }, void 0, this.contentElement);
  }
};

// gen/front_end/panels/application/components/ProtocolHandlersView.js
var ProtocolHandlersView_exports = {};
__export(ProtocolHandlersView_exports, {
  ProtocolHandlersView: () => ProtocolHandlersView
});
import "./../../../ui/kit/kit.js";
import * as Host2 from "./../../../core/host/host.js";
import * as i18n15 from "./../../../core/i18n/i18n.js";
import * as Platform from "./../../../core/platform/platform.js";
import * as Buttons4 from "./../../../ui/components/buttons/buttons.js";
import * as Input from "./../../../ui/components/input/input.js";
import * as uiI18n from "./../../../ui/i18n/i18n.js";
import * as UI7 from "./../../../ui/legacy/legacy.js";
import { html as html7, i18nTemplate as unboundI18nTemplate, nothing as nothing5, render as render7 } from "./../../../ui/lit/lit.js";
import * as VisualLogging6 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/protocolHandlersView.css.js
var protocolHandlersView_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: flex;
  flex-direction: column;
}

.devtools-link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
}

.devtools-link:focus-visible {
  outline-width: unset;
}

input.devtools-text-input[type="text"] {
  padding: 3px 6px;
  margin-left: 4px;
  margin-right: 4px;
  width: 250px;
  height: 25px;
}

input.devtools-text-input[type="text"]::placeholder {
  color: var(--sys-color-token-subtle);
}

.protocol-handlers-row {
  margin: var(--sys-size-3) 0;
}

.inline-icon {
  width: 16px;
  height: 16px;

  &[name="check-circle"] {
    color: var(--icon-checkmark-green);
  }
}

@media (forced-colors: active) {
  .devtools-link:not(.devtools-link-prevent-click) {
    color: linktext;
  }

  .devtools-link:focus-visible {
    background: Highlight;
    color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./protocolHandlersView.css")} */`;

// gen/front_end/panels/application/components/ProtocolHandlersView.js
var PROTOCOL_DOCUMENT_URL = "https://web.dev/url-protocol-handler/";
var UIStrings8 = {
  /**
   * @description Status message for when protocol handlers are detected in the manifest
   * @example {protocolhandler/manifest.json} PH1
   */
  protocolDetected: "Found valid protocol handler registration in the {PH1}. With the app installed, test the registered protocols.",
  /**
   * @description Status message for when protocol handlers are not detected in the manifest
   * @example {protocolhandler/manifest.json} PH1
   */
  protocolNotDetected: "Define protocol handlers in the {PH1} to register your app as a handler for custom protocols when your app is installed.",
  /**
   * @description Text wrapping a link pointing to more information on handling protocol handlers
   * @example {https://example.com/} PH1
   */
  needHelpReadOur: "Need help? Read {PH1}.",
  /**
   * @description Link text for more information on URL protocol handler registrations for PWAs
   */
  protocolHandlerRegistrations: "URL protocol handler registration for PWAs",
  /**
   * @description In text hyperlink to the PWA manifest
   */
  manifest: "manifest",
  /**
   * @description Text for test protocol button
   */
  testProtocol: "Test protocol",
  /**
   * @description Aria text for screen reader to announce they can select a protocol handler in the dropdown
   */
  dropdownLabel: "Select protocol handler",
  /**
   * @description Aria text for screen reader to announce they can enter query parameters or endpoints into the textbox
   */
  textboxLabel: "Query parameter or endpoint for protocol handler",
  /**
   * @description Placeholder for textbox input field, rest of the URL of protocol to test.
   */
  textboxPlaceholder: "Enter URL"
};
var str_8 = i18n15.i18n.registerUIStrings("panels/application/components/ProtocolHandlersView.ts", UIStrings8);
var i18nString7 = i18n15.i18n.getLocalizedString.bind(void 0, str_8);
var i18nTemplate = unboundI18nTemplate.bind(void 0, str_8);
function renderStatusMessage(protocolHandlers, manifestLink) {
  const statusString = protocolHandlers.length > 0 ? UIStrings8.protocolDetected : UIStrings8.protocolNotDetected;
  return html7`
    <div class="protocol-handlers-row status">
      <devtools-icon class="inline-icon"
                     name=${protocolHandlers.length > 0 ? "check-circle" : "info"}>
      </devtools-icon>
      ${uiI18n.getFormatLocalizedStringTemplate(str_8, statusString, { PH1: html7`
        <devtools-link href=${manifestLink} jslogcontext="manifest">${i18nString7(UIStrings8.manifest)}</devtools-link>
        ` })}
    </div>`;
}
function renderProtocolTest(protocolHandlers, queryInputState, protocolSelectHandler, queryInputChangeHandler, testProtocolClickHandler) {
  if (protocolHandlers.length === 0) {
    return nothing5;
  }
  return html7`
    <div class="protocol-handlers-row">
      <select class="protocol-select" @change=${protocolSelectHandler}
              aria-label=${i18nString7(UIStrings8.dropdownLabel)}>
        ${protocolHandlers.filter((p) => p.protocol).map(({ protocol }) => html7`
          <option value=${protocol} jslog=${VisualLogging6.item(protocol).track({ click: true })}>
            ${protocol}://
          </option>`)}
      </select>
      <input .value=${queryInputState} class="devtools-text-input" type="text"
             @change=${queryInputChangeHandler} aria-label=${i18nString7(UIStrings8.textboxLabel)}
             placeholder=${i18nString7(UIStrings8.textboxPlaceholder)} />
      <devtools-button .variant=${"primary"} @click=${testProtocolClickHandler}>
        ${i18nString7(UIStrings8.testProtocol)}
      </devtools-button>
    </div>`;
}
var DEFAULT_VIEW7 = (input, _output, target) => {
  render7(html7`
    <style>${protocolHandlersView_css_default}</style>
    <style>${UI7.inspectorCommonStyles}</style>
    <style>${Input.textInputStyles}</style>
    ${renderStatusMessage(input.protocolHandler, input.manifestLink)}
    <div class="protocol-handlers-row">
      ${i18nTemplate(UIStrings8.needHelpReadOur, { PH1: html7`
        <devtools-link href=${PROTOCOL_DOCUMENT_URL} class="devtools-link" autofocus jslogcontext="learn-more">
          ${i18nString7(UIStrings8.protocolHandlerRegistrations)}
        </devtools-link>` })}
    </div>
    ${renderProtocolTest(input.protocolHandler, input.queryInputState, input.protocolSelectHandler, input.queryInputChangeHandler, input.testProtocolClickHandler)}
  `, target, { container: { classes: ["vbox"] } });
};
var ProtocolHandlersView = class extends UI7.Widget.Widget {
  #protocolHandlers = [];
  #manifestLink = Platform.DevToolsPath.EmptyUrlString;
  #selectedProtocolState = "";
  #queryInputState = "";
  #view;
  constructor(element, view = DEFAULT_VIEW7) {
    super(element, { useShadowDom: false });
    this.#view = view;
  }
  set protocolHandlers(protocolHandlers) {
    this.#protocolHandlers = protocolHandlers;
    this.requestUpdate();
  }
  get protocolHandlers() {
    return this.#protocolHandlers;
  }
  set manifestLink(manifestLink) {
    const isNewManifest = this.#manifestLink !== manifestLink;
    this.#manifestLink = manifestLink;
    if (isNewManifest) {
      this.#queryInputState = "";
      this.#selectedProtocolState = this.#protocolHandlers[0]?.protocol ?? "";
    }
    this.requestUpdate();
  }
  get manifestLink() {
    return this.#manifestLink;
  }
  #handleProtocolSelect = (evt) => {
    this.#selectedProtocolState = evt.target.value;
  };
  #handleQueryInputChange = (evt) => {
    this.#queryInputState = evt.target.value;
    this.requestUpdate();
  };
  #handleTestProtocolClick = () => {
    const protocolURL = `${this.#selectedProtocolState}://${this.#queryInputState}`;
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(protocolURL);
    Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.CaptureTestProtocolClicked);
  };
  performUpdate() {
    this.#view({
      protocolHandler: this.#protocolHandlers,
      manifestLink: this.#manifestLink,
      queryInputState: this.#queryInputState,
      protocolSelectHandler: this.#handleProtocolSelect,
      queryInputChangeHandler: this.#handleQueryInputChange,
      testProtocolClickHandler: this.#handleTestProtocolClick
    }, void 0, this.contentElement);
  }
};

// gen/front_end/panels/application/components/ReportsGrid.js
var ReportsGrid_exports = {};
__export(ReportsGrid_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW8,
  ReportsGrid: () => ReportsGrid,
  i18nString: () => i18nString8
});
import "./../../../ui/kit/kit.js";
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n17 from "./../../../core/i18n/i18n.js";
import * as Root from "./../../../core/root/root.js";
import * as UI8 from "./../../../ui/legacy/legacy.js";
import * as Lit4 from "./../../../ui/lit/lit.js";
import * as VisualLogging7 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/reportsGrid.css.js
var reportsGrid_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  :scope {
    overflow: auto;
    height: 100%;
  }

  .reporting-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .reporting-header {
    font-size: 15px;
    background-color: var(--sys-color-surface2);
    padding: 1px 4px;
    flex-shrink: 0;
  }

  devtools-data-grid {
    flex: auto;
  }

  .inline-icon {
    vertical-align: text-bottom;
  }
}

/*# sourceURL=${import.meta.resolve("./reportsGrid.css")} */`;

// gen/front_end/panels/application/components/ReportsGrid.js
var UIStrings9 = {
  /**
   * @description Placeholder text when there are no Reporting API reports.
   *(https://developers.google.com/web/updates/2018/09/reportingapi#sending)
   */
  noReportsToDisplay: "No reports to display",
  /**
   * @description Placeholder text that explains Reporting API reports.
   *(https://developers.google.com/web/updates/2018/09/reportingapi#sending)
   */
  reportingApiDescription: "Here you will find reporting api reports that are generated by the page.",
  /**
   * @description Link text to forward to a documentation page on reporting API.
   */
  learnMore: "Learn more",
  /**
   * @description Column header for a table displaying Reporting API reports.
   *Status is one of 'Queued', 'Pending', 'MarkedForRemoval' or 'Success'.
   */
  status: "Status",
  /**
   * @description Column header for a table displaying Reporting API reports.
   *Destination is the name of the endpoint the report is being sent to.
   */
  destination: "Destination",
  /**
   * @description Column header for a table displaying Reporting API reports.
   *The column contains the timestamp of when a report was generated.
   */
  generatedAt: "Generated at"
};
var str_9 = i18n17.i18n.registerUIStrings("panels/application/components/ReportsGrid.ts", UIStrings9);
var i18nString8 = i18n17.i18n.getLocalizedString.bind(void 0, str_9);
var { render: render8, html: html8 } = Lit4;
var REPORTING_API_EXPLANATION_URL = "https://developer.chrome.com/docs/capabilities/web-apis/reporting-api";
var DEFAULT_VIEW8 = (input, output, target) => {
  render8(html8`
    <style>${reportsGrid_css_default}</style>
    <style>${UI8.inspectorCommonStyles}</style>
    <div class="reporting-container" jslog=${VisualLogging7.section("reports")}>
      <div class="reporting-header">${i18n17.i18n.lockedString("Reports")}</div>
      ${input.reports.length > 0 ? html8`
        <devtools-data-grid striped>
          <table>
            <tr>
              ${input.protocolMonitorExperimentEnabled ? html8`
                <th id="id" weight="30">${i18n17.i18n.lockedString("ID")}</th>
              ` : ""}
              <th id="url" weight="30">${i18n17.i18n.lockedString("URL")}</th>
              <th id="type" weight="20">${i18n17.i18n.lockedString("Type")}</th>
              <th id="status" weight="20">
                <style>${reportsGrid_css_default}</style>
                <span class="status-header">${i18nString8(UIStrings9.status)}</span>
                <devtools-link href="https://web.dev/reporting-api/#report-status"
                jslogcontext="report-status">
                  <devtools-icon class="inline-icon medium" name="help" style="color: var(--icon-link);"
                  ></devtools-icon>
                </devtools-link>
              </th>
              <th id="destination" weight="20">${i18nString8(UIStrings9.destination)}</th>
              <th id="timestamp" weight="20">${i18nString8(UIStrings9.generatedAt)}</th>
              <th id="body" weight="20">${i18n17.i18n.lockedString("Body")}</th>
            </tr>
            ${input.reports.map((report) => html8`
              <tr @select=${() => input.onSelect(report.id)}>
                ${input.protocolMonitorExperimentEnabled ? html8`<td>${report.id}</td>` : ""}
                <td>${report.initiatorUrl}</td>
                <td>${report.type}</td>
                <td>${report.status}</td>
                <td>${report.destination}</td>
                <td>${new Date(report.timestamp * 1e3).toLocaleString()}</td>
                <td>${JSON.stringify(report.body)}</td>
              </tr>
            `)}
          </table>
        </devtools-data-grid>
      ` : html8`
        <div class="empty-state">
          <span class="empty-state-header">${i18nString8(UIStrings9.noReportsToDisplay)}</span>
          <div class="empty-state-description">
            <span>${i18nString8(UIStrings9.reportingApiDescription)}</span>
            <devtools-link
              class="devtools-link"
              href=${REPORTING_API_EXPLANATION_URL}
              jslogcontext="learn-more"
            >${i18nString8(UIStrings9.learnMore)}</devtools-link>
          </div>
        </div>
      `}
    </div>
  `, target);
};
var ReportsGrid = class extends UI8.Widget.Widget {
  reports = [];
  #protocolMonitorExperimentEnabled = false;
  #view;
  onReportSelected = () => {
  };
  constructor(element, view = DEFAULT_VIEW8) {
    super(element);
    this.#view = view;
    this.#protocolMonitorExperimentEnabled = Root.Runtime.experiments.isEnabled(Root.ExperimentNames.ExperimentName.PROTOCOL_MONITOR);
    this.requestUpdate();
  }
  performUpdate() {
    const viewInput = {
      reports: this.reports,
      protocolMonitorExperimentEnabled: this.#protocolMonitorExperimentEnabled,
      onSelect: this.onReportSelected
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
};

// gen/front_end/panels/application/components/ServiceWorkerRouterView.js
var ServiceWorkerRouterView_exports = {};
__export(ServiceWorkerRouterView_exports, {
  ServiceWorkerRouterView: () => ServiceWorkerRouterView
});
import * as UI9 from "./../../../ui/legacy/legacy.js";
import { html as html9, render as render9 } from "./../../../ui/lit/lit.js";

// gen/front_end/panels/application/components/serviceWorkerRouterView.css.js
var serviceWorkerRouterView_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
:host {
  display: block;
  white-space: normal;
  max-width: 400px;
}

.router-rules {
  border: 1px solid var(--sys-color-divider);
  border-spacing: 0;
  padding-left: 10px;
  padding-right: 10px;
  line-height: initial;
  margin-top: 0;
  padding-bottom: 12px;
  text-wrap: balance;
}

.router-rule {
  display: flex;
  margin-top: 12px;
  flex-direction: column;
}

.rule-id {
  color: var(--sys-color-token-subtle);
}

.item {
  display: flex;
  flex-direction: column;
  padding-left: 10px;
}

.condition,
.source {
  list-style: none;
  display: flex;
  margin-top: 4px;
  flex-direction: row;
}

.condition > *,
.source > * {
  word-break: break-all;
  line-height: 1.5em;
}

.rule-type {
  flex: 0 0 18%;
}

/*# sourceURL=${import.meta.resolve("./serviceWorkerRouterView.css")} */`;

// gen/front_end/panels/application/components/ServiceWorkerRouterView.js
function renderRouterRule(rule) {
  return html9`
    <li class="router-rule">
      <div class="rule-id">Rule ${rule.id}</div>
      <ul class="item">
        <li class="condition">
          <div class="rule-type">Condition</div>
          <div class="rule-value">${rule.condition}</div>
        </li>
        <li class="source">
          <div class="rule-type">Source</div>
          <div class="rule-value">${rule.source}</div>
        </li>
      </ul>
    </li>`;
}
var DEFAULT_VIEW9 = (input, _output, target) => {
  render9(html9`
    <style>${serviceWorkerRouterView_css_default}</style>
    <ul class="router-rules">
      ${input.rules.map(renderRouterRule)}
    </ul>`, target);
};
var ServiceWorkerRouterView = class extends UI9.Widget.Widget {
  #rules = [];
  #view;
  constructor(element, view = DEFAULT_VIEW9) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  set rules(rules) {
    this.#rules = rules;
    if (this.#rules.length > 0) {
      this.requestUpdate();
    }
  }
  get rules() {
    return this.#rules;
  }
  performUpdate() {
    this.#view({ rules: this.#rules }, void 0, this.contentElement);
  }
};

// gen/front_end/panels/application/components/StorageMetadataView.js
var StorageMetadataView_exports = {};
__export(StorageMetadataView_exports, {
  StorageBucketRevealInfo: () => StorageBucketRevealInfo,
  StorageMetadataView: () => StorageMetadataView
});
import "./../../../ui/components/report_view/report_view.js";
import "./../../../ui/kit/kit.js";
import * as Common4 from "./../../../core/common/common.js";
import * as i18n19 from "./../../../core/i18n/i18n.js";
import * as SDK5 from "./../../../core/sdk/sdk.js";
import * as Buttons5 from "./../../../ui/components/buttons/buttons.js";
import * as LegacyWrapper from "./../../../ui/components/legacy_wrapper/legacy_wrapper.js";
import * as RenderCoordinator from "./../../../ui/components/render_coordinator/render_coordinator.js";
import * as UI10 from "./../../../ui/legacy/legacy.js";
import { html as html10, nothing as nothing6, render as render10 } from "./../../../ui/lit/lit.js";
import * as VisualLogging8 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/storageMetadataView.css.js
var storageMetadataView_css_default = `/*
 * Copyright 2025 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.default-bucket {
  font-style: italic;
}

/*# sourceURL=${import.meta.resolve("./storageMetadataView.css")} */`;

// gen/front_end/panels/application/components/StorageMetadataView.js
var UIStrings10 = {
  /**
   * @description The origin of a URL (https://web.dev/same-site-same-origin/#origin).
   *(for a lot of languages this does not need to be translated, please translate only where necessary)
   */
  origin: "Frame origin",
  /**
   * @description Site (https://web.dev/same-site-same-origin/#site) for the URL the user sees in the omnibox.
   */
  topLevelSite: "Top-level site",
  /**
   * @description Text to show in the top-level site row, in case the value is opaque (https://html.spec.whatwg.org/#concept-origin-opaque).
   */
  opaque: "(opaque)",
  /**
   * @description Whether the storage corresponds to an opaque key (similar to https://html.spec.whatwg.org/#concept-origin-opaque).
   */
  isOpaque: "Is opaque",
  /**
   * @description Whether the storage corresponds to a third-party origin (https://web.dev/learn/privacy/third-parties/).
   */
  isThirdParty: "Is third-party",
  /**
   * @description Text indicating that the condition holds.
   */
  yes: "Yes",
  /**
   * @description Text indicating that the condition does not hold.
   */
  no: "No",
  /**
   * @description Text indicating that the storage corresponds to a third-party origin because top-level site is opaque.
   */
  yesBecauseTopLevelIsOpaque: "Yes, because the top-level site is opaque",
  /**
   * @description Text indicating that the storage corresponds to a third-party origin because the storage key is opaque.
   */
  yesBecauseKeyIsOpaque: "Yes, because the storage key is opaque",
  /**
   * @description Text indicating that the storage corresponds to a third-party origin because the origin doesn't match the top-level site.
   */
  yesBecauseOriginNotInTopLevelSite: "Yes, because the origin is outside of the top-level site",
  /**
   * @description Text indicating that the storage corresponds to a third-party origin because the was a third-party origin in the ancestry chain.
   */
  yesBecauseAncestorChainHasCrossSite: "Yes, because the ancestry chain contains a third-party origin",
  /**
   * @description Text when something is loading.
   */
  loading: "Loading\u2026",
  /**
   * @description The storage bucket name (https://wicg.github.io/storage-buckets/explainer#bucket-names)
   */
  bucketName: "Bucket name",
  /**
   * @description The name of the default bucket (https://wicg.github.io/storage-buckets/explainer#the-default-bucket)
   *(This should not be a valid bucket name (https://wicg.github.io/storage-buckets/explainer#bucket-names))
   */
  defaultBucket: "Default bucket",
  /**
   * @description Text indicating that the storage is persistent (https://wicg.github.io/storage-buckets/explainer#storage-policy-persistence)
   */
  persistent: "Is persistent",
  /**
   * @description The storage durability policy (https://wicg.github.io/storage-buckets/explainer#storage-policy-durability)
   */
  durability: "Durability",
  /**
   * @description The storage quota (https://wicg.github.io/storage-buckets/explainer#storage-policy-quota)
   */
  quota: "Quota",
  /**
   * @description The storage expiration (https://wicg.github.io/storage-buckets/explainer#storage-policy-expiration)
   */
  expiration: "Expiration",
  /**
   * @description Text indicating that no value is set
   */
  none: "None",
  /**
   * @description Label of the button that triggers the Storage Bucket to be deleted.
   */
  deleteBucket: "Delete bucket",
  /**
   * @description Text shown in the confirmation dialogue that displays before deleting the bucket.
   * @example {bucket} PH1
   */
  confirmBucketDeletion: 'Delete the "{PH1}" bucket?',
  /**
   * @description Explanation text shown in the confirmation dialogue that displays before deleting the bucket.
   */
  bucketWillBeRemoved: "The selected storage bucket and contained data will be removed."
};
var str_10 = i18n19.i18n.registerUIStrings("panels/application/components/StorageMetadataView.ts", UIStrings10);
var i18nString9 = i18n19.i18n.getLocalizedString.bind(void 0, str_10);
var StorageBucketRevealInfo = class {
  bucketInfo;
  constructor(bucketInfo) {
    this.bucketInfo = bucketInfo;
  }
};
var StorageMetadataView = class extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  #shadow = this.attachShadow({ mode: "open" });
  #storageBucketsModel;
  #storageKey = null;
  #storageBucket = null;
  #showOnlyBucket = false;
  setStorageKey(storageKey) {
    this.#storageKey = SDK5.StorageKeyManager.parseStorageKey(storageKey);
    void this.render();
  }
  setStorageBucket(storageBucket) {
    this.#storageBucket = storageBucket;
    this.setStorageKey(storageBucket.bucket.storageKey);
  }
  setShowOnlyBucket(show) {
    this.#showOnlyBucket = show;
  }
  enableStorageBucketControls(model) {
    this.#storageBucketsModel = model;
    if (this.#storageKey) {
      void this.render();
    }
  }
  render() {
    return RenderCoordinator.write("StorageMetadataView render", async () => {
      render10(html10`
        <style>${storageMetadataView_css_default}</style>
        <devtools-report .data=${{ reportTitle: this.getTitle() ?? i18nString9(UIStrings10.loading) }}>
          ${await this.renderReportContent()}
        </devtools-report>`, this.#shadow, { host: this });
    });
  }
  getTitle() {
    if (!this.#storageKey) {
      return;
    }
    const origin = this.#storageKey.origin;
    const bucketName = this.#storageBucket?.bucket.name || i18nString9(UIStrings10.defaultBucket);
    return this.#storageBucketsModel ? `${bucketName} - ${origin}` : origin;
  }
  key(content) {
    return html10`<devtools-report-key>${content}</devtools-report-key>`;
  }
  value(content) {
    return html10`<devtools-report-value>${content}</devtools-report-value>`;
  }
  async renderReportContent() {
    if (!this.#storageKey) {
      return nothing6;
    }
    const origin = this.#storageKey.origin;
    const ancestorChainHasCrossSite = Boolean(this.#storageKey.components.get(
      "3"
      /* SDK.StorageKeyManager.StorageKeyComponent.ANCESTOR_CHAIN_BIT */
    ));
    const hasNonce = Boolean(this.#storageKey.components.get(
      "1"
      /* SDK.StorageKeyManager.StorageKeyComponent.NONCE_HIGH */
    ));
    const topLevelSiteIsOpaque = Boolean(this.#storageKey.components.get(
      "4"
      /* SDK.StorageKeyManager.StorageKeyComponent.TOP_LEVEL_SITE_OPAQUE_NONCE_HIGH */
    ));
    const topLevelSite = this.#storageKey.components.get(
      "0"
      /* SDK.StorageKeyManager.StorageKeyComponent.TOP_LEVEL_SITE */
    );
    const thirdPartyReason = ancestorChainHasCrossSite ? i18nString9(UIStrings10.yesBecauseAncestorChainHasCrossSite) : hasNonce ? i18nString9(UIStrings10.yesBecauseKeyIsOpaque) : topLevelSiteIsOpaque ? i18nString9(UIStrings10.yesBecauseTopLevelIsOpaque) : topLevelSite && origin !== topLevelSite ? i18nString9(UIStrings10.yesBecauseOriginNotInTopLevelSite) : null;
    const isIframeOrEmbedded = topLevelSite && origin !== topLevelSite;
    return html10`
        ${isIframeOrEmbedded ? html10`${this.key(i18nString9(UIStrings10.origin))}
            ${this.value(html10`<div class="text-ellipsis" title=${origin}>${origin}</div>`)}` : nothing6}
        ${topLevelSite || topLevelSiteIsOpaque ? this.key(i18nString9(UIStrings10.topLevelSite)) : nothing6}
        ${topLevelSite ? this.value(topLevelSite) : nothing6}
        ${topLevelSiteIsOpaque ? this.value(i18nString9(UIStrings10.opaque)) : nothing6}
        ${thirdPartyReason ? html10`
          ${this.key(i18nString9(UIStrings10.isThirdParty))}${this.value(thirdPartyReason)}` : nothing6}
        ${hasNonce || topLevelSiteIsOpaque ? this.key(i18nString9(UIStrings10.isOpaque)) : nothing6}
        ${hasNonce ? this.value(i18nString9(UIStrings10.yes)) : nothing6}
        ${topLevelSiteIsOpaque ? this.value(i18nString9(UIStrings10.yesBecauseTopLevelIsOpaque)) : nothing6}
        ${this.#storageBucket ? this.#renderStorageBucketInfo() : nothing6}
        ${this.#storageBucketsModel ? this.#renderBucketControls() : nothing6}`;
  }
  #renderStorageBucketInfo() {
    if (!this.#storageBucket) {
      throw new Error("Should not call #renderStorageBucketInfo if #bucket is null.");
    }
    const { bucket: { name }, persistent, durability, quota } = this.#storageBucket;
    const isDefault = !name;
    const renderBucketName = () => {
      if (isDefault) {
        return html10`<span class="default-bucket">${i18nString9(UIStrings10.defaultBucket)}</span>`;
      }
      if (!this.#showOnlyBucket) {
        return html10`${name}`;
      }
      const revealBucket = (e) => {
        e.preventDefault();
        void Common4.Revealer.reveal(new StorageBucketRevealInfo(this.#storageBucket));
      };
      return html10`<devtools-link
        @click=${revealBucket}
        title=${name}
        jslog=${VisualLogging8.action("storage-bucket").track({
        click: true
      })}
      >${name}</devtools-link>`;
    };
    if (this.#showOnlyBucket) {
      return html10`
        ${this.key(i18nString9(UIStrings10.bucketName))}
        ${this.value(renderBucketName())}`;
    }
    return html10`
      ${this.key(i18nString9(UIStrings10.bucketName))}
      ${this.value(renderBucketName())}
      ${this.key(i18nString9(UIStrings10.persistent))}
      ${this.value(persistent ? i18nString9(UIStrings10.yes) : i18nString9(UIStrings10.no))}
      ${this.key(i18nString9(UIStrings10.durability))}
      ${this.value(durability)}
      ${quota !== 0 ? html10`
        ${this.key(i18nString9(UIStrings10.quota))}
        ${this.value(i18n19.ByteUtilities.bytesToString(quota))}
      ` : nothing6}
      ${this.key(i18nString9(UIStrings10.expiration))}
      ${this.value(this.#getExpirationString())}`;
  }
  #getExpirationString() {
    if (!this.#storageBucket) {
      throw new Error("Should not call #getExpirationString if #bucket is null.");
    }
    const { expiration } = this.#storageBucket;
    if (expiration === 0) {
      return i18nString9(UIStrings10.none);
    }
    return new Date(expiration * 1e3).toLocaleString();
  }
  #renderBucketControls() {
    return html10`
    <devtools-report-divider></devtools-report-divider>
    <devtools-report-section>
      <devtools-button aria-label=${i18nString9(UIStrings10.deleteBucket)}
                       .variant=${"outlined"}
                       @click=${this.#deleteBucket}>
        ${i18nString9(UIStrings10.deleteBucket)}
      </devtools-button>
    </devtools-report-section>`;
  }
  async #deleteBucket() {
    if (!this.#storageBucketsModel || !this.#storageBucket) {
      throw new Error("Should not call #deleteBucket if #storageBucketsModel or #storageBucket is null.");
    }
    const ok = await UI10.UIUtils.ConfirmDialog.show(i18nString9(UIStrings10.bucketWillBeRemoved), i18nString9(UIStrings10.confirmBucketDeletion, { PH1: this.#storageBucket.bucket.name || "" }), this, { jslogContext: "delete-bucket-confirmation" });
    if (ok) {
      this.#storageBucketsModel.deleteBucket(this.#storageBucket.bucket);
    }
  }
};
customElements.define("devtools-storage-metadata-view", StorageMetadataView);

// gen/front_end/panels/application/components/TrustTokensView.js
var TrustTokensView_exports = {};
__export(TrustTokensView_exports, {
  TrustTokensView: () => TrustTokensView,
  i18nString: () => i18nString10
});
import "./../../../ui/kit/kit.js";
import "./../../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n21 from "./../../../core/i18n/i18n.js";
import * as SDK6 from "./../../../core/sdk/sdk.js";
import * as Buttons6 from "./../../../ui/components/buttons/buttons.js";
import * as UI11 from "./../../../ui/legacy/legacy.js";
import * as Lit5 from "./../../../ui/lit/lit.js";
import * as VisualLogging9 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/components/trustTokensView.css.js
var trustTokensView_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  padding: 20px;
  height: 100%;
  display: flex;
}

.heading {
  font-size: 15px;
}

devtools-data-grid {
  margin-top: 20px;

  & devtools-button {
    width: 14px;
    height: 14px;
  }
}

devtools-icon {
  width: 14px;
  height: 14px;
}

.no-tt-message {
  margin-top: 20px;
}

/*# sourceURL=${import.meta.resolve("./trustTokensView.css")} */`;

// gen/front_end/panels/application/components/TrustTokensView.js
var PRIVATE_STATE_TOKENS_EXPLANATION_URL = "https://developers.google.com/privacy-sandbox/protections/private-state-tokens";
var { html: html11 } = Lit5;
var UIStrings11 = {
  /**
   * @description Text for the issuer of an item
   */
  issuer: "Issuer",
  /**
   * @description Column header for Trust Token table
   */
  storedTokenCount: "Stored token count",
  /**
   * @description Hover text for an info icon in the Private State Token panel
   */
  allStoredTrustTokensAvailableIn: "All stored private state tokens available in this browser instance.",
  /**
   * @description Text shown instead of a table when the table would be empty. https://developers.google.com/privacy-sandbox/protections/private-state-tokens
   */
  noTrustTokens: "No private state tokens detected",
  /**
   * @description Text shown if there are no private state tokens. https://developers.google.com/privacy-sandbox/protections/private-state-tokens
   */
  trustTokensDescription: "On this page you can view all available private state tokens in the current browsing context.",
  /**
   * @description Each row in the Private State Token table has a delete button. This is the text shown
   * when hovering over this button. The placeholder is a normal URL, indicating the site which
   * provided the Private State Tokens that will be deleted when the button is clicked.
   * @example {https://google.com} PH1
   */
  deleteTrustTokens: "Delete all stored private state tokens issued by {PH1}.",
  /**
   * @description Heading label for a view. Previously known as 'Trust Tokens'.
   */
  trustTokens: "Private state tokens",
  /**
   * @description Text used in a link to learn more about the topic.
   */
  learnMore: "Learn more"
};
var str_11 = i18n21.i18n.registerUIStrings("panels/application/components/TrustTokensView.ts", UIStrings11);
var i18nString10 = i18n21.i18n.getLocalizedString.bind(void 0, str_11);
var REFRESH_INTERVAL_MS = 1e3;
function renderGridOrNoDataMessage(input) {
  if (input.tokens.length === 0) {
    return html11`
        <div jslog=${VisualLogging9.pane("trust-tokens")}>
          <div class="empty-state" jslog=${VisualLogging9.section().context("empty-view")}>
            <div class="empty-state-header">${i18nString10(UIStrings11.noTrustTokens)}</div>
            <div class="empty-state-description">
              <span>${i18nString10(UIStrings11.trustTokensDescription)}</span>
              <devtools-link
                class="devtools-link"
                href=${PRIVATE_STATE_TOKENS_EXPLANATION_URL}
                .jslogContext=${"learn-more"}
              >${i18nString10(UIStrings11.learnMore)}</devtools-link>
            </div>
          </div>
        </div>
      `;
  }
  return html11`
      <div jslog=${VisualLogging9.pane("trust-tokens")}>
        <span class="heading">${i18nString10(UIStrings11.trustTokens)}</span>
        <devtools-icon name="info" title=${i18nString10(UIStrings11.allStoredTrustTokensAvailableIn)}></devtools-icon>
        <devtools-data-grid striped inline>
          <table>
            <tr>
              <th id="issuer" weight="10" sortable>${i18nString10(UIStrings11.issuer)}</th>
              <th id="count" weight="5" sortable>${i18nString10(UIStrings11.storedTokenCount)}</th>
              <th id="delete-button" weight="1" sortable></th>
            </tr>
            ${input.tokens.filter((token) => token.count > 0).map((token) => html11`
                <tr>
                  <td>${removeTrailingSlash(token.issuerOrigin)}</td>
                  <td>${token.count}</td>
                  <td>
                    <devtools-button .iconName=${"bin"}
                                    .jslogContext=${"delete-all"}
                                    .size=${"SMALL"}
                                    .title=${i18nString10(UIStrings11.deleteTrustTokens, { PH1: removeTrailingSlash(token.issuerOrigin) })}
                                    .variant=${"icon"}
                                    @click=${() => input.deleteClickHandler(removeTrailingSlash(token.issuerOrigin))}></devtools-button>
                  </td>
                </tr>
              `)}
          </table>
        </devtools-data-grid>
      </div>
    `;
}
var DEFAULT_VIEW10 = (input, output, target) => {
  Lit5.render(html11`
    <style>${trustTokensView_css_default}</style>
    <style>${UI11.inspectorCommonStyles}</style>
    ${renderGridOrNoDataMessage(input)}
  `, target);
};
var TrustTokensView = class extends UI11.Widget.VBox {
  #updateInterval = 0;
  #tokens = [];
  #view;
  constructor(element, view = DEFAULT_VIEW10) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  wasShown() {
    super.wasShown();
    this.requestUpdate();
    this.#updateInterval = window.setInterval(this.requestUpdate.bind(this), REFRESH_INTERVAL_MS);
  }
  willHide() {
    super.willHide();
    window.clearInterval(this.#updateInterval);
    this.#updateInterval = 0;
  }
  async performUpdate() {
    const mainTarget = SDK6.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }
    const { tokens } = await mainTarget.storageAgent().invoke_getTrustTokens();
    tokens.sort((a, b) => a.issuerOrigin.localeCompare(b.issuerOrigin));
    this.#tokens = tokens;
    this.#view({ tokens: this.#tokens, deleteClickHandler: this.#deleteClickHandler.bind(this) }, void 0, this.contentElement);
  }
  #deleteClickHandler(issuerOrigin) {
    const mainTarget = SDK6.TargetManager.TargetManager.instance().primaryPageTarget();
    void mainTarget?.storageAgent().invoke_clearTrustTokens({ issuerOrigin });
  }
};
function removeTrailingSlash(s) {
  return s.replace(/\/$/, "");
}
export {
  AdsView_exports as AdsView,
  BackForwardCacheView_exports as BackForwardCacheView,
  BounceTrackingMitigationsView_exports as BounceTrackingMitigationsView,
  CrashReportContextGrid_exports as CrashReportContextGrid,
  EndpointsGrid_exports as EndpointsGrid,
  PermissionsPolicySection_exports as PermissionsPolicySection,
  ProtocolHandlersView_exports as ProtocolHandlersView,
  ReportsGrid_exports as ReportsGrid,
  ServiceWorkerRouterView_exports as ServiceWorkerRouterView,
  StorageMetadataView_exports as StorageMetadataView,
  TrustTokensView_exports as TrustTokensView
};
//# sourceMappingURL=components.js.map

// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/legacy/components/data_grid/data_grid.js';
import '../../../ui/kit/kit.js';
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import adsViewStyles from './adsView.css.js';
const { html } = Lit;
const { bindToSetting } = UI.UIUtils;
const UIStrings = {
    /**
     * @description Title for the metrics table.
     */
    metrics: 'Metrics',
    /**
     * @description Title for a metric showing the percentage of the viewport covered by ads.
     */
    viewportAdDensity: 'Viewport ad density',
    /**
     * @description Title for a metric showing the number of ads in the viewport.
     */
    viewportAdCount: 'Viewport ad count',
    /**
     * @description Title for a metric showing the total CPU usage by ads.
     */
    totalCpuUsage: 'Total CPU usage by ads',
    /**
     * @description Title for a metric showing the total network usage by ads.
     */
    totalNetworkUsage: 'Total network usage by ads',
    /**
     * @description Subtext showing the average value of a metric.
     * @example {5.00%} PH1
     */
    average: '(Average: {PH1})',
    /**
     * @description Title for the ad iframes table.
     * @example {3} PH1
     */
    adIframesTitle: 'Ad iframes (total {PH1})',
    /**
     * @description Text to display when a value is not available.
     */
    notAvailable: 'N/A',
    /**
     * @description Text to display when a frame has no name/id.
     */
    unnamed: '<unnamed>',
    /**
     * @description Title for the Element Id column in the ad iframes table.
     */
    elementId: 'Element ID',
    /**
     * @description Title for the Initial origin column in the ad iframes table.
     */
    initialOrigin: 'Initial origin',
    /**
     * @description Title for the CPU column in the ad iframes table.
     */
    cpu: 'CPU',
    /**
     * @description Title for the Network column in the ad iframes table.
     */
    network: 'Network',
    /**
     * @description Accessible name for the ad iframes table.
     */
    adIframes: 'Ad iframes',
    /**
     * @description Title for the settings section.
     */
    settings: 'Settings',
    /**
     * @description The name of a checkbox setting. This setting highlights the
     * rendering elements for ads that are found on the page.
     */
    highlightAds: 'Highlight ads',
    /**
     * @description Explanation text for the 'Highlight ads' setting.
     */
    highlightsElementsRedDetectedToBe: 'Highlights elements (red) detected to be ads.',
    /**
     * @description Text explaining that ad detection is not perfect.
     */
    adDetectionMistakes: 'Chrome’s ad detection can make mistakes.',
    /**
     * @description Link text for learning more about ad detection in Chrome.
     */
    learnMore: 'Learn more',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/AdsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const formatMetric = (val, formatter) => {
    if (val === undefined || val === -1) {
        return i18nString(UIStrings.notAvailable);
    }
    return formatter(val);
};
const formatCpu = (val) => {
    return formatMetric(val, (v) => i18n.TimeUtilities.millisToString(v));
};
const formatNetwork = (val) => {
    return formatMetric(val, (v) => i18n.ByteUtilities.bytesToString(v));
};
const DEFAULT_VIEW = (input, output, target) => {
    const metrics = input.metrics;
    const formatValue = (val, isPercentage) => {
        return formatMetric(val, (v) => {
            if (isPercentage) {
                return new Intl
                    .NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
                    style: 'percent',
                    maximumFractionDigits: 0,
                })
                    .format(v / 100);
            }
            return new Intl.NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale).format(v);
        });
    };
    const formatAverage = (val, isPercentage) => {
        return formatMetric(val, (v) => {
            if (isPercentage) {
                return new Intl
                    .NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
                    style: 'percent',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })
                    .format(v / 100);
            }
            return new Intl
                .NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })
                .format(v);
        });
    };
    // clang-format off
    Lit.render(html `
    <style>${adsViewStyles}</style>
    <div class="ads-view-container" jslog=${VisualLogging.pane('ads')}>
      <div class="metrics-title">${i18nString(UIStrings.metrics)}</div>
      <dl class="metrics-container">
        <div class="metric-box">
          <dt class="metric-title">${i18nString(UIStrings.viewportAdDensity)}</dt>
          <dd class="metric-value">
            <span>${formatValue(metrics.viewportAdDensityByArea, true)}</span>
            <span class="metric-average">${i18nString(UIStrings.average, {
        PH1: formatAverage(metrics.averageViewportAdDensityByArea, true),
    })}</span>
          </dd>
        </div>
        <div class="metric-box">
          <dt class="metric-title">${i18nString(UIStrings.viewportAdCount)}</dt>
          <dd class="metric-value">
            <span>${formatValue(metrics.viewportAdCount, false)}</span>
            <span class="metric-average">${i18nString(UIStrings.average, {
        PH1: formatAverage(metrics.averageViewportAdCount, false),
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
            ${input.adFrames.map(frame => html `
              <tr>
                <td title=${frame.elementId}>
                  ${frame.elementId
        ? html `
                        <button class="text-button link-style devtools-link" @click=${frame.revealFrame}>
                          ${frame.elementId}
                        </button>
                      `
        : Lit.nothing}
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
          ${bindToSetting(Common.Settings.Settings.instance().moduleSetting('show-ad-highlights'))}>
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
    // clang-format on
};
export class AdsView extends UI.Widget.Widget {
    #currentMetrics;
    #pollTimer;
    #isPolling = false;
    #pollSessionId = 0;
    #view;
    #adFrames = new Map();
    #adIframeElementIds = new Map();
    #fetchingElementIds = new Set();
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
            removeAdFrames: [],
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
        if (this.#pollTimer !== undefined) {
            window.clearTimeout(this.#pollTimer);
            this.#pollTimer = undefined;
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
        // Drop removed frames from the local cache.
        for (const frameId of metrics.removeAdFrames || []) {
            this.#adFrames.delete(frameId);
            this.#adIframeElementIds.delete(frameId);
        }
        // Merge partial updates into the local cache.
        for (const frame of metrics.updateAdFrames || []) {
            const frameId = frame.frameId;
            const existingFrame = this.#adFrames.get(frameId) || {};
            // Object Spread / Protocol Undefined Behavior
            // To reduce the payload size, the C++ backend only sends the 'initialOrigin' field
            // when it changes since the last sent message for the same frame. Because
            // the parsed JSON frame won't have the 'initialOrigin' key if it hasn't changed,
            // spreading it over existingFrame won't overwrite existingFrame.initialOrigin with
            // undefined.
            const newFrame = { ...existingFrame, ...frame };
            this.#adFrames.set(frameId, newFrame);
        }
        // Asynchronously fetch Element IDs for newly tracked frames.
        // Duplicate requests are prevented by #fetchingElementIds.
        for (const frameId of this.#adFrames.keys()) {
            if (!this.#adIframeElementIds.has(frameId) && !this.#fetchingElementIds.has(frameId)) {
                this.#fetchingElementIds.add(frameId);
                void this.#fetchIframeElementId(frameId)
                    .then(elementId => {
                    if (this.#adFrames.has(frameId) && elementId !== undefined) {
                        this.#adIframeElementIds.set(frameId, elementId);
                    }
                })
                    .catch(() => { })
                    .finally(() => {
                    this.#fetchingElementIds.delete(frameId);
                    this.requestUpdate();
                });
            }
        }
    }
    async #fetchIframeElementId(frameId) {
        const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
        if (!frame) {
            return undefined;
        }
        const deferredNode = await frame.getOwnerDeferredDOMNode();
        if (deferredNode) {
            const node = await deferredNode.resolvePromise();
            return node?.getAttribute('id') || null;
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
            removeAdFrames: [],
        };
        this.#adFrames.clear();
        this.#adIframeElementIds.clear();
        this.#fetchingElementIds.clear();
        this.requestUpdate();
    }
    performUpdate() {
        const adFramesArray = [];
        for (const [frameId, frame] of this.#adFrames) {
            // The table displays the resolved ID, or an <unnamed> placeholder if the
            // element lacks an ID attribute, or an empty string while pending.
            const elementIdText = this.#adIframeElementIds.has(frameId) ?
                (this.#adIframeElementIds.get(frameId) || i18nString(UIStrings.unnamed)) :
                '';
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
                initialOrigin: frame.initialOrigin || '',
                cpuTime: formatCpu(frame.cpuTime),
                rawCpuTime: frame.cpuTime ?? -1,
                networkBytes: formatNetwork(frame.networkBytes),
                rawNetworkBytes: frame.networkBytes ?? -1,
                revealFrame,
            });
        }
        const viewInput = {
            metrics: this.#currentMetrics,
            adFrames: adFramesArray,
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
}
//# sourceMappingURL=AdsView.js.map
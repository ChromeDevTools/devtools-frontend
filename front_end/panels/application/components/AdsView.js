// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/legacy/components/data_grid/data_grid.js';
import '../../../ui/kit/kit.js';
import '../../../ui/components/tooltips/tooltips.js';
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Components from '../../../ui/legacy/components/utils/utils.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import adScriptsTableStyles from './adScriptsTable.css.js';
import adsViewStyles from './adsView.css.js';
const { html } = Lit;
const { repeat } = Lit.Directives;
const { bindToSetting } = UI.UIUtils;
const DENSITY_DOC_URL = 'https://developer.chrome.com/docs/ads/metrics/density';
const COUNT_DOC_URL = 'https://developer.chrome.com/docs/ads/metrics/count';
const CPU_USAGE_DOC_URL = 'https://developer.chrome.com/docs/ads/metrics/weight-cpu';
const NETWORK_USAGE_DOC_URL = 'https://developer.chrome.com/docs/ads/metrics/weight-network';
const AD_DETECTION_DOC_URL = 'https://developer.chrome.com/docs/ads/detection';
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
     * @description Tooltip text explaining the viewport ad density metric in the ads view of the Application panel.
     */
    viewportAdDensityExplanation: 'Percentage of the viewport covered by ads',
    /**
     * @description Title for a metric showing the number of ads in the viewport.
     */
    viewportAdCount: 'Viewport ad count',
    /**
     * @description Tooltip text explaining the viewport ad count metric in the ads view of the Application panel.
     */
    viewportAdCountExplanation: 'Number of ads in the viewport',
    /**
     * @description Title for a metric showing the total CPU usage by ads.
     */
    totalCpuUsage: 'Total CPU usage by ads',
    /**
     * @description Tooltip text explaining the total CPU usage metric in the ads view of the Application panel.
     */
    totalCpuUsageExplanation: 'Total CPU time consumed by ads',
    /**
     * @description Title for a metric showing the total network usage by ads.
     */
    totalNetworkUsage: 'Total network usage by ads',
    /**
     * @description Tooltip text explaining the total network usage metric in the ads view of the Application panel.
     */
    totalNetworkUsageExplanation: 'Total network data consumed by ads',
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
     * @description Title for the ad scripts table.
     * @example {3} PH1
     */
    adScriptsTitle: 'Ad scripts (total {PH1})',
    /**
     * @description Title for the URL column in the ad scripts table.
     */
    url: 'URL',
    /**
     * @description Accessible name for the ad scripts table.
     */
    adScripts: 'Ad scripts',
    /**
     * @description Title for the ad provenance column in the ad scripts table.
     */
    adProvenance: 'Ad provenance',
    /**
     * @description Text to display when a script has no provenance.
     */
    noProvenance: '<no provenance>',
    /**
     * @description Text to display in the tooltip when a script has no provenance.
     */
    noProvenanceTooltip: 'No provenance data is available',
    /**
     * @description Title for the filter list rule in the ad provenance tooltip.
     */
    filterListRule: 'Filter list rule',
    /**
     * @description Title for the root script filter list rule in the ad provenance tooltip.
     */
    rootScriptFilterListRule: 'Root script filter list rule',
    /**
     * @description Title for the creator ad script ancestry in the ad provenance tooltip.
     */
    creatorAdScriptAncestry: 'Creator ad script ancestry',
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
    highlightsElementsRedDetectedToBe: 'Highlights elements (red) detected to be ads',
    /**
     * @description Text explaining that ad detection is not perfect.
     */
    adDetectionMistakes: 'Chrome’s ad detection can make mistakes',
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
const SCRIPT_LINK_OPTIONS = {
    jslogContext: 'ad-script',
};
const stopPropagation = (e) => e.stopPropagation();
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
    const renderMetricTooltip = (tooltipId, explanation, url) => {
        return html `
      <devtools-icon
        name="info"
        class="small metric-info-icon"
        tabindex="0"
        role="button"
        aria-details=${tooltipId}
        aria-label=${explanation}
      ></devtools-icon>
      <devtools-tooltip id=${tooltipId} variant="rich" prefer-span-left @copy=${stopPropagation}>
        <span>${explanation}</span>
        &#32;
        <devtools-link href=${url} jslogcontext="learn-more">
          ${i18nString(UIStrings.learnMore)}
        </devtools-link>
      </devtools-tooltip>
    `;
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
          ${renderMetricTooltip('density-metric-tooltip', i18nString(UIStrings.viewportAdDensityExplanation), DENSITY_DOC_URL)}
        </div>
        <div class="metric-box">
          <dt class="metric-title">${i18nString(UIStrings.viewportAdCount)}</dt>
          <dd class="metric-value">
            <span>${formatValue(metrics.viewportAdCount, false)}</span>
            <span class="metric-average">${i18nString(UIStrings.average, {
        PH1: formatAverage(metrics.averageViewportAdCount, false),
    })}</span>
          </dd>
          ${renderMetricTooltip('count-metric-tooltip', i18nString(UIStrings.viewportAdCountExplanation), COUNT_DOC_URL)}
        </div>
        <div class="metric-box">
          <dt class="metric-title">${i18nString(UIStrings.totalCpuUsage)}</dt>
          <dd class="metric-value">
            <span>${formatCpu(metrics.totalAdCpuTime)}</span>
          </dd>
          ${renderMetricTooltip('cpu-metric-tooltip', i18nString(UIStrings.totalCpuUsageExplanation), CPU_USAGE_DOC_URL)}
        </div>
        <div class="metric-box">
          <dt class="metric-title">${i18nString(UIStrings.totalNetworkUsage)}</dt>
          <dd class="metric-value">
            <span>${formatNetwork(metrics.totalAdNetworkBytes)}</span>
          </dd>
          ${renderMetricTooltip('network-metric-tooltip', i18nString(UIStrings.totalNetworkUsageExplanation), NETWORK_USAGE_DOC_URL)}
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
      <div class="ad-scripts-title">${i18nString(UIStrings.adScriptsTitle, { PH1: input.adScripts.length })}</div>
      <div class="ad-scripts-container">
        <devtools-data-grid striped resize="last" class="ad-scripts-data-grid" name=${i18nString(UIStrings.adScripts)}>
          <table>
            ${Lit.Directives.unsafeHTML(`<style>${adScriptsTableStyles}</style>`)}
            <tr>
              <th id="url" weight="1" sortable>${i18nString(UIStrings.url)}</th>
              <th id="provenance" weight="1" sortable>${i18nString(UIStrings.adProvenance)}</th>
            </tr>
            ${repeat(input.adScripts, script => script.url, script => html `
              <tr>
                <td title=${script.url}>
                  ${input.getLinkElement(script.url)}
                </td>
                <td>
                  <devtools-tooltip id=${`ad-tooltip-${script.scriptId}`} variant=rich @copy=${stopPropagation}>
                    <div class="ad-provenance-tooltip">
                      ${script.parsedProvenance?.filterlistRule ? html `
                        <div class="ad-provenance-tooltip-title">${i18nString(UIStrings.filterListRule)}</div>
                        <div class="ad-provenance-tooltip-content">${script.parsedProvenance.filterlistRule}</div>
                      ` : Lit.nothing}
                      ${script.parsedProvenance?.adScriptAncestry ? html `
                        <div class="ad-provenance-tooltip-title">${i18nString(UIStrings.creatorAdScriptAncestry)}</div>
                        <div class="ad-provenance-tooltip-content">
                          ${input.target ? script.parsedProvenance.adScriptAncestry.ancestryChain.map(ancestor => html `
                            <div>
                              ${UI.Widget.widget(Components.Linkifier.ScriptLocationLink, {
        target: input.target ?? undefined,
        scriptId: ancestor.scriptId,
        options: SCRIPT_LINK_OPTIONS,
    })}
                            </div>
                          `) : Lit.nothing}
                        </div>
                        ${script.parsedProvenance.adScriptAncestry.rootScriptFilterlistRule ? html `
                          <div class="ad-provenance-tooltip-title">${i18nString(UIStrings.rootScriptFilterListRule)}</div>
                          <div class="ad-provenance-tooltip-content">${script.parsedProvenance.adScriptAncestry.rootScriptFilterlistRule}</div>
                        ` : Lit.nothing}
                      ` : Lit.nothing}
                      ${!script.parsedProvenance?.adScriptAncestry && !script.parsedProvenance?.filterlistRule ? i18nString(UIStrings.noProvenanceTooltip) : Lit.nothing}
                    </div>
                  </devtools-tooltip>
                  <div aria-details=${`ad-tooltip-${script.scriptId}`}>
                    ${script.parsedProvenance?.filterlistRule ? html `<span>${script.parsedProvenance.filterlistRule}</span>` : Lit.nothing}
                    ${script.parsedProvenance?.filterlistRule && script.parsedProvenance?.adScriptAncestry && input.target ? html `<span>, </span>` : Lit.nothing}
                    ${script.parsedProvenance?.adScriptAncestry && input.target ?
        UI.Widget.widget(Components.Linkifier.ScriptLocationLink, {
            target: input.target ?? undefined,
            scriptId: script.parsedProvenance.adScriptAncestry.ancestryChain[0].scriptId,
            options: SCRIPT_LINK_OPTIONS,
        }) : Lit.nothing}
                    ${!script.parsedProvenance?.adScriptAncestry && !script.parsedProvenance?.filterlistRule ? i18nString(UIStrings.noProvenance) : Lit.nothing}
                  </div>
                </td>
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
          <devtools-link href=${AD_DETECTION_DOC_URL} jslogcontext="learn-more">
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
    #unresolvedScriptIds = new Set();
    #adScriptNodeData = [];
    #urlToLinkElement = new Map();
    #reconstructedProvenance = new Map();
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
                const [metricsResponse, scriptsResponse] = await Promise.all([
                    adsAgent.invoke_getAdMetrics(),
                    adsAgent.invoke_getAdScripts(),
                ]);
                if (!this.#isPolling || this.#pollSessionId !== sessionId) {
                    return;
                }
                let needsUpdate = false;
                if (!metricsResponse.getError()) {
                    this.#currentMetrics = metricsResponse.metrics;
                    this.#processAdFrames(metricsResponse.metrics);
                    needsUpdate = true;
                }
                if (!scriptsResponse.getError()) {
                    this.#processAdScripts(scriptsResponse.newScripts || []);
                    needsUpdate = true;
                }
                if (needsUpdate) {
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
    // Lazily reconstructs the full script ancestry chain for a given script.
    // The backend guarantees that scripts across different batches are ordered
    // correctly (i.e., an ancestor script will always be sent in the same or an
    // earlier batch than its descendants). However, scripts arriving within the
    // same batch may be out of order. This recursive, topological approach ensures
    // we can resolve those in-batch ordering issues while maintaining O(N)
    // complexity overall via memoization in #reconstructedProvenance.
    #reconstructProvenance(scriptId, newScriptsMap) {
        if (this.#reconstructedProvenance.has(scriptId)) {
            return this.#reconstructedProvenance.get(scriptId) ?? null;
        }
        const script = newScriptsMap.get(scriptId);
        if (!script || !script.provenance) {
            return null;
        }
        let fullProvenance = script.provenance;
        if (script.provenance.adScriptAncestry) {
            const immediateAncestor = script.provenance.adScriptAncestry.ancestryChain[0];
            const ancestorProvenance = immediateAncestor ? this.#reconstructProvenance(immediateAncestor.scriptId, newScriptsMap) : null;
            if (ancestorProvenance) {
                const newChain = [immediateAncestor];
                if (ancestorProvenance.adScriptAncestry) {
                    newChain.push(...ancestorProvenance.adScriptAncestry.ancestryChain);
                }
                const rootScriptFilterlistRule = ancestorProvenance.filterlistRule || ancestorProvenance.adScriptAncestry?.rootScriptFilterlistRule;
                fullProvenance = {
                    ...script.provenance,
                    adScriptAncestry: {
                        ancestryChain: newChain,
                        ...(rootScriptFilterlistRule ? { rootScriptFilterlistRule } : {}),
                    },
                };
            }
        }
        this.#reconstructedProvenance.set(scriptId, fullProvenance);
        return fullProvenance;
    }
    #processAdScripts(newScripts) {
        const newScriptsMap = new Map(newScripts.map(s => [s.scriptId, s]));
        for (const script of newScripts) {
            this.#unresolvedScriptIds.add(script.scriptId);
            this.#reconstructProvenance(script.scriptId, newScriptsMap);
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
        this.#unresolvedScriptIds.clear();
        this.#adScriptNodeData.length = 0;
        this.#urlToLinkElement.clear();
        this.#reconstructedProvenance.clear();
        this.requestUpdate();
    }
    performUpdate() {
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        const debuggerModel = target?.model(SDK.DebuggerModel.DebuggerModel);
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
        for (const scriptId of this.#unresolvedScriptIds) {
            const sdkScript = debuggerModel?.scriptForId(scriptId);
            // Filter out inline <script> tags and anonymous eval/dynamic scripts.
            // We only want to display named external resources or explicitly named
            // scripts to reduce noise in the UI.
            if (!sdkScript) {
                continue;
            }
            this.#unresolvedScriptIds.delete(scriptId);
            if (sdkScript.isInlineScript() || sdkScript.isContentScript() || !sdkScript.sourceURL) {
                continue;
            }
            const url = sdkScript.sourceURL;
            // De-duplicate scripts by URL. V8 frequently generates multiple
            // ScriptIds for the same URL (e.g., when the same external script
            // is loaded into multiple iframes).
            if (this.#urlToLinkElement.has(url)) {
                continue;
            }
            this.#urlToLinkElement.set(url, Components.Linkifier.Linkifier.linkifyURL(url, { text: url }));
            const parsedProvenance = this.#reconstructedProvenance.get(scriptId) ?? null;
            this.#adScriptNodeData.push({
                url,
                parsedProvenance,
                scriptId,
            });
        }
        const viewInput = {
            metrics: this.#currentMetrics,
            adFrames: adFramesArray,
            adScripts: this.#adScriptNodeData,
            target: target || null,
            getLinkElement: (url) => this.#urlToLinkElement.get(url),
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
}
//# sourceMappingURL=AdsView.js.map
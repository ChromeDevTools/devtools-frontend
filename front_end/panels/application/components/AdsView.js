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
import * as PanelCommon from '../../common/common.js';
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
const MAX_OWNER_RESOLVE_RETRIES = 3;
const UIStrings = {
    /**
     * @description Title for the metrics section in the ads view of the Application panel.
     */
    metrics: 'Metrics',
    /**
     * @description Title for a metric showing the percentage of the viewport covered by ads in the ads view of the Application panel.
     */
    viewportAdDensity: 'Viewport ad density',
    /**
     * @description Tooltip text explaining the viewport ad density metric in the ads view of the Application panel.
     */
    viewportAdDensityExplanation: 'Percentage of the viewport covered by ads',
    /**
     * @description Title for a metric showing the number of ads in the viewport in the ads view of the Application panel.
     */
    viewportAdCount: 'Viewport ad count',
    /**
     * @description Tooltip text explaining the viewport ad count metric in the ads view of the Application panel.
     */
    viewportAdCountExplanation: 'Number of ads in the viewport',
    /**
     * @description Title for a metric showing the total CPU usage by ads in the ads view of the Application panel.
     */
    totalCpuUsage: 'Total CPU usage by ads',
    /**
     * @description Tooltip text explaining the total CPU usage metric in the ads view of the Application panel.
     */
    totalCpuUsageExplanation: 'Total CPU time consumed by ads',
    /**
     * @description Title for a metric showing the total network usage by ads in the ads view of the Application panel.
     */
    totalNetworkUsage: 'Total network usage by ads',
    /**
     * @description Tooltip text explaining the total network usage metric in the ads view of the Application panel.
     */
    totalNetworkUsageExplanation: 'Total network data consumed by ads',
    /**
     * @description Subtext showing the average value of a metric in the ads view of the Application panel.
     * @example {5.00%} PH1
     */
    average: '(Average: {PH1})',
    /**
     * @description Title for the ad iframes table in the ads view of the Application panel.
     * @example {3} PH1
     */
    adIframesTitle: 'Ad iframes (total {PH1})',
    /**
     * @description Text to display when a metric value is not available in the ads view of the Application panel.
     */
    notAvailable: 'N/A',
    /**
     * @description Text to display when a frame has no name or ID in the ads view of the Application panel.
     */
    unnamed: '<unnamed>',
    /**
     * @description Column header for the element ID in the ad iframes table in the ads view of the Application panel.
     */
    elementId: 'Element ID',
    /**
     * @description Column header for the initial origin in the ad iframes table in the ads view of the Application panel.
     */
    initialOrigin: 'Initial origin',
    /**
     * @description Column header for CPU usage in the ad iframes table in the ads view of the Application panel.
     */
    cpu: 'CPU',
    /**
     * @description Column header for network usage in the ad iframes table in the ads view of the Application panel.
     */
    network: 'Network',
    /**
     * @description Column header for the number of frames nested under each ad iframe (at any depth) in the ad iframes table in the ads view of the Application panel.
     */
    subframes: 'Subframes',
    /**
     * @description Accessible name for the ad iframes table in the ads view of the Application panel.
     */
    adIframes: 'Ad iframes',
    /**
     * @description Context menu item for a row in the ad iframes table in the ads view of the Application panel. Opens the details of the ad iframe under Frames in the Application panel.
     */
    showIframeDetails: 'Show `iframe` details',
    /**
     * @description Title for the ad scripts table in the ads view of the Application panel.
     * @example {3} PH1
     */
    adScriptsTitle: 'Ad scripts (total {PH1})',
    /**
     * @description Column header for the script URL in the ad scripts table in the ads view of the Application panel.
     */
    url: 'URL',
    /**
     * @description Accessible name for the ad scripts table in the ads view of the Application panel.
     */
    adScripts: 'Ad scripts',
    /**
     * @description Column header for the ad provenance in the ad scripts table in the ads view of the Application panel.
     */
    adProvenance: 'Ad provenance',
    /**
     * @description Text to display when a script has no provenance in the ads view of the Application panel.
     */
    noProvenance: '<no provenance>',
    /**
     * @description Tooltip text when a script has no provenance in the ads view of the Application panel.
     */
    noProvenanceTooltip: 'No provenance data is available',
    /**
     * @description Title for the filter list rule in the ad provenance tooltip in the ads view of the Application panel.
     */
    filterListRule: 'Filter list rule',
    /**
     * @description Title for the root script filter list rule in the ad provenance tooltip in the ads view of the Application panel.
     */
    rootScriptFilterListRule: 'Root script filter list rule',
    /**
     * @description Title for the creator ad script ancestry in the ad provenance tooltip in the ads view of the Application panel.
     */
    creatorAdScriptAncestry: 'Creator ad script ancestry',
    /**
     * @description Title for the settings section in the ads view of the Application panel.
     */
    settings: 'Settings',
    /**
     * @description Label for the checkbox setting to highlight ad-related resources on the page in the ads view of the Application panel.
     */
    highlightAdRelatedResources: 'Highlight ad-related resources',
    /**
     * @description Explanation text for the highlight ad-related resources setting in the ads view of the Application panel.
     */
    highlightsElementsRedDetectedToBeAdRelated: 'Highlights elements (red) detected to be ad-related',
    /**
     * @description Informational notice explaining that ad detection in Chrome can make mistakes in the ads view of the Application panel.
     */
    adDetectionMistakes: 'Chrome’s ad detection can make mistakes',
    /**
     * @description Link text to learn more about ad detection in Chrome in the ads view of the Application panel.
     */
    learnMore: 'Learn more',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/AdsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * The DOM model can stop tracking the node of an <iframe> element and track a
 * new node for it instead, e.g. when the iframe navigates. A node that is no
 * longer tracked can't be highlighted or revealed.
 */
function isStaleNode(node) {
    return node !== null && node.domModel().nodeForId(node.id) !== node;
}
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
export const DEFAULT_VIEW = (input, output, target) => {
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
    const renderElementId = (frame) => {
        if (!frame.ownerNode) {
            return frame.elementId;
        }
        // The data grid shows a copy of the link, which keeps pointing at the node
        // that it was created for. Keying the link by the node makes the data grid
        // copy it again when the owner element is resolved again.
        return html `${repeat([frame.ownerNode], node => node, node => PanelCommon.DOMLinkifier.Linkifier.instance().linkify(node, { textContent: frame.elementId }))}`;
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
        <devtools-data-grid striped resize="last" class="ad-frames-data-grid" name=${i18nString(UIStrings.adIframes)}
            @mouseleave=${input.onAdFramesMouseLeave}>
          <table>
            <tr>
              <th id="elementId" weight="1" sortable>${i18nString(UIStrings.elementId)}</th>
              <th id="initialOrigin" weight="2" sortable>${i18nString(UIStrings.initialOrigin)}</th>
              <th id="cpuTime" weight="1" sortable type="numeric">${i18nString(UIStrings.cpu)}</th>
              <th id="networkBytes" weight="1" sortable type="numeric">${i18nString(UIStrings.network)}</th>
              <th id="subframeCount" weight="1" sortable type="numeric">${i18nString(UIStrings.subframes)}</th>
            </tr>
            ${repeat(input.adFrames, frame => frame.frameId, frame => html `
              <tr
                @contextmenu=${(e) => input.onAdFrameContextMenu(e.detail, frame.frameId)}>
                <td title=${frame.elementId}>${renderElementId(frame)}</td>
                <td title=${frame.initialOrigin}>${frame.initialOrigin}</td>
                <td title=${frame.cpuTime} data-value=${frame.rawCpuTime}>${frame.cpuTime}</td>
                <td title=${frame.networkBytes} data-value=${frame.rawNetworkBytes}>${frame.networkBytes}</td>
                <td title=${frame.subframeCount}>${frame.subframeCount}</td>
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
          <div class="setting-label">${i18nString(UIStrings.highlightAdRelatedResources)}</div>
          <div class="setting-explanation">${i18nString(UIStrings.highlightsElementsRedDetectedToBeAdRelated)}</div>
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
    // Maps an ad frame ID to its resolved owner element, or null if it has none
    // or couldn't be resolved.
    #adIframeOwners = new Map();
    #fetchingOwners = new Set();
    #ownerResolveRetries = new Map();
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
            this.#adIframeOwners.delete(frameId);
            this.#ownerResolveRetries.delete(frameId);
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
        // Asynchronously fetch the owner elements of newly tracked frames, and of
        // frames whose owner element has to be resolved again.
        // Duplicate requests are prevented by #fetchingOwners.
        for (const frameId of this.#adFrames.keys()) {
            const currentOwner = this.#adIframeOwners.get(frameId);
            if ((currentOwner === undefined || isStaleNode(currentOwner)) && !this.#fetchingOwners.has(frameId)) {
                this.#fetchingOwners.add(frameId);
                void this.#fetchIframeOwner(frameId)
                    .then(owner => {
                    if (owner !== undefined) {
                        this.#ownerResolveRetries.delete(frameId);
                        if (this.#adFrames.has(frameId)) {
                            this.#adIframeOwners.set(frameId, owner);
                            this.requestUpdate();
                        }
                    }
                })
                    .catch(() => { })
                    .finally(() => {
                    this.#fetchingOwners.delete(frameId);
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
    // Returns the owner element, null if the frame has none or retries are
    // exhausted, or undefined if it couldn't be resolved yet and should be
    // retried on a later poll.
    async #fetchIframeOwner(frameId) {
        const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
        if (!frame) {
            return undefined;
        }
        const deferredNode = await frame.getOwnerDeferredDOMNode();
        if (!deferredNode) {
            return null;
        }
        const owner = await deferredNode.resolvePromise();
        if (owner) {
            return owner;
        }
        // `resolvePromise()` can transiently return null (e.g. if the parent
        // document updates mid-flight). Cap retries so a persistent null still
        // falls back to <unnamed> without polling CDP forever.
        const retries = this.#ownerResolveRetries.get(frameId) ?? 0;
        if (retries >= MAX_OWNER_RESOLVE_RETRIES) {
            return null;
        }
        if (this.#adFrames.has(frameId)) {
            this.#ownerResolveRetries.set(frameId, retries + 1);
        }
        return undefined;
    }
    // Returns the number of frames nested under each ad frame at any depth,
    // derived from the frame tree that DevTools already tracks. A frame only
    // knows its children within its own target, so this walks up from every
    // frame instead: `parentFrame()` also crosses target boundaries (OOPIFs).
    #computeSubframeCounts() {
        const subframeCounts = new Map();
        if (this.#adFrames.size === 0) {
            return subframeCounts;
        }
        for (const frame of SDK.FrameManager.FrameManager.instance().getAllFrames()) {
            for (let ancestor = frame.parentFrame(); ancestor; ancestor = ancestor.parentFrame()) {
                if (this.#adFrames.has(ancestor.id)) {
                    subframeCounts.set(ancestor.id, (subframeCounts.get(ancestor.id) ?? 0) + 1);
                }
            }
        }
        return subframeCounts;
    }
    // Offers the same "Show iframe details" item as the context menu of an
    // <iframe> node in the Elements panel.
    #populateAdFrameContextMenu(contextMenu, frameId) {
        const frameManager = SDK.FrameManager.FrameManager.instance();
        if (frameManager.getFrame(frameId)) {
            contextMenu.viewSection().appendItem(i18nString(UIStrings.showIframeDetails), () => {
                // FrameManager hands out a new ResourceTreeFrame for a frame that
                // moved to another target, so look the frame up again.
                const frame = frameManager.getFrame(frameId);
                if (frame) {
                    void Common.Revealer.reveal(frame);
                }
            }, { jslogContext: 'show-frame-details' });
        }
    }
    // The link of an Element ID hides the highlight of its node when the mouse
    // leaves the link. The data grid can move or rebuild the link under the
    // cursor, and then the link doesn't notice that the mouse leaves. So hide
    // the highlight when the mouse leaves a row or the table as well.
    #hideNodeHighlight() {
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
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
        this.#adIframeOwners.clear();
        this.#fetchingOwners.clear();
        this.#ownerResolveRetries.clear();
        this.#unresolvedScriptIds.clear();
        this.#adScriptNodeData.length = 0;
        this.#urlToLinkElement.clear();
        this.#reconstructedProvenance.clear();
        this.requestUpdate();
    }
    performUpdate() {
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        const debuggerModel = target?.model(SDK.DebuggerModel.DebuggerModel);
        const subframeCounts = this.#computeSubframeCounts();
        const adFramesArray = [];
        for (const [frameId, frame] of this.#adFrames) {
            // The table displays the resolved ID, or an <unnamed> placeholder if the
            // element lacks an ID attribute, or an empty string while pending.
            const ownerNode = this.#adIframeOwners.get(frameId);
            const elementIdText = ownerNode !== undefined ? (ownerNode?.getAttribute('id') || i18nString(UIStrings.unnamed)) : '';
            adFramesArray.push({
                frameId,
                elementId: elementIdText,
                ownerNode: ownerNode ?? null,
                initialOrigin: frame.initialOrigin || '',
                cpuTime: formatCpu(frame.cpuTime),
                rawCpuTime: frame.cpuTime ?? -1,
                networkBytes: formatNetwork(frame.networkBytes),
                rawNetworkBytes: frame.networkBytes ?? -1,
                subframeCount: subframeCounts.get(frameId) ?? 0,
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
            onAdFramesMouseLeave: () => this.#hideNodeHighlight(),
            onAdFrameContextMenu: (contextMenu, frameId) => this.#populateAdFrameContextMenu(contextMenu, frameId),
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
}
//# sourceMappingURL=AdsView.js.map
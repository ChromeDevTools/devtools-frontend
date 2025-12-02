// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import './CollapsibleAssistanceContentWidget.js';
import '../../../models/trace/insights/insights.js';
import '../../../panels/timeline/components/components.js';
import './PerformanceAgentFlameChart.js';
import * as Common from '../../../core/common/common.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Logs from '../../../models/logs/logs.js';
import * as NetworkTimeCalculator from '../../../models/network_time_calculator/network_time_calculator.js';
import * as Helpers from '../../../models/trace/helpers/helpers.js';
import * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as PanelsCommon from '../../common/common.js';
import * as Network from '../../network/network.js';
import * as Insights from '../../timeline/components/insights/insights.js';
import { MarkdownRendererWithCodeBlock } from './MarkdownRendererWithCodeBlock.js';
const { html } = Lit.StaticHtml;
const { ref, createRef } = Lit.Directives;
const INSIGHT_NAME_TO_COMPONENT = {
    Cache: Insights.Cache.Cache,
    CLSCulprits: Insights.CLSCulprits.CLSCulprits,
    DocumentLatency: Insights.DocumentLatency.DocumentLatency,
    DOMSize: Insights.DOMSize.DOMSize,
    DuplicatedJavaScript: Insights.DuplicatedJavaScript.DuplicatedJavaScript,
    FontDisplay: Insights.FontDisplay.FontDisplay,
    ForcedReflow: Insights.ForcedReflow.ForcedReflow,
    ImageDelivery: Insights.ImageDelivery.ImageDelivery,
    INPBreakdown: Insights.INPBreakdown.INPBreakdown,
    LCPDiscovery: Insights.LCPDiscovery.LCPDiscovery,
    LCPBreakdown: Insights.LCPBreakdown.LCPBreakdown,
    LegacyJavaScript: Insights.LegacyJavaScript.LegacyJavaScript,
    ModernHTTP: Insights.ModernHTTP.ModernHTTP,
    NetworkDependencyTree: Insights.NetworkDependencyTree.NetworkDependencyTree,
    RenderBlocking: Insights.RenderBlocking.RenderBlocking,
    SlowCSSSelector: Insights.SlowCSSSelector.SlowCSSSelector,
    ThirdParties: Insights.ThirdParties.ThirdParties,
    Viewport: Insights.Viewport.Viewport,
};
function renderInsight(insightName, model) {
    const componentClass = INSIGHT_NAME_TO_COMPONENT[insightName];
    if (!componentClass) {
        return Lit.nothing;
    }
    /* eslint-disable lit/binding-positions,lit/no-invalid-html */
    return html `<div><${componentClass.litTagName}
  .model=${model}
  .selected=${true}
  .isAIAssistanceContext=${true}>
  </${componentClass.litTagName}></div>`;
}
export class PerformanceAgentMarkdownRenderer extends MarkdownRendererWithCodeBlock {
    mainFrameId;
    lookupEvent;
    parsedTrace;
    constructor(mainFrameId = '', lookupEvent = () => null, parsedTrace = null) {
        super();
        this.mainFrameId = mainFrameId;
        this.lookupEvent = lookupEvent;
        this.parsedTrace = parsedTrace;
    }
    templateForToken(token) {
        // NOTE: The custom tag handling below (e.g., <ai-insight>, <network-request-widget>)
        // is part of a prototype for the GreenDev project and is only rendered when the GreenDev
        // feature is enabled.
        if (token.type === 'html' && Boolean(Root.Runtime.hostConfig.devToolsGreenDevUi?.enabled)) {
            if (token.text.includes('<flame-chart-widget')) {
                const startMatch = token.text.match(/start="?(\d+)"?/);
                const endMatch = token.text.match(/end="?(\d+)"?/);
                if (this.parsedTrace) {
                    const start = startMatch ? Number(startMatch[1]) : this.parsedTrace.data.Meta.traceBounds.min;
                    const end = endMatch ? Number(endMatch[1]) : this.parsedTrace.data.Meta.traceBounds.max;
                    return html `<devtools-performance-agent-flame-chart .data=${{
                        parsedTrace: this.parsedTrace,
                        start,
                        end,
                    }}
          }></devtools-performance-agent-flame-chart>`;
                }
            }
            // Flexible regex to match the tag name and a value a.
            // match[1]: tagName (e.g., 'ai-insight', 'network-request-widget')
            // match[2]: value (value needed to display the widget)
            const regex = /<([a-z-]+)\s+value="([^"]+)">/;
            const match = token.text.match(regex);
            if (!match) {
                return null;
            }
            const tagName = match[1];
            const value = match[2];
            if (tagName === 'ai-insight' && value) {
                const componentName = value;
                const insightSet = this.parsedTrace?.insights?.values().next().value;
                const insightM = insightSet?.model[componentName];
                if (!insightM) {
                    return null;
                }
                return html `<devtools-collapsible-assistance-content-widget  .data=${{
                    headerText: 'Insight'
                }}>
        ${renderInsight(componentName, insightM)}
        </devtools-collapsible-assistance-content-widget>`;
            }
            if (tagName === 'network-request-widget' && value) {
                const rawTraceEvent = Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager().getRawTraceEvents().at(Number(value));
                // Rendering RequestTimingView widget only works for fresh traces where the network log is in sync.
                // If the trace is uploaded, we need to use the synthetic events and
                // render the network request tooltip that uses the synthetic events.
                if (rawTraceEvent && Trace.Types.Events.isSyntheticNetworkRequest(rawTraceEvent)) {
                    const rawTraceEventId = rawTraceEvent?.args?.data?.requestId;
                    const rawTraceEventUrl = rawTraceEvent?.args?.data?.url;
                    const networkRequest = rawTraceEvent ? Logs.NetworkLog.NetworkLog.instance()
                        .requestsForId(rawTraceEventId)
                        .find(r => r.url() === rawTraceEventUrl) :
                        null;
                    if (networkRequest) {
                        const calculator = new NetworkTimeCalculator.NetworkTimeCalculator(true);
                        return html `<devtools-collapsible-assistance-content-widget
            .data=${{
                            headerText: 'Network Request'
                        }}>
            <devtools-widget class="actions" .widgetConfig=${UI.Widget.widgetConfig(Network.RequestTimingView.RequestTimingView, {
                            request: networkRequest,
                            calculator,
                        })}></devtools-widget>
            </devtools-collapsible-assistance-content-widget>`;
                    }
                }
                const syntheticRequest = Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager().syntheticEventForRawEventIndex(Number(value));
                let networkTooltip = null;
                if (syntheticRequest && Trace.Types.Events.isSyntheticNetworkRequest(syntheticRequest)) {
                    networkTooltip = html `<devtools-performance-network-request-tooltip
              .data=${{
                        networkRequest: syntheticRequest, entityMapper: null
                    }}
            ></devtools-performance-network-request-tooltip>`;
                }
                return html `<devtools-collapsible-assistance-content-widget
        .data=${{
                    headerText: 'Network Request'
                }}>
          ${networkTooltip}
          </devtools-collapsible-assistance-content-widget>`;
            }
            return null;
        }
        if (token.type === 'link' && token.href.startsWith('#')) {
            if (token.href.startsWith('#node-')) {
                const nodeId = Number(token.href.replace('#node-', ''));
                const templateRef = createRef();
                void this.#linkifyNode(nodeId, token.text).then(node => {
                    if (!templateRef.value || !node) {
                        return;
                    }
                    templateRef.value.textContent = '';
                    templateRef.value.append(node);
                });
                return html `<span ${ref(templateRef)}>${token.text}</span>`;
            }
            const event = this.lookupEvent(token.href.slice(1));
            if (!event) {
                return html `${token.text}`;
            }
            let label = token.text;
            let title = '';
            if (Trace.Types.Events.isSyntheticNetworkRequest(event)) {
                title = event.args.data.url;
            }
            else {
                label += ` (${event.name})`;
            }
            // eslint-disable-next-line @devtools/no-a-tags-in-lit
            return html `<a href="#" draggable=false .title=${title} @click=${(e) => {
                e.stopPropagation();
                void Common.Revealer.reveal(new SDK.TraceObject.RevealableEvent(event));
            }}>${label}</a>`;
        }
        return super.templateForToken(token);
    }
    // Taken from front_end/panels/timeline/components/insights/NodeLink.ts
    // Would be nice to move the above component to somewhere that allows the AI
    // Assistance panel to also use it.
    async #linkifyNode(backendNodeId, label) {
        if (backendNodeId === undefined) {
            return;
        }
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        const domModel = target?.model(SDK.DOMModel.DOMModel);
        if (!domModel) {
            return undefined;
        }
        const domNodesMap = await domModel.pushNodesByBackendIdsToFrontend(new Set([backendNodeId]));
        const node = domNodesMap?.get(backendNodeId);
        if (!node) {
            return;
        }
        if (node.frameId() !== this.mainFrameId) {
            return;
        }
        const linkedNode = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(node, { textContent: label });
        return linkedNode;
    }
}
//# sourceMappingURL=PerformanceAgentMarkdownRenderer.js.map
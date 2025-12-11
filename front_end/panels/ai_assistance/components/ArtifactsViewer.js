// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import './CollapsibleAssistanceContentWidget.js';
import './PerformanceAgentFlameChart.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as Logs from '../../../models/logs/logs.js';
import * as NetworkTimeCalculator from '../../../models/network_time_calculator/network_time_calculator.js';
import * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as Network from '../../network/network.js';
import * as Insights from '../../timeline/components/insights/insights.js';
import artifactsViewerStyles from './artifactsViewer.css.js';
const { html, render } = Lit;
export function renderArtifact(artifact, parsedTrace) {
    switch (artifact.type) {
        // clang-format off
        case 'insight': {
            const insightRenderer = new Insights.InsightRenderer.InsightRenderer();
            const componentName = artifact.insightType;
            const insightSet = parsedTrace.insights?.values().next().value;
            const insightModel = insightSet?.model[componentName];
            if (!insightModel) {
                return Lit.nothing;
            }
            return html `
        <devtools-collapsible-assistance-content-widget .data=${{ headerText: `Insight - ${componentName}` }}>
          ${insightRenderer.renderInsightToWidgetElement(parsedTrace, insightSet, insightModel, componentName, {
                selected: true,
                isAIAssistanceContext: true,
            })}
        </devtools-collapsible-assistance-content-widget>`;
        }
        case 'network-request': {
            const networkRequest = artifact.request;
            if ('args' in networkRequest && Trace.Types.Events.isSyntheticNetworkRequest(networkRequest)) {
                const calculator = new NetworkTimeCalculator.NetworkTimeCalculator(true);
                const sdkRequest = Logs.NetworkLog.NetworkLog.instance()
                    .requestsForId(networkRequest.args.data.requestId)
                    .find(r => r.url() === networkRequest.args.data.url) ??
                    null;
                if (!sdkRequest) {
                    return Lit.nothing;
                }
                return html `
        <devtools-collapsible-assistance-content-widget
          .data=${{ headerText: `Network Request: ${sdkRequest.url().length > 80 ? sdkRequest.url().slice(0, 80) + '...' : sdkRequest.url()}` }}>
          <devtools-widget class="actions" .widgetConfig=${UI.Widget.widgetConfig(Network.RequestTimingView.RequestTimingView, {
                    request: sdkRequest,
                    calculator,
                })}></devtools-widget>
        </devtools-collapsible-assistance-content-widget>`;
            }
            return Lit.nothing;
        }
        case 'flamechart': {
            return html `
        <devtools-collapsible-assistance-content-widget .data=${{ headerText: `Flamechart` }}>
          <devtools-performance-agent-flame-chart .data=${{
                parsedTrace,
                start: artifact.start,
                end: artifact.end,
            }}>
          </devtools-performance-agent-flame-chart>
        </devtools-collapsible-assistance-content-widget>`;
        }
        default:
            return Lit.nothing;
        // clang-format on
    }
}
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
      <style>${artifactsViewerStyles}</style>
      <div class="artifacts-viewer">
        ${input.artifacts.map(artifact => renderArtifact(artifact, input.parsedTrace))}
      </div>
    `, target);
    // clang-format on
};
export class ArtifactsViewer extends UI.Widget.Widget {
    #view;
    #parsedTrace;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
        this.#parsedTrace = null;
    }
    wasShown() {
        super.wasShown();
        AiAssistanceModel.ArtifactsManager.ArtifactsManager.instance().addEventListener(AiAssistanceModel.ArtifactsManager.ArtifactAddedEvent.eventName, () => {
            if (this.#parsedTrace) {
                this.performUpdate();
            }
        });
        UI.Context.Context.instance().addFlavorChangeListener(AiAssistanceModel.AIContext.AgentFocus, ({ data }) => {
            this.#parsedTrace = data.parsedTrace;
            if (this.#parsedTrace) {
                this.performUpdate();
            }
        });
        const focus = UI.Context.Context.instance().flavor(AiAssistanceModel.AIContext.AgentFocus);
        if (focus) {
            this.#parsedTrace = focus.parsedTrace;
            this.performUpdate();
        }
    }
    performUpdate() {
        if (!this.#parsedTrace) {
            return;
        }
        this.#view({
            artifacts: AiAssistanceModel.ArtifactsManager.ArtifactsManager.instance().artifacts,
            parsedTrace: this.#parsedTrace,
        }, {}, this.contentElement);
    }
}
//# sourceMappingURL=ArtifactsViewer.js.map
import './CollapsibleAssistanceContentWidget.js';
import './PerformanceAgentFlameChart.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
export interface ViewInput {
    artifacts: AiAssistanceModel.ArtifactsManager.Artifact[];
    parsedTrace: Trace.TraceModel.ParsedTrace;
}
export declare function renderArtifact(artifact: AiAssistanceModel.ArtifactsManager.Artifact, parsedTrace: Trace.TraceModel.ParsedTrace): Lit.LitTemplate;
export declare const DEFAULT_VIEW: (input: ViewInput, _output: Record<string, unknown>, target: HTMLElement) => void;
export type View = typeof DEFAULT_VIEW;
export declare class ArtifactsViewer extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: (input: ViewInput, _output: Record<string, unknown>, target: HTMLElement) => void);
    wasShown(): void;
    performUpdate(): void;
}

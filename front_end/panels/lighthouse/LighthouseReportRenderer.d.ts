import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as LighthouseModel from '../../models/lighthouse/lighthouse.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface NodeDetailsViewInput {
    type: 'node';
    node: SDK.DOMModel.DOMNode;
    snippet?: string;
}
export interface SourceLocationViewInput {
    type: 'source-location';
    url: Platform.DevToolsPath.UrlString;
    lineNumber: number;
    columnNumber: number;
}
export interface ReportViewInput {
    type: 'report';
    report: LighthouseModel.ReporterTypes.ReportJSON | null;
    darkMode: boolean;
    onViewTrace?: () => Promise<void>;
    onSaveFileOverride: (blob: Blob) => Promise<void>;
    onPrintOverride: (rootEl: HTMLElement) => Promise<void>;
    getStandaloneReportHTML: () => string;
}
export type ViewInput = NodeDetailsViewInput | SourceLocationViewInput | ReportViewInput;
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
interface RenderReportOpts {
    beforePrint?: () => void;
    afterPrint?: () => void;
}
export declare class LighthouseReportRenderer extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    get report(): LighthouseModel.ReporterTypes.ReportJSON | null;
    set report(report: LighthouseModel.ReporterTypes.ReportJSON | null);
    set artifacts(artifacts: LighthouseModel.ReporterTypes.RunnerResultArtifacts | undefined);
    set beforePrint(beforePrint: (() => void) | undefined);
    set afterPrint(afterPrint: (() => void) | undefined);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
    static renderLighthouseReport(lhr: LighthouseModel.ReporterTypes.ReportJSON, artifacts?: LighthouseModel.ReporterTypes.RunnerResultArtifacts, opts?: RenderReportOpts): HTMLElement;
    /**
     * Renders only the score gauges component of the Lighthouse report, stripping out
     * topbar, categories, and footer. Used by the Lighthouse report walkthrough widget.
     *
     * The Lighthouse renderer places the gauges differently depending on the number of categories:
     * - Multiple categories: a `.lh-scores-header` row at the top holds one gauge per category.
     * - Single category: the renderer skips `.lh-scores-header`, so the only gauge is the one in the
     *   category's own section heading (`.lh-category-header .lh-score__gauge`).
     *
     * Returns null if neither element exists. This happens for single-category performance reports in
     * navigation mode, because the Lighthouse performance renderer replaces `.lh-score__gauge` in its
     * section heading with a larger animated gauge, which this widget does not use.
     */
    static renderLighthouseScores(lhr: LighthouseModel.ReporterTypes.ReportJSON): HTMLElement | null;
    static unlinkNodeDetails(el: Element): void;
    static linkifyNodeDetails(el: Element, view?: View, signal?: AbortSignal): Promise<void>;
    static linkifySourceLocationDetails(el: Element, view?: View): Promise<void>;
    static installVisualLogging(el: Element): void;
}
export {};

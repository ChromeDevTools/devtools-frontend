import type * as LighthouseModel from '../../models/lighthouse/lighthouse.js';
interface RenderReportOpts {
    beforePrint?: () => void;
    afterPrint?: () => void;
}
export declare class LighthouseReportRenderer {
    static renderLighthouseReport(lhr: LighthouseModel.ReporterTypes.ReportJSON, artifacts?: LighthouseModel.ReporterTypes.RunnerResultArtifacts, opts?: RenderReportOpts): HTMLElement;
    /**
     * Renders only the score gauges component of the Lighthouse report, stripping out
     * topbar, categories, and footer. Used by the Lighthouse report walkthrough widget.
     */
    static renderLighthouseScores(lhr: LighthouseModel.ReporterTypes.ReportJSON): HTMLElement | null;
    static waitForMainTargetLoad(): Promise<void>;
    static linkifyNodeDetails(el: Element): Promise<void>;
    static linkifySourceLocationDetails(el: Element): Promise<void>;
    static installVisualLogging(el: Element): void;
}
export {};

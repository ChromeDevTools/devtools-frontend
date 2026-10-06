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
    static waitForMainTargetLoad(): Promise<void>;
    static linkifyNodeDetails(el: Element): Promise<void>;
    static linkifySourceLocationDetails(el: Element): Promise<void>;
    static installVisualLogging(el: Element): void;
}
export {};

import type * as LHModel from '../../lighthouse/lighthouse.js';
/**
 * A formatter that takes a raw Lighthouse report JSON and creates a markdown
 * summary for an AI Agent.
 */
export declare class LighthouseFormatter {
    /**
     * Returns an overall summary and high-level overview of the Lighthouse report.
     */
    summary(report: LHModel.ReporterTypes.ReportJSON): string;
    /**
     * Returns a markdown list of all audits in a given category.
     * Highlight failing audits (score < 90).
     */
    audits(report: LHModel.ReporterTypes.ReportJSON, categoryId: LHModel.RunTypes.CategoryId): string;
}

import type * as LighthouseModel from '../../models/lighthouse/lighthouse.js';
interface RenderReportOpts {
    beforePrint?: () => void;
    afterPrint?: () => void;
}
export declare class LighthouseReportRenderer {
    static renderLighthouseReport(lhr: LighthouseModel.ReporterTypes.ReportJSON, artifacts?: LighthouseModel.ReporterTypes.RunnerResultArtifacts, opts?: RenderReportOpts): HTMLElement;
    static waitForMainTargetLoad(): Promise<void>;
    static linkifyNodeDetails(el: Element): Promise<void>;
    static linkifySourceLocationDetails(el: Element): Promise<void>;
    static installVisualLogging(el: Element): void;
}
export {};

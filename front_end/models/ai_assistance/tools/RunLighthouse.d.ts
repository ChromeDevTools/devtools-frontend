import * as Host from '../../../core/host/host.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import type { LighthouseCategoryArg } from '../data_formatters/LighthouseFormatter.js';
import { type BaseToolCapability, type ContextHandlerResult, type ContextTool, type LighthouseRecordingCapability, type ToolArgs, ToolName } from './Tool.js';
export interface RunLighthouseArgs extends ToolArgs {
    explanation: string;
    categoryId: LighthouseCategoryArg;
    mode?: LHModel.RunTypes.RunMode;
}
/**
 * Runs Lighthouse audits on the inspected page and sets the resulting report as the active conversation context.
 */
export declare class RunLighthouseTool implements ContextTool<RunLighthouseArgs, LHModel.ReporterTypes.ReportJSON, BaseToolCapability & LighthouseRecordingCapability> {
    readonly name: ToolName;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof RunLighthouseArgs>;
    displayInfoFromArgs(params: RunLighthouseArgs): {
        title: string;
        thought: string;
        action: string;
    };
    handler(params: RunLighthouseArgs, context: BaseToolCapability & LighthouseRecordingCapability): Promise<ContextHandlerResult<LHModel.ReporterTypes.ReportJSON>>;
}

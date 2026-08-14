import * as Host from '../../../core/host/host.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type LighthouseCapability, type ToolArgs, ToolName } from './Tool.js';
export interface RunLighthouseArgs extends ToolArgs {
    explanation: string;
    category: LHModel.RunTypes.CategoryId;
    mode?: LHModel.RunTypes.RunMode;
}
export declare class RunLighthouseTool implements DataTool<RunLighthouseArgs, {
    audits: string;
}, BaseToolCapability & LighthouseCapability> {
    readonly name = ToolName.RUN_LIGHTHOUSE;
    readonly description = "Runs Lighthouse audits on the active page. Supports \"navigation\" (for full initial page load audits), \"snapshot\" (for inspecting live in-page modifications without reload), and \"timespan\" (for interactions).";
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof RunLighthouseArgs>;
    displayInfoFromArgs(params: RunLighthouseArgs): {
        title: string;
        thought: string;
        action: string;
    };
    handler(params: RunLighthouseArgs, context: BaseToolCapability & LighthouseCapability): Promise<DataHandlerResult<{
        audits: string;
    }>>;
}

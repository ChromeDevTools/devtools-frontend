import * as Host from '../../../core/host/host.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type LighthouseRecordingCapability, type ToolArgs, ToolName } from './Tool.js';
export interface RunLighthouseArgs extends ToolArgs {
    explanation: string;
    categoryId: LHModel.RunTypes.CategoryId;
    mode?: LHModel.RunTypes.RunMode;
}
export declare class RunLighthouseTool implements DataTool<RunLighthouseArgs, {
    audits: string;
}, BaseToolCapability & LighthouseRecordingCapability> {
    readonly name: ToolName;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof RunLighthouseArgs>;
    displayInfoFromArgs(params: RunLighthouseArgs): {
        title: string;
        thought: string;
        action: string;
    };
    handler(params: RunLighthouseArgs, context: BaseToolCapability & LighthouseRecordingCapability): Promise<DataHandlerResult<{
        audits: string;
    }>>;
}

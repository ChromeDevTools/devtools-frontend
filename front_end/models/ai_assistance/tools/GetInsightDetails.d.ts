import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type PerformanceTraceCapability, type TargetCapability, type ToolArgs, ToolName } from './Tool.js';
export interface GetInsightDetailsArgs extends ToolArgs {
    insightSetId: string;
    insightName: string;
}
export declare class GetInsightDetailsTool implements DataTool<GetInsightDetailsArgs, string, BaseToolCapability & TargetCapability & PerformanceTraceCapability> {
    #private;
    readonly name: ToolName;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetInsightDetailsArgs>;
    displayInfoFromArgs(params: GetInsightDetailsArgs): {
        title: string;
        action: string;
    };
    handler(params: GetInsightDetailsArgs, capabilities: BaseToolCapability & TargetCapability & PerformanceTraceCapability): Promise<DataHandlerResult<string>>;
}

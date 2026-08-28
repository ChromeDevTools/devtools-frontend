import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type PerformanceTraceCapability, type ToolArgs, ToolName } from './Tool.js';
export interface GetTraceNetworkSummaryArgs extends ToolArgs {
    min?: number;
    max?: number;
}
export declare class GetTraceNetworkSummaryTool implements DataTool<GetTraceNetworkSummaryArgs, string, BaseToolCapability & PerformanceTraceCapability> {
    readonly name: ToolName;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetTraceNetworkSummaryArgs>;
    displayInfoFromArgs(params: GetTraceNetworkSummaryArgs): {
        title: string;
        action: string;
    };
    handler(params: GetTraceNetworkSummaryArgs, capabilities: BaseToolCapability & PerformanceTraceCapability): Promise<DataHandlerResult<string>>;
}

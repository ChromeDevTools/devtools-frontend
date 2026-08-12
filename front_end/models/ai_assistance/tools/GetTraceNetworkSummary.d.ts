import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type ToolArgs, ToolName } from './Tool.js';
export interface GetTraceNetworkSummaryArgs extends ToolArgs {
    min?: number;
    max?: number;
}
export declare class GetTraceNetworkSummaryTool implements DataTool<GetTraceNetworkSummaryArgs, string, BaseToolCapability> {
    readonly name = ToolName.GET_TRACE_NETWORK_SUMMARY;
    readonly description = "Returns a summary of the network requests for the given bounds.";
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetTraceNetworkSummaryArgs>;
    displayInfoFromArgs(params: GetTraceNetworkSummaryArgs): {
        title: string;
        action: string;
    };
    handler(params: GetTraceNetworkSummaryArgs, capabilities: BaseToolCapability): Promise<DataHandlerResult<string>>;
}

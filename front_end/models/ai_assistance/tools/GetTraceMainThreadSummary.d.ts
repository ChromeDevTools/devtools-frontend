import * as Host from '../../../core/host/host.js';
import { type MainThreadSectionLabel } from '../contexts/PerformanceTraceContext.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type ToolArgs, ToolName } from './Tool.js';
export interface GetTraceMainThreadSummaryArgs extends ToolArgs {
    label: MainThreadSectionLabel;
}
export declare class GetTraceMainThreadSummaryTool implements DataTool<GetTraceMainThreadSummaryArgs, string, BaseToolCapability> {
    readonly name = ToolName.GET_TRACE_MAIN_THREAD_SUMMARY;
    readonly description = "Returns a focused, detailed summary of the main thread for a predefined labeled period.";
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetTraceMainThreadSummaryArgs>;
    displayInfoFromArgs(params: GetTraceMainThreadSummaryArgs): {
        title: string;
        action: string;
    };
    handler(params: GetTraceMainThreadSummaryArgs, capabilities: BaseToolCapability): Promise<DataHandlerResult<string>>;
}

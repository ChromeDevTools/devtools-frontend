import * as Host from '../../../core/host/host.js';
import type { MainThreadSectionLabel } from '../contexts/PerformanceTraceContext.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type PerformanceTraceCapability, type ToolArgs, ToolName } from './Tool.js';
export interface GetTraceMainThreadSummaryArgs extends ToolArgs {
    label: MainThreadSectionLabel;
}
export declare class GetTraceMainThreadSummaryTool implements DataTool<GetTraceMainThreadSummaryArgs, string, BaseToolCapability & PerformanceTraceCapability> {
    readonly name: ToolName;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetTraceMainThreadSummaryArgs>;
    displayInfoFromArgs(params: GetTraceMainThreadSummaryArgs): {
        title: string;
        action: string;
    };
    handler(params: GetTraceMainThreadSummaryArgs, capabilities: BaseToolCapability & PerformanceTraceCapability): Promise<DataHandlerResult<string>>;
}

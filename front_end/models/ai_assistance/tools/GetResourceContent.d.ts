import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type PerformanceTraceCapability, type TargetCapability, type ToolArgs, ToolName } from './Tool.js';
export interface GetResourceContentArgs extends ToolArgs {
    url: string;
}
export declare class GetResourceContentTool implements DataTool<GetResourceContentArgs, {
    content: string;
}, BaseToolCapability & TargetCapability & PerformanceTraceCapability> {
    readonly name: ToolName;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetResourceContentArgs>;
    displayInfoFromArgs(params: GetResourceContentArgs): {
        title: string;
        action: string;
    };
    handler(params: GetResourceContentArgs, capabilities: BaseToolCapability & TargetCapability & PerformanceTraceCapability): Promise<DataHandlerResult<{
        content: string;
    }>>;
}

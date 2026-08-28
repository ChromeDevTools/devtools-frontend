import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type PerformanceTraceCapability, type ToolArgs, ToolName } from './Tool.js';
export interface GetFunctionCodeArgs extends ToolArgs {
    scriptUrl: string;
    line: number;
    column: number;
}
export declare class GetFunctionCodeTool implements DataTool<GetFunctionCodeArgs, string, BaseToolCapability & PerformanceTraceCapability> {
    readonly name: ToolName;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetFunctionCodeArgs>;
    displayInfoFromArgs(params: GetFunctionCodeArgs): {
        title: string;
        action: string;
    };
    handler(params: GetFunctionCodeArgs, capabilities: BaseToolCapability & PerformanceTraceCapability): Promise<DataHandlerResult<string>>;
}

import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type PerformanceTraceCapability, type ToolArgs, ToolName } from './Tool.js';
export interface GetTraceEventByKeyArgs extends ToolArgs {
    eventKey: string;
}
export declare class GetTraceEventByKeyTool implements DataTool<GetTraceEventByKeyArgs, string, BaseToolCapability & PerformanceTraceCapability> {
    readonly name: ToolName;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetTraceEventByKeyArgs>;
    displayInfoFromArgs(params: GetTraceEventByKeyArgs): {
        title: string;
        action: string;
    };
    handler(params: GetTraceEventByKeyArgs, capabilities: BaseToolCapability & PerformanceTraceCapability): Promise<DataHandlerResult<string>>;
}

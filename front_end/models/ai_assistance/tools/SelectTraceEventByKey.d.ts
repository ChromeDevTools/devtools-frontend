import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type PerformanceTraceCapability, type ToolArgs, ToolName } from './Tool.js';
export interface SelectTraceEventByKeyArgs extends ToolArgs {
    eventKey: string;
}
export declare class SelectTraceEventByKeyTool implements DataTool<SelectTraceEventByKeyArgs, string, BaseToolCapability & PerformanceTraceCapability> {
    readonly name: ToolName;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof SelectTraceEventByKeyArgs>;
    displayInfoFromArgs(params: SelectTraceEventByKeyArgs): {
        title: string;
        action: string;
    };
    handler(params: SelectTraceEventByKeyArgs, capabilities: BaseToolCapability & PerformanceTraceCapability): Promise<DataHandlerResult<string>>;
}

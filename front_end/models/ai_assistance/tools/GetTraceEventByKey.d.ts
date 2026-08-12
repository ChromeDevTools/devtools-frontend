import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type ToolArgs, ToolName } from './Tool.js';
export interface GetTraceEventByKeyArgs extends ToolArgs {
    eventKey: string;
}
export declare class GetTraceEventByKeyTool implements DataTool<GetTraceEventByKeyArgs, string, BaseToolCapability> {
    readonly name = ToolName.GET_TRACE_EVENT_BY_KEY;
    readonly description = "Get details for a specific trace event by its event key.";
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetTraceEventByKeyArgs>;
    displayInfoFromArgs(params: GetTraceEventByKeyArgs): {
        title: string;
        action: string;
    };
    handler(params: GetTraceEventByKeyArgs, capabilities: BaseToolCapability): Promise<DataHandlerResult<string>>;
}

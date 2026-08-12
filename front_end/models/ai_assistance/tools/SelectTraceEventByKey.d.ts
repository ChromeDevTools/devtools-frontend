import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type ToolArgs, ToolName } from './Tool.js';
export interface SelectTraceEventByKeyArgs extends ToolArgs {
    eventKey: string;
}
export declare class SelectTraceEventByKeyTool implements DataTool<SelectTraceEventByKeyArgs, string, BaseToolCapability> {
    readonly name = ToolName.SELECT_TRACE_EVENT_BY_KEY;
    readonly description = "Selects and reveals a specific event by its key in the Performance panel Flamechart.";
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof SelectTraceEventByKeyArgs>;
    displayInfoFromArgs(params: SelectTraceEventByKeyArgs): {
        title: string;
        action: string;
    };
    handler(params: SelectTraceEventByKeyArgs, capabilities: BaseToolCapability): Promise<DataHandlerResult<string>>;
}

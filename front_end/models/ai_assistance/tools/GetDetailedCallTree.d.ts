import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type ToolArgs, ToolName } from './Tool.js';
export interface GetDetailedCallTreeArgs extends ToolArgs {
    eventKey: string;
}
export declare class GetDetailedCallTreeTool implements DataTool<GetDetailedCallTreeArgs, string, BaseToolCapability> {
    readonly name = ToolName.GET_DETAILED_CALL_TREE;
    readonly description = "Returns a detailed call tree for the given main thread event.";
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetDetailedCallTreeArgs>;
    displayInfoFromArgs(params: GetDetailedCallTreeArgs): {
        title: string;
        action: string;
    };
    handler(params: GetDetailedCallTreeArgs, capabilities: BaseToolCapability): Promise<DataHandlerResult<string>>;
}

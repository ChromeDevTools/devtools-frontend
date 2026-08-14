import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type ToolArgs, ToolName } from './Tool.js';
export interface GetFunctionCodeArgs extends ToolArgs {
    scriptUrl: string;
    line: number;
    column: number;
}
export declare class GetFunctionCodeTool implements DataTool<GetFunctionCodeArgs, string, BaseToolCapability> {
    readonly name = ToolName.GET_FUNCTION_CODE;
    readonly description = "Returns the code for a function defined at the given location. The result is annotated with the runtime performance of each line of code.";
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetFunctionCodeArgs>;
    displayInfoFromArgs(params: GetFunctionCodeArgs): {
        title: string;
        action: string;
    };
    handler(params: GetFunctionCodeArgs, capabilities: BaseToolCapability): Promise<DataHandlerResult<string>>;
}

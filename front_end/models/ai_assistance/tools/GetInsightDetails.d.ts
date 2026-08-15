import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type TargetCapability, type ToolArgs, ToolName } from './Tool.js';
export interface GetInsightDetailsArgs extends ToolArgs {
    insightSetId: string;
    insightName: string;
}
export declare class GetInsightDetailsTool implements DataTool<GetInsightDetailsArgs, string, BaseToolCapability & TargetCapability> {
    #private;
    readonly name = ToolName.GET_INSIGHT_DETAILS;
    readonly description = "Returns detailed information about a specific insight of an insight set. Use this before commenting on any specific issue to get more information.";
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetInsightDetailsArgs>;
    displayInfoFromArgs(params: GetInsightDetailsArgs): {
        title: string;
        action: string;
    };
    handler(params: GetInsightDetailsArgs, capabilities: BaseToolCapability & TargetCapability): Promise<DataHandlerResult<string>>;
}

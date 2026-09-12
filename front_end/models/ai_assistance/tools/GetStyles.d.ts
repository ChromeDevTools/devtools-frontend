import * as Host from '../../../core/host/host.js';
import type { FunctionHandlerOptions } from '../agents/AiAgent.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type OriginLockCapability, type TargetCapability, type ToolArgs, ToolName } from './Tool.js';
export interface GetStylesArgs extends ToolArgs {
    elements: number[];
    styleProperties: string[];
    explanation: string;
}
export declare class GetStylesTool implements DataTool<GetStylesArgs, unknown, BaseToolCapability & TargetCapability & OriginLockCapability> {
    readonly name: ToolName;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetStylesArgs>;
    displayInfoFromArgs(params: GetStylesArgs): {
        title: string;
        thought: string;
        action: string;
    };
    /**
     * Handles the request to retrieve computed and authored CSS styles for specified elements.
     *
     * Resolves element backend node IDs using the primary page target and verifies that each
     * element's security origin matches the established origin lock before querying CSS models.
     */
    handler(params: GetStylesArgs, context: BaseToolCapability & TargetCapability & OriginLockCapability, _options?: FunctionHandlerOptions): Promise<DataHandlerResult<unknown>>;
}

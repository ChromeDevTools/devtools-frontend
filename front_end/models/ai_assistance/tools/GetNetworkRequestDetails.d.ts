import * as Host from '../../../core/host/host.js';
import * as Logs from '../../logs/logs.js';
import type { FunctionCallHandlerResult } from '../agents/AiAgent.js';
import { type BaseToolCapability, type OriginLockCapability, type Tool, type ToolArgs, ToolName } from './Tool.js';
export interface GetNetworkRequestDetailsArgs extends ToolArgs {
    id: string;
}
/**
 * A tool that retrieves detailed information about a specific network request.
 * The details include request/response headers, status code, timings, and the response body.
 */
export declare class GetNetworkRequestDetailsTool implements Tool<GetNetworkRequestDetailsArgs, unknown, BaseToolCapability & OriginLockCapability> {
    #private;
    readonly name = ToolName.GET_NETWORK_REQUEST_DETAILS;
    readonly description = "Retrieves the full headers, timing, status, and body details of a specific network request by ID.";
    constructor(networkLog?: Logs.NetworkLog.NetworkLog);
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetNetworkRequestDetailsArgs>;
    displayInfoFromArgs(args: GetNetworkRequestDetailsArgs): {
        title: string;
        action: string;
    };
    /**
     * Handles the request to retrieve details for a network request by its ID.
     * Filters by the conversation's established origin to prevent cross-origin data exposure.
     */
    handler(args: GetNetworkRequestDetailsArgs, context: BaseToolCapability & OriginLockCapability): Promise<FunctionCallHandlerResult<unknown>>;
}

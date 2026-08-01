import * as Host from '../../../core/host/host.js';
import * as Logs from '../../logs/logs.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type OriginLockCapability, ToolName } from './Tool.js';
/**
 * A tool that lists all network requests recorded by DevTools.
 * Filters the list by the conversation's established origin to prevent cross-origin data exposure.
 */
export declare class ListNetworkRequestsTool implements DataTool<Record<string, never>, unknown, BaseToolCapability & OriginLockCapability> {
    #private;
    readonly name = ToolName.LIST_NETWORK_REQUESTS;
    readonly description = "Gives a list of network requests including URL, status code, and duration.";
    constructor(networkLog?: Logs.NetworkLog.NetworkLog);
    readonly parameters: Host.AidaClient.FunctionObjectParam<never>;
    displayInfoFromArgs(): {
        title: string;
        action: string;
    };
    /**
     * Handles the request to list network requests.
     * Returns requests matching the conversation's established origin, if set.
     */
    handler(_params: Record<string, never>, context: BaseToolCapability & OriginLockCapability): Promise<DataHandlerResult<unknown>>;
}

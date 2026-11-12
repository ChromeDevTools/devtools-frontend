import * as Host from '../../../core/host/host.js';
import * as Logs from '../../logs/logs.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type OriginLockCapability, PermissionPrompt, ToolName } from './Tool.js';
/**
 * A tool that lists all network requests recorded by DevTools.
 * Returns a compact semicolon-delimited table of requests initiated by the conversation's established origin.
 */
export declare class ListNetworkRequestsTool implements DataTool<Record<string, never>, string, BaseToolCapability & OriginLockCapability> {
    #private;
    readonly name: ToolName;
    readonly permissionPrompt: PermissionPrompt;
    readonly description: string;
    constructor(networkLog?: Logs.NetworkLog.NetworkLog);
    readonly parameters: Host.AidaClient.FunctionObjectParam<never>;
    displayInfoFromArgs(): {
        title: string;
        action: string;
    };
    /**
     * Handles the request to list network requests.
     * Returns a compact semicolon-delimited table of requests initiated by the conversation's established origin.
     */
    handler(_params: Record<string, never>, context: BaseToolCapability & OriginLockCapability): Promise<DataHandlerResult<string>>;
}

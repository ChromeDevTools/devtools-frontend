import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type OriginLockCapability, ToolName } from './Tool.js';
export declare class ListPageOriginsTool implements DataTool<Record<string, never>, {
    origins: string[];
}, BaseToolCapability & OriginLockCapability> {
    readonly name = ToolName.LIST_PAGE_ORIGINS;
    readonly description = "Lists all active, non-empty frame origins loaded by the page. Use this first when generic category context is active to discover all page origins, then pass them to listCookies or listStorageKeys, unless the user's explicit request hints at focusing only on the primary page.";
    readonly parameters: Host.AidaClient.FunctionObjectParam<never>;
    displayInfoFromArgs(): {
        title: string;
        action: string;
    };
    /**
     * Retrieves the set of unique frame origins loaded within the primary page's target tree.
     *
     * To prevent data leakage across different tabs/windows, this tool:
     * 1. Restricts the frame search to those belonging to the `primaryPageTarget`'s outermost target tree.
     * 2. Filters out any origins that are not equivalent to the established allowed origin.
     *    Note: Under site isolation, frames may be hosted on different sub-targets or processes,
     *    so we check `frame.securityOrigin` directly instead of the frame's target origin.
     */
    handler(_args: Record<string, never>, context: BaseToolCapability & OriginLockCapability): Promise<DataHandlerResult<{
        origins: string[];
    }>>;
}

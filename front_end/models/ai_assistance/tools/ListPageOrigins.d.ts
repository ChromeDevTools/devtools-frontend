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
    handler(_args: Record<string, never>, context: BaseToolCapability & OriginLockCapability): Promise<DataHandlerResult<{
        origins: string[];
    }>>;
}

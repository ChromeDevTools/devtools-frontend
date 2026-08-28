import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type OriginLockCapability, type ServerLoggingCapability, ToolAnnotation, type ToolArgs, ToolName } from './Tool.js';
export interface ListStorageKeysArgs extends ToolArgs {
    type: 'localStorage' | 'sessionStorage';
    origins: string[];
    storageKey?: string;
}
export interface ListStorageKeysResult {
    storageKeysByOrigin: Record<string, {
        partitions: Array<{
            storageKey: string;
            keys: string[];
        }>;
    }>;
}
export declare class ListStorageKeysTool implements DataTool<ListStorageKeysArgs, ListStorageKeysResult, BaseToolCapability & OriginLockCapability & ServerLoggingCapability> {
    readonly name: ToolName;
    readonly description: string;
    readonly annotations: ToolAnnotation[];
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof ListStorageKeysArgs>;
    displayInfoFromArgs(args: ListStorageKeysArgs): {
        title: string;
        action: string;
    };
    handler(args: ListStorageKeysArgs, context: BaseToolCapability & OriginLockCapability & ServerLoggingCapability): Promise<DataHandlerResult<ListStorageKeysResult>>;
}

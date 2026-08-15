import * as Host from '../../../core/host/host.js';
import type { FunctionHandlerOptions } from '../agents/AiAgent.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type OriginLockCapability, type ServerLoggingCapability, ToolAnnotation, type ToolArgs, ToolName } from './Tool.js';
export declare const MAX_NUM_CHAR_LENGTH = 10000;
export interface GetStorageValuesArgs extends ToolArgs {
    type: 'localStorage' | 'sessionStorage';
    keys: string[];
    origins: string[];
    storageKey?: string;
}
export interface GetStorageValuesResult {
    storageValuesByOrigin: Record<string, {
        items: Array<{
            storageKey: string;
            values: Record<string, string>;
        }>;
    }>;
}
export declare class GetStorageValuesTool implements DataTool<GetStorageValuesArgs, GetStorageValuesResult, BaseToolCapability & OriginLockCapability & ServerLoggingCapability> {
    readonly name = ToolName.GET_STORAGE_VALUES;
    readonly description = "Retrieve specific string values from storage partitions for requested keys across origins.";
    readonly annotations: ToolAnnotation[];
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetStorageValuesArgs>;
    displayInfoFromArgs(args: GetStorageValuesArgs): {
        title: string;
        action: string;
    };
    handler(args: GetStorageValuesArgs, context: BaseToolCapability & OriginLockCapability & ServerLoggingCapability, options?: FunctionHandlerOptions): Promise<DataHandlerResult<GetStorageValuesResult>>;
}

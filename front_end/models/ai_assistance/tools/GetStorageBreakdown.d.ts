import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type OriginLockCapability, ToolName } from './Tool.js';
export interface StorageBreakdownEntry {
    storageType: string;
    usage: string;
}
export interface GetStorageBreakdownResult {
    usageBreakdown: StorageBreakdownEntry[];
}
export declare class GetStorageBreakdownTool implements DataTool<Record<string, never>, GetStorageBreakdownResult, BaseToolCapability & OriginLockCapability> {
    readonly name: ToolName;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<never>;
    displayInfoFromArgs(): {
        title: string;
        action: string;
    };
    handler(_args: Record<string, never>, context: BaseToolCapability & OriginLockCapability): Promise<DataHandlerResult<GetStorageBreakdownResult>>;
}

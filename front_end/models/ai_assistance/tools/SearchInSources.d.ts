import * as Host from '../../../core/host/host.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type { FunctionHandlerOptions } from '../agents/AiAgent.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type OriginLockCapability, type OriginLockState, PermissionPrompt, type ToolArgs, ToolName } from './Tool.js';
export interface SearchInSourcesArgs extends ToolArgs {
    query: string;
    id?: number | null;
    caseSensitive?: boolean | null;
}
/**
 * A tool that searches readable text source files in the workspace (or a single file by ID)
 * for a literal single-line substring, returning grouped `line;offset;preview` matches with
 * 0-based character offsets aligned to `getSourceContent`.
 */
export declare class SearchInSourcesTool implements DataTool<SearchInSourcesArgs, string, BaseToolCapability & OriginLockCapability> {
    readonly name: ToolName;
    readonly permissionPrompt: PermissionPrompt;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof SearchInSourcesArgs>;
    displayInfoFromArgs(args: SearchInSourcesArgs): {
        title: string;
        action: string;
    };
    handler(args: SearchInSourcesArgs, context: BaseToolCapability & OriginLockCapability, options?: FunctionHandlerOptions): Promise<DataHandlerResult<string>>;
}
export interface SearchSingleSourceOptions {
    id: number;
    query: string;
    caseSensitive: boolean;
    context: OriginLockCapability;
    originLock: OriginLockState;
    establishedOrigin: SDK.SecurityOrigin.SecurityOrigin;
    signal?: AbortSignal;
}
export interface SearchWorkspaceSourcesOptions {
    query: string;
    caseSensitive: boolean;
    context: OriginLockCapability;
    originLock: OriginLockState;
    establishedOrigin: SDK.SecurityOrigin.SecurityOrigin;
    signal?: AbortSignal;
}
/**
 * Searches a single registered source file by numeric ID, returning grouped
 * `line;offset;preview` matches with 0-based offsets aligned to `getSourceContent`.
 */
export declare function searchSingleSource(options: SearchSingleSourceOptions): Promise<DataHandlerResult<string>>;
/**
 * Searches all readable text workspace sources for the locked origin in bounded concurrent
 * chunks, prioritizing source-mapped files and skipping unloaded external source maps.
 */
export declare function searchWorkspaceSources(options: SearchWorkspaceSourcesOptions): Promise<DataHandlerResult<string>>;

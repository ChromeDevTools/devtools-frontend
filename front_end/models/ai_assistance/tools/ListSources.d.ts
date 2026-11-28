import * as Host from '../../../core/host/host.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as Workspace from '../../workspace/workspace.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type OriginLockCapability, type OriginLockState, PermissionPrompt, ToolName } from './Tool.js';
/**
 * A tool that lists readable text network source files in the workspace, excluding binary assets.
 * Each file is returned with its displayName and a unique session-based numeric ID.
 * The output is a semicolon-delimited list with an `id;name` header, plus an omitted-count footer when binary files are skipped.
 */
export declare class ListSourcesTool implements DataTool<Record<string, never>, string, BaseToolCapability & OriginLockCapability> {
    readonly name: ToolName;
    readonly permissionPrompt: PermissionPrompt;
    readonly description: string;
    static lastSourceId: number;
    static uiSourceCodeId: WeakMap<Workspace.UISourceCode.UISourceCode, number>;
    static idToUiSourceCode: Map<number, Workspace.UISourceCode.UISourceCode>;
    static reset(): void;
    /**
     * Registers a readable, non-opaque `UISourceCode` in the session ID map and returns its numeric ID (reusing an
     * existing ID if already registered). Intentionally omits origin-lock, ignore-list, and `Network`-project checks
     * so explicitly selected files can receive IDs; `getSourceById()` enforces the origin lock on every read. Rejects
     * opaque origins and binary files upfront so callers do not emit unusable IDs or retain them in the map.
     */
    static registerSource(uiSourceCode: Workspace.UISourceCode.UISourceCode): number | null;
    /**
     * Collects readable text network `UISourceCode`s allowed by the origin lock, skipping ignore-listed and binary files.
     * Returns the deduplicated files alongside the count of distinct omitted binary URLs that have no readable counterpart.
     */
    static getUISourceCodes(originLock: OriginLockState, workspace?: Workspace.Workspace.WorkspaceImpl): {
        files: Workspace.UISourceCode.UISourceCode[];
        omittedBinaryCount: number;
    };
    static getSourceById(id: number, originLock: OriginLockState): Workspace.UISourceCode.UISourceCode | undefined;
    readonly parameters: Host.AidaClient.FunctionObjectParam<never>;
    displayInfoFromArgs(): {
        title: string;
        action: string;
    };
    handler(_params: Record<string, never>, context: BaseToolCapability & OriginLockCapability): Promise<DataHandlerResult<string>>;
}
/**
 * Formats a source file name for the `listSources` and `searchInSources` outputs.
 *
 * `fullDisplayName()` already strips `https?://` for network files while keeping the host,
 * and decodes URI sequences (`%0D`, `%0A`) into raw `\r` and `\n`. Re-encode carriage returns
 * and newlines so filenames cannot break the line-delimited output.
 */
export declare function formatSourceName(file: Workspace.UISourceCode.UISourceCode, establishedOrigin: SDK.SecurityOrigin.SecurityOrigin): string;

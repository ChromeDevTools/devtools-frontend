import * as Host from '../../../core/host/host.js';
import * as Workspace from '../../workspace/workspace.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type OriginLockCapability, ToolName } from './Tool.js';
interface SourceSummary {
    id: number;
    name: string;
}
/**
 * A tool that lists all network source files in the workspace.
 * Each file is returned with its displayName and a unique session-based numeric ID.
 */
export declare class ListSourcesTool implements DataTool<Record<string, never>, {
    files: SourceSummary[];
}, BaseToolCapability & OriginLockCapability> {
    readonly name = ToolName.LIST_SOURCES;
    readonly description = "Lists all source files in the workspace with their name and a unique ID.";
    static lastSourceId: number;
    static uiSourceCodeId: WeakMap<Workspace.UISourceCode.UISourceCode, number>;
    static reset(): void;
    static getUISourceCodes(workspace?: Workspace.Workspace.WorkspaceImpl): Workspace.UISourceCode.UISourceCode[];
    readonly parameters: Host.AidaClient.FunctionObjectParam<never>;
    displayInfoFromArgs(): {
        title: string;
        action: string;
    };
    handler(_params: Record<string, never>, context: BaseToolCapability & OriginLockCapability): Promise<DataHandlerResult<{
        files: SourceSummary[];
    }>>;
}
export {};

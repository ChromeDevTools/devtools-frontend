import * as Bindings from '../../bindings/bindings.js';
import * as Logs from '../../logs/logs.js';
import type * as Workspace from '../../workspace/workspace.js';
/**
 * File that formats a file for the LLM usage.
 */
export declare class FileFormatter {
    #private;
    static formatSourceMapDetails(selectedFile: Workspace.UISourceCode.UISourceCode, debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding): string;
    constructor(file: Workspace.UISourceCode.UISourceCode, debuggerWorkspaceBinding?: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, networkLog?: Logs.NetworkLog.NetworkLog);
    formatFile(): string;
}

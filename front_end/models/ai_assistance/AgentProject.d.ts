import type * as Workspace from '../workspace/workspace.js';
export declare const enum ReplaceStrategy {
    FULL_FILE = "full",
    UNIFIED_DIFF = "unified"
}
/**
 * AgentProject wraps around a Workspace.Workspace.Project and
 * implements AI Assistance-specific logic for accessing workspace files
 * including additional checks and restrictions.
 */
export declare class AgentProject {
    #private;
    constructor(project: Workspace.Workspace.Project, options?: {
        maxFilesChanged: number;
        maxLinesChanged: number;
    });
    /**
     * Returns a list of files from the project that has been used for
     * processing.
     */
    getProcessedFiles(): string[];
    /**
     * Provides file names in the project to the agent.
     */
    getFiles(): string[];
    /**
     * Provides access to the file content in the working copy
     * of the matching UiSourceCode.
     */
    readFile(filepath: string): Promise<string | undefined>;
    /**
     * This method updates the file content in the working copy of the
     * UiSourceCode identified by the filepath.
     */
    writeFile(filepath: string, update: string, mode?: ReplaceStrategy): Promise<void>;
    getLinesChanged(currentContent: string | undefined, updatedContent: string): number;
    /**
     * This method searches in files for the agent and provides the
     * matches to the agent.
     */
    searchFiles(query: string, caseSensitive?: boolean, isRegex?: boolean, { signal }?: {
        signal?: AbortSignal;
    }): Promise<Array<{
        filepath: string;
        lineNumber: number;
        columnNumber: number;
        matchLength: number;
    }>>;
}

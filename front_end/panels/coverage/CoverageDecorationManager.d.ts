import type * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import type { CoverageInfo, CoverageModel } from './CoverageModel.js';
export declare const decoratorType = "coverage";
export declare class CoverageDecorationManager {
    #private;
    private coverageModel;
    private readonly textByProvider;
    private readonly uiSourceCodeByContentProvider;
    constructor(coverageModel: CoverageModel, workspace: Workspace.Workspace.WorkspaceImpl, debuggerBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, cssBinding: Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding);
    reset(): void;
    dispose(): void;
    update(updatedEntries: CoverageInfo[]): void;
    /**
     * Returns the coverage per line of the provided uiSourceCode. The resulting array has the same length
     * as the provided `lines` array.
     *
     * @param uiSourceCode The UISourceCode for which to get the coverage info.
     * @param lineMappings The caller might have applied formatting to the UISourceCode. Each entry
     *                     in this array represents one line and the range specifies where it's found in
     *                     the original content.
     */
    usageByLine(uiSourceCode: Workspace.UISourceCode.UISourceCode, lineMappings: TextUtils.TextRange.TextRange[]): Promise<Array<boolean | undefined>>;
    private updateTexts;
    private updateTextForProvider;
    private rawLocationsForSourceLocation;
    private static compareLocations;
    private onUISourceCodeAdded;
}
export interface RawLocation {
    id: string;
    contentProvider: TextUtils.ContentProvider.ContentProvider;
    line: number;
    column: number;
}

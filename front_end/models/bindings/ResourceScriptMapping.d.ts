import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';
import { type DebuggerSourceMapping, DebuggerWorkspaceBinding } from './DebuggerWorkspaceBinding.js';
export declare class ResourceScriptMapping implements DebuggerSourceMapping {
    #private;
    readonly debuggerModel: SDK.DebuggerModel.DebuggerModel;
    readonly debuggerWorkspaceBinding: DebuggerWorkspaceBinding;
    constructor(debuggerModel: SDK.DebuggerModel.DebuggerModel, workspace: Workspace.Workspace.WorkspaceImpl, debuggerWorkspaceBinding: DebuggerWorkspaceBinding);
    private project;
    uiSourceCodeForScript(script: SDK.Script.Script): Workspace.UISourceCode.UISourceCode | null;
    rawLocationToUILocation(rawLocation: SDK.DebuggerModel.Location): Workspace.UISourceCode.UILocation | null;
    uiLocationToRawLocations(uiSourceCode: Workspace.UISourceCode.UISourceCode, lineNumber: number, columnNumber: number): SDK.DebuggerModel.Location[];
    uiLocationRangeToRawLocationRanges(uiSourceCode: Workspace.UISourceCode.UISourceCode, { startLine, startColumn, endLine, endColumn }: TextUtils.TextRange.TextRange): SDK.DebuggerModel.LocationRange[] | null;
    private inspectedURLChanged;
    private addScript;
    scriptFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): ResourceScriptFile | null;
    private removeScripts;
    private executionContextDestroyed;
    private globalObjectCleared;
    resetForTest(): void;
    dispose(): void;
}
export declare class ResourceScriptFile extends Common.ObjectWrapper.ObjectWrapper<ResourceScriptFile.EventTypes> {
    #private;
    readonly uiSourceCode: Workspace.UISourceCode.UISourceCode;
    readonly script: SDK.Script.Script | null;
    constructor(resourceScriptMapping: ResourceScriptMapping, uiSourceCode: Workspace.UISourceCode.UISourceCode, script: SDK.Script.Script);
    private isDiverged;
    private workingCopyChanged;
    private workingCopyCommitted;
    scriptSourceWasSet(source: string, status: Protocol.Debugger.SetScriptSourceResponseStatus, exceptionDetails?: Protocol.Runtime.ExceptionDetails): Promise<void>;
    private update;
    private divergeFromVM;
    private mergeToVM;
    hasDivergedFromVM(): boolean;
    isDivergingFromVM(): boolean;
    isMergingToVM(): boolean;
    checkMapping(): void;
    private mappingCheckedForTest;
    dispose(): void;
    addSourceMapURL(sourceMapURL: Platform.DevToolsPath.UrlString): void;
    addDebugInfoURL(debugInfoURL: Platform.DevToolsPath.UrlString): void;
    hasSourceMapURL(): boolean;
    missingSymbolFiles(): Promise<SDK.DebuggerModel.MissingDebugFiles[] | null>;
}
export declare namespace ResourceScriptFile {
    const enum Events {
        DID_MERGE_TO_VM = "DidMergeToVM",
        DID_DIVERGE_FROM_VM = "DidDivergeFromVM"
    }
    interface EventTypes {
        [Events.DID_MERGE_TO_VM]: void;
        [Events.DID_DIVERGE_FROM_VM]: void;
    }
}

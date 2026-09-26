import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Plugin } from './Plugin.js';
export declare class DebuggerPlugin extends Plugin {
    #private;
    private readonly transformer;
    private editor;
    private executionLocation;
    private controlDown;
    private controlTimeout;
    private sourceMapInfobar;
    private readonly scriptsPanel;
    private readonly breakpointManager;
    private popoverHelper;
    private scriptFileForDebuggerModel;
    private breakpoints;
    private continueToLocations;
    private muted;
    private initializedMuted;
    private ignoreListInfobar;
    private refreshBreakpointsTimeout?;
    private activeBreakpointDialog;
    private missingDebugInfoBar;
    private readonly loader;
    private readonly ignoreListCallback;
    constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode, transformer: SourceFrame.SourceFrame.Transformer);
    editorExtension(): CodeMirror.Extension;
    private shortcutHandlers;
    editorInitialized(editor: TextEditor.TextEditor.TextEditor): void;
    static accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean;
    private showIgnoreListInfobarIfNeeded;
    attachInfobar(bar: UI.Infobar.Infobar): void;
    removeInfobar(bar: UI.Infobar.Infobar | null): void;
    private hideIgnoreListInfobar;
    willHide(): void;
    editBreakpointLocation({ breakpoint, uiLocation }: Breakpoints.BreakpointManager.BreakpointLocation): void;
    populateLineGutterContextMenu(contextMenu: UI.ContextMenu.ContextMenu, editorLineNumber: number): void;
    populateTextAreaContextMenu(contextMenu: UI.ContextMenu.ContextMenu): void;
    private workingCopyChanged;
    private workingCopyCommitted;
    private setMuted;
    private isIdentifier;
    private getPopoverRequest;
    private onEditorUpdate;
    private onWheel;
    private onKeyDown;
    private onMouseMove;
    private onMouseDown;
    private onBlur;
    private onKeyUp;
    private setControlDown;
    private editBreakpointCondition;
    private updateValueDecorations;
    private computeValueDecorations;
    private showContinueToLocations;
    private clearContinueToLocations;
    private asyncStepIn;
    private fetchBreakpoints;
    private lineBreakpoints;
    private linePossibleBreakpoints;
    private computeBreakpointDecoration;
    private restoreBreakpointsAfterEditing;
    private refreshBreakpoints;
    private breakpointChange;
    onInlineBreakpointMarkerClick(event: MouseEvent, breakpoint: Breakpoints.BreakpointManager.Breakpoint | null): void;
    onInlineBreakpointMarkerContextMenu(event: MouseEvent, breakpoint: Breakpoints.BreakpointManager.Breakpoint | null): void;
    private updateScriptFiles;
    private updateScriptFile;
    private updateMissingDebugInfoInfobar;
    private scriptHasSourceMap;
    private getSourceMapResource;
    private showSourceMapInfobarIfNeeded;
    private handleGutterClick;
    private toggleBreakpoint;
    private defaultBreakpointLocation;
    private createNewBreakpoint;
    private setBreakpoint;
    private breakpointWasSetForTest;
    private callFrameChanged;
    private setExecutionLocation;
    dispose(): void;
}
export declare class BreakpointLocationRevealer implements Common.Revealer.Revealer<Breakpoints.BreakpointManager.BreakpointLocation> {
    reveal(breakpointLocation: Breakpoints.BreakpointManager.BreakpointLocation, omitFocus?: boolean | undefined): Promise<void>;
}
export declare function getVariableNamesByLine(editorState: CodeMirror.EditorState, fromPos: number, toPos: number, currentPos: number, useOriginalScopes?: boolean): Array<{
    line: number;
    from: number;
    id: string;
}>;
export interface ScopeMapping {
    scopeStart: number;
    scopeEnd: number;
    variableMap: Map<string, SDK.RemoteObject.RemoteObject | null>;
}
/**
 * Caches the {@link ScopeMapping}s for the selected frame of a single {@link DebuggerPlugin}.
 *
 * The editor offsets in a {@link ScopeMapping} are derived from raw and UI locations, which describe
 * the committed script content. Once the user edits the file, these offsets no longer match the
 * editor content. So no mappings are handed out while the UISourceCode has unsaved edits.
 *
 * The cache is keyed on the DebuggableFrameFlavor rather than the SDK CallFrame: Re-translating a
 * frame (e.g. after a source map is attached) produces a new flavor for the same SDK CallFrame.
 */
export declare class ScopeMappingsCache {
    #private;
    constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode);
    /** @returns the (cached) scope mappings for `frame`, or `null` if the UISourceCode has unsaved edits. */
    get(frame: StackTrace.StackTrace.DebuggableFrameFlavor, compute: () => Promise<ScopeMapping[]>): Promise<ScopeMapping[]> | null;
    clear(): void;
}
export declare function computeScopeMappings(callFrame: SDK.DebuggerModel.CallFrame, rawLocationToEditorOffset: (l: SDK.DebuggerModel.Location | null) => Promise<number | null>, uiPositionToEditorOffset?: (line: number, column: number) => number | null, resolvedScopeChain?: SDK.DebuggerModel.ScopeChainEntry[]): Promise<ScopeMapping[]>;
export declare function findVariableInScopeMappings(name: string, pos: number, scopeMappings: ScopeMapping[]): {
    found: boolean;
    value: SDK.RemoteObject.RemoteObject | null;
};
export declare function getVariableValuesByLine(scopeMappings: ScopeMapping[], variableNames: Array<{
    line: number;
    from: number;
    id: string;
}>): Map<number, Map<string, SDK.RemoteObject.RemoteObject>> | null;
export declare function computePopoverHighlightRange(state: CodeMirror.EditorState, mimeType: string, cursorPos: number): {
    from: number;
    to: number;
    containsSideEffects: boolean;
} | null;
export declare function containsSideEffects(doc: CodeMirror.Text, root: CodeMirror.SyntaxNode): boolean;

import '../../ui/legacy/legacy.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as BreakpointManager from '../../models/breakpoints/breakpoints.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface BreakpointEditDialogResult {
    committed: boolean;
    condition: BreakpointManager.BreakpointManager.UserCondition;
    isLogpoint: boolean;
}
interface ViewInput {
    state: CodeMirror.EditorState;
    breakpointType: SDK.DebuggerModel.BreakpointType.LOGPOINT | SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT;
    editorLineNumber: number;
    onTypeChanged(breakpointType: SDK.DebuggerModel.BreakpointType): void;
    saveAndFinish(): void;
}
interface ViewOutput {
    editor: TextEditor.TextEditor.TextEditor | undefined;
}
type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class BreakpointEditDialog extends UI.Widget.Widget {
    #private;
    constructor(target?: HTMLElement, view?: View);
    get editorLineNumber(): number;
    set editorLineNumber(editorLineNumber: number);
    get oldCondition(): string;
    set oldCondition(oldCondition: string);
    get breakpointType(): SDK.DebuggerModel.BreakpointType;
    set breakpointType(breakpointType: SDK.DebuggerModel.BreakpointType.LOGPOINT | SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT);
    get onFinish(): (result: BreakpointEditDialogResult) => void;
    set onFinish(onFinish: (result: BreakpointEditDialogResult) => void);
    performUpdate(): void;
    finishEditing(committed: boolean, condition: string): void;
    saveAndFinish(): void;
}
export {};

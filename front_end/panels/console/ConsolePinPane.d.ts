import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface PaneViewInput {
    pins: ConsolePin[];
    focusOut: () => void;
    onRemove: (pin: ConsolePin) => void;
    onContextMenu: (event: Event) => void;
}
export declare const DEFAULT_PANE_VIEW: (input: PaneViewInput, _output: object, target: HTMLElement) => void;
export declare class ConsolePinPane extends UI.Widget.VBox {
    #private;
    constructor(focusOut: () => void, view?: (input: PaneViewInput, _output: object, target: HTMLElement) => void);
    willHide(): void;
    private contextMenuEventFired;
    private removeAllPins;
    removePin(pin: ConsolePin): void;
    addPin(expression: string, userGesture?: boolean): void;
    wasShown(): void;
    performUpdate(): void;
}
export interface ViewInput {
    expression: string;
    editorState: CodeMirror.EditorState;
    result: SDK.RuntimeModel.EvaluationResult | null;
    isEditing: boolean;
    onDelete: () => void;
    onPreviewHoverChange: (hovered: boolean) => void;
    onPreviewClick: (event: MouseEvent) => void;
}
export interface ViewOutput {
    deletePinIcon?: Buttons.Button.Button;
    editor?: TextEditor.TextEditor.TextEditor;
}
export declare const DEFAULT_VIEW: (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare class ConsolePinPresenter extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: (input: ViewInput, output: ViewOutput, target: HTMLElement) => void);
    wasShown(): void;
    willHide(): void;
    set pin(pin: ConsolePin);
    get pin(): ConsolePin | undefined;
    set focusOut(focusOut: () => void);
    set onRemove(onRemove: () => void);
    setHovered(hovered: boolean): void;
    focus(): Promise<void>;
    appendToContextMenu(contextMenu: UI.ContextMenu.ContextMenu): void;
    performUpdate(): void;
}
export declare class ConsolePinModel {
    #private;
    constructor(settings: Common.Settings.Settings);
    get pins(): ReadonlySet<ConsolePin>;
    add(expression: string): ConsolePin;
    remove(pin: ConsolePin): void;
    removeAll(): void;
    startPeriodicEvaluate(): void;
    stopPeriodicEvaluate(): void;
}
/**
 * Small helper interface to allow `ConsolePin` to retrieve the current working copy.
 */
interface ConsolePinEditor {
    workingCopy(): string;
    workingCopyWithHint(): string;
    isEditing(): boolean;
}
/**
 * A pinned console expression.
 */
export declare class ConsolePin extends Common.ObjectWrapper.ObjectWrapper<ConsolePinEvents> {
    #private;
    constructor(expression: string, onCommit: () => void);
    get expression(): string;
    get lastResult(): SDK.RuntimeModel.EvaluationResult | null;
    /** A short cut in case `lastResult` is a DOM node */
    get lastNode(): SDK.RemoteObject.RemoteObject | null;
    skipReleaseLastResult(): void;
    setEditor(editor: ConsolePinEditor): void;
    /**
     * Commit the current working copy from the editor.
     * @returns true, iff the working copy was commited as-is.
     */
    commit(): boolean;
    /** Evaluates the current working copy of the pinned expression. If the result is a DOM node, we return that separately for convenience.  */
    evaluate(executionContext: SDK.RuntimeModel.ExecutionContext): Promise<void>;
}
export declare const enum ConsolePinEvent {
    EVALUATE_RESULT_READY = "EVALUATE_RESULT_READY"
}
export interface ConsolePinEvents {
    [ConsolePinEvent.EVALUATE_RESULT_READY]: ConsolePin;
}
export {};

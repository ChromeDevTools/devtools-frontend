import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ClassItem {
    className: string;
    enabled: boolean;
}
export interface ViewInput {
    classes: ClassItem[];
    onCommit: () => void;
    /** Returns whether the prompt had text to discard, in which case the key event is fully consumed. */
    onCancel: () => boolean;
    onClick: (className: string, enabled: boolean) => void;
}
export interface ViewOutput {
    attachPrompt?: (prompt: UI.TextPrompt.TextPrompt) => void;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ClassesPaneWidget extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    private splitTextIntoClasses;
    private onCommit;
    /** Discards the prompt text and returns whether there was any non-whitespace text to discard. */
    private onCancel;
    private applyPromptText;
    private onTextChanged;
    private onDOMMutated;
    private onSelectedNodeChanged;
    wasShown(): void;
    performUpdate(): void;
    private onClick;
    private nodeClasses;
    private toggleClass;
    private installNodeClasses;
    private flushPendingClasses;
}
export declare class ButtonProvider implements UI.Toolbar.Provider {
    private readonly button;
    private view;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): ButtonProvider;
    private clicked;
    item(): UI.Toolbar.ToolbarToggle;
}
export declare class ClassNamePrompt extends UI.TextPrompt.TextPrompt {
    private readonly nodeClasses;
    private selectedFrameId;
    private classNamesPromise;
    constructor(nodeClasses: (arg0: SDK.DOMModel.DOMNode) => Map<string, boolean>);
    private getClassNames;
    private buildClassNameCompletions;
}

import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class ConsolePinPane extends UI.Widget.VBox {
    private readonly liveExpressionButton;
    private readonly focusOut;
    private pins;
    private readonly pinsSetting;
    private readonly throttler;
    constructor(liveExpressionButton: UI.Toolbar.ToolbarButton, focusOut: () => void);
    willHide(): void;
    savePins(): void;
    private contextMenuEventFired;
    private removeAllPins;
    removePin(pin: ConsolePinPresenter): void;
    addPin(expression: string, userGesture?: boolean): void;
    private focusedPinAfterDeletion;
    wasShown(): void;
    performUpdate(): Promise<void>;
    private updatedForTest;
}
export declare class ConsolePinPresenter {
    #private;
    private readonly pinPane;
    private readonly focusOut;
    private readonly pin;
    private readonly pinEditor;
    private readonly pinElement;
    private readonly pinPreview;
    private editor;
    private hovered;
    private lastNode;
    private deletePinIcon;
    constructor(expression: string, pinPane: ConsolePinPane, focusOut: () => void);
    setHovered(hovered: boolean): void;
    expression(): string;
    element(): Element;
    focus(): Promise<void>;
    appendToContextMenu(contextMenu: UI.ContextMenu.ContextMenu): void;
    updatePreview(): Promise<void>;
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
export declare class ConsolePin {
    #private;
    constructor(editor: ConsolePinEditor, expression: string);
    get expression(): string;
    get lastResult(): SDK.RuntimeModel.EvaluationResult | null;
    skipReleaseLastResult(): void;
    /**
     * Commit the current working copy from the editor.
     * @returns true, iff the working copy was commited as-is.
     */
    commit(): boolean;
    /** Evaluates the current working copy of the pinned expression. If the result is a DOM node, we return that separately for convenience.  */
    evaluate(executionContext: SDK.RuntimeModel.ExecutionContext): Promise<{
        result: SDK.RuntimeModel.EvaluationResult | null;
        node: SDK.RemoteObject.RemoteObject | null;
    }>;
}
export {};

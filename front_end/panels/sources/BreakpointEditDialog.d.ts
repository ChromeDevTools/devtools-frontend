import '../../ui/legacy/legacy.js';
import type * as BreakpointManager from '../../models/breakpoints/breakpoints.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface BreakpointEditDialogResult {
    committed: boolean;
    condition: BreakpointManager.BreakpointManager.UserCondition;
    isLogpoint: boolean;
}
export declare class BreakpointEditDialog extends UI.Widget.Widget {
    #private;
    private readonly onFinish;
    private finished;
    private editor;
    private readonly typeSelector;
    private placeholderCompartment;
    constructor(editorLineNumber: number, oldCondition: string, isLogpoint: boolean, onFinish: (result: BreakpointEditDialogResult) => void);
    saveAndFinish(): void;
    focusEditor(): void;
    private onTypeChanged;
    private get breakpointType();
    private getPlaceholder;
    private updateTooltip;
    finishEditing(committed: boolean, condition: string): void;
    get editorForTest(): TextEditor.TextEditor.TextEditor;
}

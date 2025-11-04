import '../../ui/legacy/legacy.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    selectedSourceCode: Workspace.UISourceCode.UISourceCode | null;
    onSelect(sourceCode: Workspace.UISourceCode.UISourceCode | null): void;
    workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ChangesView extends UI.Widget.VBox {
    #private;
    constructor(target?: HTMLElement, view?: View);
    performUpdate(): void;
    wasShown(): void;
    willHide(): void;
}
export {};

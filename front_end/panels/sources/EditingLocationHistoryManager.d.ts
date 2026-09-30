import * as Workspace from '../../models/workspace/workspace.js';
import type { TabbedEditorContainer } from './TabbedEditorContainer.js';
import type { UISourceCodeFrame } from './UISourceCodeFrame.js';
export declare const HistoryDepth = 20;
export declare class EditingLocationHistoryManager {
    private readonly editorContainer;
    private readonly entries;
    private current;
    private revealingCount;
    constructor(editorContainer: TabbedEditorContainer);
    trackSourceFrameCursorJumps(sourceFrame: UISourceCodeFrame): void;
    private onEditorUpdate;
    updateCurrentState(uiSourceCode: Workspace.UISourceCode.UISourceCode, position: number): void;
    private mapEntriesFor;
    private reveal;
    rollback(): void;
    rollover(): void;
    removeHistoryForSourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
}

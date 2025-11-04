import * as Workspace from '../../models/workspace/workspace.js';
import type * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Plugin } from './Plugin.js';
export declare class AiWarningInfobarPlugin extends Plugin {
    #private;
    constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode);
    dispose(): void;
    static accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean;
    editorInitialized(editor: TextEditor.TextEditor.TextEditor): void;
    attachInfobar(bar: UI.Infobar.Infobar): void;
    removeInfobar(bar: UI.Infobar.Infobar | null): void;
}

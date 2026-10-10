import type * as Workspace from '../../models/workspace/workspace.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import { type LitTemplate } from '../../ui/lit/lit.js';
import { Plugin } from './Plugin.js';
export declare class AiCodeCompletionPlugin extends Plugin {
    #private;
    aiCodeCompletionConfig: TextEditor.AiCodeCompletionProvider.AiCodeCompletionConfig;
    constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode);
    static accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean;
    dispose(): void;
    editorInitialized(editor: TextEditor.TextEditor.TextEditor): void;
    editorExtension(): CodeMirror.Extension;
    rightToolbarItems(): LitTemplate[];
}

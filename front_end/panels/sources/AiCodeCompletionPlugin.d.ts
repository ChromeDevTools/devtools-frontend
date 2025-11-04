import * as Host from '../../core/host/host.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as PanelCommon from '../common/common.js';
import { Plugin } from './Plugin.js';
export declare class AiCodeCompletionPlugin extends Plugin {
    #private;
    constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode);
    static accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean;
    dispose(): void;
    editorInitialized(editor: TextEditor.TextEditor.TextEditor): void;
    editorExtension(): CodeMirror.Extension;
    rightToolbarItems(): UI.Toolbar.ToolbarItem[];
    setAidaClientForTest(aidaClient: Host.AidaClient.AidaClient): void;
}
export declare function aiCodeCompletionTeaserExtension(teaser: PanelCommon.AiCodeCompletionTeaser): CodeMirror.Extension;

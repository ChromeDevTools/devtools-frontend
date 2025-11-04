import type * as Workspace from '../../models/workspace/workspace.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Plugin } from './Plugin.js';
export declare class SnippetsPlugin extends Plugin {
    static accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean;
    rightToolbarItems(): UI.Toolbar.ToolbarItem[];
    editorExtension(): CodeMirror.Extension;
}

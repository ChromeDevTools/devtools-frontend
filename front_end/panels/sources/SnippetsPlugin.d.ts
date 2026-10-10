import '../../ui/kit/kit.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import { type LitTemplate } from '../../ui/lit/lit.js';
import { Plugin } from './Plugin.js';
export declare class SnippetsPlugin extends Plugin {
    static accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean;
    rightToolbarItems(): LitTemplate[];
    editorExtension(): CodeMirror.Extension;
}

import type * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Plugin } from './Plugin.js';
export declare class ResourceOriginPlugin extends Plugin {
    #private;
    static accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean;
    rightToolbarItems(): UI.Toolbar.ToolbarItem[];
    dispose(): void;
}

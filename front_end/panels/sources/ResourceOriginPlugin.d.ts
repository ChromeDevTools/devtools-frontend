import type * as Workspace from '../../models/workspace/workspace.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Plugin } from './Plugin.js';
export declare class ResourceOriginPlugin extends Plugin {
    static accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean;
    rightToolbarItems(): UI.Toolbar.ToolbarItem[];
}
export declare const linkifier: Components.Linkifier.Linkifier;

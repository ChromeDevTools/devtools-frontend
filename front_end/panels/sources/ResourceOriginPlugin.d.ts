import type * as Workspace from '../../models/workspace/workspace.js';
import { type LitTemplate } from '../../ui/lit/lit.js';
import { Plugin } from './Plugin.js';
export declare class ResourceOriginPlugin extends Plugin {
    #private;
    static accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean;
    rightToolbarItems(): LitTemplate[];
    dispose(): void;
}

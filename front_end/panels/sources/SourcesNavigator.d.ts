import '../../ui/legacy/legacy.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type NavigatorUISourceCodeTreeNode, NavigatorView } from './NavigatorView.js';
export declare class NetworkNavigatorView extends NavigatorView {
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
        networkProjectManager?: Bindings.NetworkProject.NetworkProjectManager;
    }): NetworkNavigatorView;
    acceptProject(project: Workspace.Workspace.Project): boolean;
    onScopeChange(): void;
    private inspectedURLChanged;
    uiSourceCodeAdded(uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
}
export declare class FilesNavigatorView extends NavigatorView {
    #private;
    constructor(networkProjectManager?: Bindings.NetworkProject.NetworkProjectManager);
    wasShown(): void;
    willHide(): void;
    sourceSelected(uiSourceCode: Workspace.UISourceCode.UISourceCode, focusSource: boolean): void;
    acceptProject(project: Workspace.Workspace.Project): boolean;
    handleContextMenu(event: Event): void;
}
export declare class OverridesNavigatorView extends NavigatorView {
    private readonly toolbar;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
        networkProjectManager?: Bindings.NetworkProject.NetworkProjectManager;
    }): OverridesNavigatorView;
    private onProjectAddOrRemoved;
    private updateProjectAndUI;
    private updateUI;
    static setupNewWorkspace(): Promise<void>;
    sourceSelected(uiSourceCode: Workspace.UISourceCode.UISourceCode, focusSource: boolean): void;
    acceptProject(project: Workspace.Workspace.Project): boolean;
}
export declare class ContentScriptsNavigatorView extends NavigatorView {
    constructor(networkProjectManager?: Bindings.NetworkProject.NetworkProjectManager);
    acceptProject(project: Workspace.Workspace.Project): boolean;
}
export declare class SnippetsNavigatorView extends NavigatorView {
    constructor(networkProjectManager?: Bindings.NetworkProject.NetworkProjectManager);
    acceptProject(project: Workspace.Workspace.Project): boolean;
    handleContextMenu(event: Event): void;
    handleFileContextMenu(event: Event, node: NavigatorUISourceCodeTreeNode): void;
    private handleSaveAs;
    private addJSExtension;
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
}

import '../../ui/legacy/legacy.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type NavigatorUISourceCodeTreeNode, NavigatorView } from './NavigatorView.js';
export declare class NetworkNavigatorView extends NavigatorView {
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): NetworkNavigatorView;
    acceptProject(project: Workspace.Workspace.Project): boolean;
    onScopeChange(): void;
    private inspectedURLChanged;
    uiSourceCodeAdded(uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
}
export declare class FilesNavigatorView extends NavigatorView {
    #private;
    constructor();
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
    }): OverridesNavigatorView;
    private onProjectAddOrRemoved;
    private updateProjectAndUI;
    private updateUI;
    setupNewWorkspace(): Promise<void>;
    sourceSelected(uiSourceCode: Workspace.UISourceCode.UISourceCode, focusSource: boolean): void;
    acceptProject(project: Workspace.Workspace.Project): boolean;
}
export declare class ContentScriptsNavigatorView extends NavigatorView {
    constructor();
    acceptProject(project: Workspace.Workspace.Project): boolean;
}
export declare class SnippetsNavigatorView extends NavigatorView {
    constructor();
    acceptProject(project: Workspace.Workspace.Project): boolean;
    handleContextMenu(event: Event): void;
    handleFileContextMenu(event: Event, node: NavigatorUISourceCodeTreeNode): void;
    private handleSaveAs;
    private addJSExtension;
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
}

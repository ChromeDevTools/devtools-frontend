import '../../ui/kit/kit.js';
import '../../ui/legacy/legacy.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import { NavigatorView } from './NavigatorView.js';
export interface SourcesNavigatorViewOutput {
    navigatorView?: UI.Widget.WidgetElement<NavigatorView>;
}
export declare abstract class SourcesNavigatorView extends UI.Widget.VBox {
    protected readonly viewOutput: SourcesNavigatorViewOutput;
    protected readonly projectFilter: (project: Workspace.Workspace.Project) => boolean;
    constructor(element?: HTMLElement);
    protected get navigatorView(): NavigatorView | undefined;
    wasShown(): void;
    abstract acceptProject(project: Workspace.Workspace.Project): boolean;
    revealUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode, select?: boolean): void;
}
export interface NetworkNavigatorViewInput {
    projectFilter: (project: Workspace.Workspace.Project) => boolean;
    onUISourceCodeAdded: (uiSourceCode: Workspace.UISourceCode.UISourceCode) => void;
}
export type NetworkNavigatorViewFunc = (input: NetworkNavigatorViewInput, output: SourcesNavigatorViewOutput, target: HTMLElement) => void;
export declare const NETWORK_NAVIGATOR_DEFAULT_VIEW: NetworkNavigatorViewFunc;
export declare class NetworkNavigatorView extends SourcesNavigatorView {
    #private;
    constructor(element?: HTMLElement, view?: NetworkNavigatorViewFunc);
    static instance(opts?: {
        forceNew: boolean | null;
    }): NetworkNavigatorView;
    performUpdate(): Promise<void>;
    acceptProject(project: Workspace.Workspace.Project): boolean;
    onScopeChange(): void;
    uiSourceCodeAdded(uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
}
export interface FilesNavigatorViewInput {
    projectFilter: (project: Workspace.Workspace.Project) => boolean;
    showAutomaticFileSystemNudge: boolean;
    onContextMenu: (event: Event) => void;
    onSourceSelected: () => void;
}
export type FilesNavigatorViewFunc = (input: FilesNavigatorViewInput, output: SourcesNavigatorViewOutput, target: HTMLElement) => void;
export declare const FILES_NAVIGATOR_DEFAULT_VIEW: FilesNavigatorViewFunc;
export declare class FilesNavigatorView extends SourcesNavigatorView {
    #private;
    constructor(element?: HTMLElement, view?: FilesNavigatorViewFunc);
    wasShown(): void;
    willHide(): void;
    performUpdate(): Promise<void>;
    sourceSelected(): void;
    acceptProject(project: Workspace.Workspace.Project): boolean;
    handleContextMenu(event: Event): void;
}
export interface OverridesNavigatorViewInput {
    projectFilter: (project: Workspace.Workspace.Project) => boolean;
    hasProject: boolean;
    onSetupNewWorkspace: () => void;
    onClearConfiguration: () => void;
    onSourceSelected: () => void;
}
export type OverridesNavigatorViewFunc = (input: OverridesNavigatorViewInput, output: SourcesNavigatorViewOutput, target: HTMLElement) => void;
export declare const OVERRIDES_NAVIGATOR_DEFAULT_VIEW: OverridesNavigatorViewFunc;
export declare class OverridesNavigatorView extends SourcesNavigatorView {
    #private;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): OverridesNavigatorView;
    performUpdate(): Promise<void>;
    static setupNewWorkspace(): Promise<void>;
    sourceSelected(): void;
    acceptProject(project: Workspace.Workspace.Project): boolean;
}
export interface ContentScriptsNavigatorViewInput {
    projectFilter: (project: Workspace.Workspace.Project) => boolean;
}
export type ContentScriptsNavigatorViewFunc = (input: ContentScriptsNavigatorViewInput, output: SourcesNavigatorViewOutput, target: HTMLElement) => void;
export declare const CONTENT_SCRIPTS_NAVIGATOR_DEFAULT_VIEW: ContentScriptsNavigatorViewFunc;
export declare class ContentScriptsNavigatorView extends SourcesNavigatorView {
    #private;
    constructor(element?: HTMLElement, view?: ContentScriptsNavigatorViewFunc);
    performUpdate(): Promise<void>;
    acceptProject(project: Workspace.Workspace.Project): boolean;
}
export interface SnippetsNavigatorViewInput {
    projectFilter: (project: Workspace.Workspace.Project) => boolean;
    onNewSnippet: () => void;
    onContextMenu: (event: Event) => void;
}
export type SnippetsNavigatorViewFunc = (input: SnippetsNavigatorViewInput, output: SourcesNavigatorViewOutput, target: HTMLElement) => void;
export declare const SNIPPETS_NAVIGATOR_DEFAULT_VIEW: SnippetsNavigatorViewFunc;
export declare class SnippetsNavigatorView extends SourcesNavigatorView {
    #private;
    constructor(element?: HTMLElement, view?: SnippetsNavigatorViewFunc);
    performUpdate(): void;
    acceptProject(project: Workspace.Workspace.Project): boolean;
    handleContextMenu(event: Event): void;
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
}

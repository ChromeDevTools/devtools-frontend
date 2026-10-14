import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Workspace from '../../models/workspace/workspace.js';
import type * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import { DebuggerPausedMessage } from './DebuggerPausedMessage.js';
import { SourcesView } from './SourcesView.js';
import { UISourceCodeFrame } from './UISourceCodeFrame.js';
export interface ViewInput {
    isVertical: boolean;
    isNavigatorSidebarOpen: boolean;
    isDebuggerSidebarOpen: boolean;
    isTraceApp: boolean;
    navigatorTabbedPane: UI.TabbedPane.TabbedPane;
    sourcesView: SourcesView | null;
    debuggerPausedMessage: DebuggerPausedMessage;
    sidebarPaneStackWidget: UI.Widget.AnyWidget | null;
    debuggerSidebarTabbedPane: UI.TabbedPane.TabbedPane | null;
    onNavigatorSplitChange: (event: CustomEvent<string>) => void;
    onDebuggerSplitChange: (event: CustomEvent<string>) => void;
    onTerminateExecution: () => void;
    onLongResume: () => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class SourcesPanel extends UI.Panel.Panel implements UI.ContextMenu.Provider<Workspace.UISourceCode.UISourceCode | Workspace.UISourceCode.UILocation | SDK.RemoteObject.RemoteObject | SDK.NetworkRequest.NetworkRequest | UISourceCodeFrame>, SDK.TargetManager.Observer, UI.View.ViewLocationResolver {
    #private;
    private readonly workspace;
    private navigatorTabbedLocation;
    private readonly watchSidebarPane;
    private sidebarPaneStack?;
    private threadsSidebarPane;
    constructor(view?: View);
    performUpdate(): void;
    static instance(opts?: {
        forceNew: boolean | null;
    } | undefined): SourcesPanel;
    static updateResizerAndSidebarButtons(panel: SourcesPanel): void;
    static setShowSourcesViewInWrapper(panel: SourcesPanel, showInWrapper: boolean): void;
    targetAdded(_target: SDK.Target.Target): void;
    targetRemoved(_target: SDK.Target.Target): void;
    private showThreadsIfNeeded;
    paused(): boolean;
    wasShown(): void;
    willHide(): void;
    resolveLocation(locationName: string): UI.View.ViewLocation | null;
    ensureSourcesViewVisible(): boolean;
    onResize(): void;
    searchableView(): UI.SearchableView.SearchableView | null;
    toggleNavigatorSidebar(): void;
    toggleDebuggerSidebar(): void;
    get visibleView(): UI.Widget.Widget | null;
    showUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode, location?: SourceFrame.SourceFrame.RevealPosition, omitFocus?: boolean): Promise<void>;
    showUILocation(uiLocation: Workspace.UISourceCode.UILocation, omitFocus?: boolean): Promise<void>;
    revealInNavigator(uiSourceCode: Workspace.UISourceCode.UISourceCode, skipReveal?: boolean): Promise<void>;
    updateLastModificationTime(): void;
    private updateDebuggerButtonsAndStatusForTest;
    runSnippet(): void;
    handleBeforeUnload: (event: Event) => void;
    togglePause(): boolean;
    stepOver(): boolean;
    stepInto(): boolean;
    stepIntoAsync(): boolean;
    stepOut(): boolean;
    toggleBreakpointsActive(): void;
    appendApplicableItems(event: Event, contextMenu: UI.ContextMenu.ContextMenu, target: Workspace.UISourceCode.UISourceCode | Workspace.UISourceCode.UILocation | SDK.RemoteObject.RemoteObject | SDK.NetworkRequest.NetworkRequest | UISourceCodeFrame): void;
    appendUILocationItems(contextMenu: UI.ContextMenu.ContextMenu, uiLocation: Workspace.UISourceCode.UILocation): void;
    private showFunctionDefinition;
    setAsCurrentPanel(): Promise<void>;
    sourcesView(): SourcesView;
}
export declare const lastModificationTimeout = 200;
export declare const minToolbarWidth = 215;
export declare class UILocationRevealer implements Common.Revealer.Revealer<Workspace.UISourceCode.UILocation> {
    reveal(uiLocation: Workspace.UISourceCode.UILocation, omitFocus?: boolean): Promise<void>;
}
export declare class UILocationRangeRevealer implements Common.Revealer.Revealer<Workspace.UISourceCode.UILocationRange> {
    #private;
    static instance(opts?: {
        forceNew: boolean;
    }): UILocationRangeRevealer;
    reveal(uiLocationRange: Workspace.UISourceCode.UILocationRange, omitFocus?: boolean): Promise<void>;
}
export declare class DebuggerLocationRevealer implements Common.Revealer.Revealer<SDK.DebuggerModel.Location> {
    reveal(rawLocation: SDK.DebuggerModel.Location, omitFocus?: boolean): Promise<void>;
}
export declare class UISourceCodeRevealer implements Common.Revealer.Revealer<Workspace.UISourceCode.UISourceCode> {
    reveal(uiSourceCode: Workspace.UISourceCode.UISourceCode, omitFocus?: boolean): Promise<void>;
}
export declare class DebuggerPausedDetailsRevealer implements Common.Revealer.Revealer<SDK.DebuggerModel.DebuggerPausedDetails> {
    reveal(_object: SDK.DebuggerModel.DebuggerPausedDetails): Promise<void>;
}
export declare class RevealingActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(context: UI.Context.Context, actionId: string): boolean;
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(context: UI.Context.Context, actionId: string): boolean;
}
export interface QuickSourceViewInput {
    sourcesView: SourcesView | null;
}
export type QuickSourceViewFunc = (input: QuickSourceViewInput, output: undefined, target: HTMLElement) => void;
export declare const QUICK_SOURCE_DEFAULT_VIEW: QuickSourceViewFunc;
export declare class QuickSourceView extends UI.Widget.VBox {
    #private;
    constructor(view?: QuickSourceViewFunc);
    performUpdate(): void;
    wasShown(): void;
    willHide(): void;
    showViewInWrapper(): void;
    hideViewInWrapper(): void;
}

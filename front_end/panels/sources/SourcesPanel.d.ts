import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Workspace from '../../models/workspace/workspace.js';
import type * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import { SourcesView } from './SourcesView.js';
import { UISourceCodeFrame } from './UISourceCodeFrame.js';
export declare class SourcesPanel extends UI.Panel.Panel implements UI.ContextMenu.Provider<Workspace.UISourceCode.UISourceCode | Workspace.UISourceCode.UILocation | SDK.RemoteObject.RemoteObject | SDK.NetworkRequest.NetworkRequest | UISourceCodeFrame>, SDK.TargetManager.Observer, UI.View.ViewLocationResolver {
    #private;
    private readonly workspace;
    private readonly togglePauseAction;
    private readonly stepOverAction;
    private readonly stepIntoAction;
    private readonly stepOutAction;
    private readonly stepAction;
    private readonly toggleBreakpointsActiveAction;
    private readonly debugToolbar;
    private readonly debugToolbarDrawer;
    private readonly debuggerPausedMessage;
    private overlayLoggables?;
    private splitWidget;
    editorView: UI.SplitWidget.SplitWidget;
    private navigatorTabbedLocation;
    private readonly toggleNavigatorSidebarButton;
    private readonly toggleDebuggerSidebarButton;
    private threadsSidebarPane;
    private readonly watchSidebarPane;
    private readonly callstackPane;
    private liveLocationPool;
    private lastModificationTime;
    private switchToPausedTargetTimeout?;
    private executionLineLocation?;
    private sidebarPaneStack?;
    private tabbedLocationHeader?;
    private extensionSidebarPanesContainer?;
    sidebarPaneView?: UI.Widget.VBox | UI.SplitWidget.SplitWidget;
    constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    } | undefined): SourcesPanel;
    static updateResizerAndSidebarButtons(panel: SourcesPanel): void;
    targetAdded(_target: SDK.Target.Target): void;
    targetRemoved(_target: SDK.Target.Target): void;
    private showThreadsIfNeeded;
    private setTarget;
    private onCurrentTargetChanged;
    paused(): boolean;
    wasShown(): void;
    willHide(): void;
    resolveLocation(locationName: string): UI.View.ViewLocation | null;
    ensureSourcesViewVisible(): boolean;
    onResize(): void;
    searchableView(): UI.SearchableView.SearchableView;
    toggleNavigatorSidebar(): void;
    toggleDebuggerSidebar(): void;
    private debuggerPaused;
    private debugInfoAttached;
    private showDebuggerPausedDetails;
    private maybeLogOverlayAction;
    private debuggerResumed;
    private debuggerWasEnabled;
    get visibleView(): UI.Widget.Widget | null;
    showUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode, location?: SourceFrame.SourceFrame.RevealPosition, omitFocus?: boolean): void;
    private showEditor;
    showUILocation(uiLocation: Workspace.UISourceCode.UILocation, omitFocus?: boolean): void;
    revealInNavigator(uiSourceCode: Workspace.UISourceCode.UISourceCode, skipReveal?: boolean): Promise<void>;
    private addExperimentMenuItem;
    private populateNavigatorMenu;
    updateLastModificationTime(): void;
    private executionLineChanged;
    private callFrameChanged;
    private updateDebuggerButtonsAndStatus;
    private updateDebuggerButtonsAndStatusForTest;
    private clearInterface;
    private switchToPausedTarget;
    runSnippet(): void;
    private editorSelected;
    togglePause(): boolean;
    private prepareToResume;
    private longResume;
    private terminateExecution;
    stepOver(): boolean;
    stepInto(): boolean;
    stepIntoAsync(): boolean;
    stepOut(): boolean;
    private continueToLocation;
    toggleBreakpointsActive(): void;
    private breakpointsActiveStateChanged;
    private createDebugToolbar;
    private createDebugToolbarDrawer;
    appendApplicableItems(event: Event, contextMenu: UI.ContextMenu.ContextMenu, target: Workspace.UISourceCode.UISourceCode | Workspace.UISourceCode.UILocation | SDK.RemoteObject.RemoteObject | SDK.NetworkRequest.NetworkRequest | UISourceCodeFrame): void;
    private appendUISourceCodeItems;
    private appendUISourceCodeFrameItems;
    appendUILocationItems(contextMenu: UI.ContextMenu.ContextMenu, uiLocation: Workspace.UISourceCode.UILocation): void;
    private appendRemoteObjectItems;
    private appendNetworkRequestItems;
    private showFunctionDefinition;
    private didGetFunctionDetails;
    private revealNavigatorSidebar;
    private revealDebuggerSidebar;
    private updateSidebarPosition;
    setAsCurrentPanel(): Promise<void>;
    private extensionSidebarPaneAdded;
    private addExtensionSidebarPane;
    sourcesView(): SourcesView;
    private handleDrop;
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
export declare class QuickSourceView extends UI.Widget.VBox {
    private readonly view;
    constructor();
    wasShown(): void;
    willHide(): void;
    showViewInWrapper(): void;
}

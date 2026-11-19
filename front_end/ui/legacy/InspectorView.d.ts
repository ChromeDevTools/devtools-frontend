import * as Common from '../../core/common/common.js';
import type { ActionDelegate as ActionDelegateInterface } from './ActionRegistration.js';
import type { Context } from './Context.js';
import type { ContextMenu } from './ContextMenu.js';
import { type InfobarAction, Type as InfobarType } from './Infobar.js';
import type { Panel } from './Panel.js';
import { SplitWidget } from './SplitWidget.js';
import { type TabbedPane, type TabbedPaneTabDelegate } from './TabbedPane.js';
import type { View as TabbedView, ViewLocation, ViewLocationResolver } from './View.js';
import { VBox, type Widget } from './Widget.js';
export declare enum DrawerOrientation {
    VERTICAL = "vertical",
    HORIZONTAL = "horizontal",
    UNSET = "unset"
}
export declare enum DockMode {
    BOTTOM = "bottom",
    SIDE = "side",// For LEFT and RIGHT
    UNDOCKED = "undocked"
}
export interface DrawerOrientationByDockMode {
    [DockMode.BOTTOM]: DrawerOrientation;
    [DockMode.SIDE]: DrawerOrientation;
    [DockMode.UNDOCKED]: DrawerOrientation;
}
export interface InfobarSpec {
    key: string;
    type: InfobarType;
    text: string;
    actions: InfobarAction[];
    disableSetting: Common.Settings.Setting<boolean> | null;
    jslogContext: string;
    onClose: () => void;
}
export interface ViewInput {
    infobars: readonly InfobarSpec[];
    isVerticalSplit: boolean;
    isDrawerOpen: boolean;
    statusBarVisible: boolean;
    onDrawerOpenChanged: (isOpen: boolean) => void;
}
export interface ViewOutput {
    attachSplitPanels?: (mainWidget: Widget, attachDrawer: (splitWidget: SplitWidget) => void) => void;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class InspectorView extends VBox implements ViewLocationResolver {
    #private;
    readonly tabbedPane: TabbedPane;
    constructor(element?: HTMLElement, view?: View);
    requestUpdate(): void;
    performUpdate(): void;
    static instance(opts?: {
        forceNew?: boolean | null;
        element?: HTMLElement;
        view?: View;
    } | undefined): InspectorView;
    static maybeGetInspectorViewInstance(): InspectorView | null;
    static removeInstance(): void;
    applyDrawerOrientationForDockSideForTest(): void;
    wasShown(): void;
    willHide(): void;
    resolveLocation(locationName: string): ViewLocation | null;
    createToolbars(): Promise<void>;
    addPanel(view: TabbedView): void;
    hasPanel(panelName: string): boolean;
    panel(panelName: string): Promise<Panel>;
    onSuspendStateChanged(allTargetsSuspended: boolean): void;
    canSelectPanel(panelName: string): boolean;
    showPanel(panelName: string): Promise<void>;
    setPanelWarnings(tabId: string, warnings: string[]): void;
    currentPanelDeprecated(): Widget | null;
    showDrawer({ focus, hasTargetDrawer }: {
        focus: boolean;
        hasTargetDrawer: boolean;
    }): void;
    drawerVisible(): boolean;
    minimizeDrawer(): void;
    closeDrawer(): void;
    toggleDrawerOrientation({ force }?: {
        force?: Omit<DrawerOrientation, DrawerOrientation.UNSET>;
    }): void;
    isUserExplicitlyUpdatedDrawerOrientation(): boolean;
    setDrawerMinimized(minimized: boolean): void;
    drawerSize(): number;
    setDrawerSize(size: number): void;
    totalSize(): number;
    isDrawerMinimized(): boolean;
    toggleDrawerMinimized(): void;
    isDrawerOrientationVertical(): boolean;
    onResize(): void;
    topResizerElement(): Element;
    toolbarItemResized(): void;
    ownerSplit(): SplitWidget | null;
    minimize(): void;
    restore(): void;
    displayDebuggedTabReloadRequiredWarning(message: string): void;
    removeDebuggedTabReloadRequiredWarning(): void;
    displayReloadRequiredWarning(message: string): void;
    displayChromeRestartRequiredWarning(message: string): void;
    displaySelectOverrideFolderInfobar(callback: () => void): void;
    renderStatusBar(visible?: boolean): void;
}
export declare class ActionDelegate implements ActionDelegateInterface {
    handleAction(_context: Context, actionId: string): boolean;
}
export declare class InspectorViewTabDelegate implements TabbedPaneTabDelegate {
    closeTabs(tabbedPane: TabbedPane, ids: string[]): void;
    moveToDrawer(tabId: string): void;
    moveToMainTabBar(tabId: string): void;
    onContextMenu(tabId: string, contextMenu: ContextMenu): void;
}

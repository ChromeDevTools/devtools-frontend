import { ShowMode, type SplitWidget } from './SplitWidget.js';
import { TabbedPane, type TabbedPaneTabDelegate } from './TabbedPane.js';
import type { TabbedViewLocation } from './View.js';
export interface DrawerTabbedPaneViewInput {
    isVerticalMinimized: boolean;
    label: string;
}
export type DrawerTabbedPaneView = (input: DrawerTabbedPaneViewInput, output: undefined, target: HTMLElement | ShadowRoot) => void;
export declare const DEFAULT_DRAWER_TABBED_PANE_VIEW: DrawerTabbedPaneView;
declare class DrawerTabbedPane extends TabbedPane {
    #private;
    constructor(label: string, view?: DrawerTabbedPaneView);
    setVerticalMinimized(isMinimized: boolean): void;
    performUpdate(): void;
}
export interface ToolbarViewInput {
    isVertical: boolean;
    isMinimized: boolean;
    showOrientationToggle: boolean;
    onToggleOrientation: () => void;
    onToggleMinimized: () => void;
    onClose: () => void;
}
export type ToolbarView = (input: ToolbarViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_TOOLBAR_VIEW: ToolbarView;
interface InspectorDrawerViewOptions {
    revealDrawer: () => void;
    isVisible: () => boolean;
    drawerLabel: string;
    onToggleMinimized: () => void;
    onHide: () => void;
    onToggleOrientation: () => void;
    onExpandFromMinimized: () => void;
    onMinimizeFromTabInteraction: () => void;
    onTabSelected: (tabId: string) => void;
    isConsoleOpenInMainAndDrawer: (tabId: string) => boolean;
    tabDelegate: TabbedPaneTabDelegate;
    enableOrientationToggle: boolean;
    isVertical: boolean;
    verticalExpandedMinimumWidth: number;
    minimumSizes: {
        inspectorWidthWhenVertical: number;
        inspectorWidthWhenHorizontal: number;
        inspectorHeight: number;
    };
    setInspectorMinimumSize: (width: number, height: number) => void;
    splitWidget?: SplitWidget;
    toolbarView?: ToolbarView;
    drawerTabbedPaneView?: DrawerTabbedPaneView;
}
interface InspectorDrawerPresentation {
    isVertical: boolean;
    isMinimized: boolean;
    verticalExpandedMinimumWidth: number;
}
export declare class InspectorDrawerView {
    #private;
    readonly tabbedLocation: TabbedViewLocation;
    readonly tabbedPane: DrawerTabbedPane;
    constructor(options: InspectorDrawerViewOptions);
    attachSplitWidget(splitWidget: SplitWidget): void;
    showMode(): ShowMode;
    sidebarIsShowing(): boolean;
    restoreMinimizedStateFromSettings(): void;
    setVertical(shouldBeVertical: boolean): void;
    applyState(showMode: ShowMode, minimized: boolean): void;
    show(hasTargetDrawer: boolean): void;
    hide(): void;
    setMinimized(minimized: boolean): void;
    drawerVisible(): boolean;
    isVisibleForEvents(): boolean;
    drawerSize(): number;
    setDrawerSize(size: number): void;
    totalSize(): number;
    isMinimized(): boolean;
    isVertical(): boolean;
    updatePresentation({ isVertical, isMinimized, verticalExpandedMinimumWidth }: InspectorDrawerPresentation): void;
}
export {};

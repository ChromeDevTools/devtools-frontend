import { ShowMode, type SplitWidget } from './SplitWidget.js';
import { TabbedPane, type TabbedPaneTabDelegate } from './TabbedPane.js';
import type { TabbedViewLocation } from './View.js';
declare class DrawerTabbedPane extends TabbedPane {
    constructor();
    setVerticalMinimized(isMinimized: boolean): void;
    restoreAfterVerticalMinimized(): void;
}
interface InspectorDrawerViewOptions {
    splitWidget: SplitWidget;
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

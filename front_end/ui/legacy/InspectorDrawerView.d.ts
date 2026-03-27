import { ShowMode, type SplitWidget } from './SplitWidget.js';
import { TabbedPane, type TabbedPaneTabDelegate } from './TabbedPane.js';
import type { TabbedViewLocation } from './View.js';
declare class DrawerTabbedPane extends TabbedPane {
    constructor();
}
interface InspectorDrawerViewOptions {
    splitWidget: SplitWidget;
    revealDrawer: () => void;
    isVisible: () => boolean;
    drawerLabel: string;
    onHide: () => void;
    onToggleOrientation: () => void;
    onTabSelected: (tabId: string) => void;
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
export declare class InspectorDrawerView {
    #private;
    readonly tabbedLocation: TabbedViewLocation;
    readonly tabbedPane: DrawerTabbedPane;
    constructor(options: InspectorDrawerViewOptions);
    setVertical(shouldBeVertical: boolean): void;
    applyState(showMode: ShowMode): void;
    show(hasTargetDrawer: boolean): void;
    hide(): void;
    drawerVisible(): boolean;
    drawerSize(): number;
    setDrawerSize(size: number): void;
    totalSize(): number;
    isVertical(): boolean;
    updatePresentation(isVertical: boolean): void;
}
export {};

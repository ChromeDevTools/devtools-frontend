import type * as Foundation from '../../foundation/foundation.js';
import * as UI from '../../ui/legacy/legacy.js';
import { DeviceModeView } from './DeviceModeView.js';
export interface ViewInput {
    direction: 'row' | 'column';
    sidebarPosition: 'first' | 'second';
    show: UI.SplitWidget.ShowAttribute;
    /** Offsets the resizer towards the inspected page when docked to the side. */
    dockSide: UI.DockController.DockState;
    /** Makes the main tab bar header act as an additional resizer when docked to the bottom. */
    topResizerEnabled: boolean;
    /** `null` while undocked. */
    deviceModeView: DeviceModeView | null;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export interface ToolboxViewInput {
    /** `null` while docked. */
    deviceModeView: DeviceModeView | null;
}
export type ToolboxView = (input: ToolboxViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_TOOLBOX_VIEW: ToolboxView;
export declare class AdvancedApp implements UI.App.App {
    #private;
    constructor(universe: Foundation.Universe.Universe, view?: View, toolboxView?: ToolboxView);
    /**
     * Note: it's used by toolbox.ts without real type checks.
     */
    static instance(universe?: Foundation.Universe.Universe): AdvancedApp;
    static removeInstance(): void;
    presentUI(document: Document): void;
    deviceModeEmulationFrameLoaded(toolboxDocument: Document): void;
}
export declare class AdvancedAppProvider implements UI.AppProvider.AppProvider {
    static instance(opts?: {
        forceNew: boolean | null;
    }): AdvancedAppProvider;
    createApp(universe: Foundation.Universe.Universe): UI.App.App;
}

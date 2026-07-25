import type * as Foundation from '../../foundation/foundation.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class AdvancedApp implements UI.App.App {
    #private;
    private rootSplitWidget;
    private deviceModeView;
    private inspectedPagePlaceholder;
    private toolboxWindow?;
    private toolboxRootView?;
    private changingDockSide?;
    constructor(universe: Foundation.Universe.Universe);
    /**
     * Note: it's used by toolbox.ts without real type checks.
     */
    static instance(universe?: Foundation.Universe.Universe): AdvancedApp;
    static removeInstance(): void;
    presentUI(document: Document): void;
    private openToolboxWindow;
    deviceModeEmulationFrameLoaded(toolboxDocument: Document): void;
    private updateDeviceModeView;
    private onBeforeDockSideChange;
    private onDockSideChange;
    private onAfterDockSideChange;
    private updateForDocked;
    private updateForUndocked;
    private isDocked;
    private onSetInspectedPageBounds;
}
export declare class AdvancedAppProvider implements UI.AppProvider.AppProvider {
    static instance(opts?: {
        forceNew: boolean | null;
    }): AdvancedAppProvider;
    createApp(universe: Foundation.Universe.Universe): UI.App.App;
}

import * as Common from '../../core/common/common.js';
import * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class MainImpl {
    #private;
    constructor();
    static time(label: string): void;
    static timeEnd(label: string): void;
    requestAndRegisterLocaleData(): Promise<void>;
    createSettingsStorage(prefs: Record<string, string>): {
        syncedStorage: Common.Settings.SettingsStorage;
        globalStorage: Common.Settings.SettingsStorage;
        localStorage: Common.Settings.SettingsStorage;
    };
    readyForTest(): Promise<void>;
    static instanceForTest: MainImpl | null;
}
export declare class ZoomActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
}
export declare class SearchActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
}
export declare class MainMenuItem implements UI.Toolbar.Provider {
    #private;
    constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): MainMenuItem;
    item(): UI.Toolbar.ToolbarItem | null;
}
export declare class SettingsButtonProvider implements UI.Toolbar.Provider {
    #private;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): SettingsButtonProvider;
    item(): UI.Toolbar.ToolbarItem | null;
}
export declare class PauseListener {
    #private;
    constructor();
}
/** Unused but mentioned at https://chromedevtools.github.io/devtools-protocol/#:~:text=use%20Main.MainImpl.-,sendOverProtocol,-()%20in%20the **/
export declare function sendOverProtocol(method: ProtocolClient.InspectorBackend.QualifiedName, params: Object | null): Promise<unknown[] | null>;
export declare class ReloadActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
}

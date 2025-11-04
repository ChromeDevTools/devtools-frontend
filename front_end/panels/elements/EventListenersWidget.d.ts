import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    refreshEventListenersActionName: string;
    showForAncestorsSetting: Common.Settings.Setting<boolean>;
    dispatchFilterBySetting: Common.Settings.Setting<string>;
    showFrameworkListenersSetting: Common.Settings.Setting<boolean>;
    onDispatchFilterTypeChange: (value: string) => void;
    onEventListenersViewChange: () => void;
    dispatchFilters: Array<{
        name: string;
        value: string;
    }>;
    selectedDispatchFilter: string;
    eventListenerObjects: Array<SDK.RemoteObject.RemoteObject | null>;
    filter: {
        showFramework: boolean;
        showPassive: boolean;
        showBlocking: boolean;
    };
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class EventListenersWidget extends UI.Widget.VBox {
    #private;
    private showForAncestorsSetting;
    private readonly dispatchFilterBySetting;
    private readonly showFrameworkListenersSetting;
    private lastRequestedNode?;
    constructor(view?: View);
    static instance(opts?: {
        forceNew: boolean | null;
    } | undefined): EventListenersWidget;
    performUpdate(): Promise<void>;
    wasShown(): void;
    willHide(): void;
    private windowObjectInNodeContext;
    eventListenersArrivedForTest(): void;
}
export declare const DispatchFilterBy: {
    All: string;
    Blocking: string;
    Passive: string;
};
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
}
export {};

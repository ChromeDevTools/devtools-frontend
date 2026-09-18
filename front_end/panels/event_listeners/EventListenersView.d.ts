import * as SDK from '../../core/sdk/sdk.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ListenerEntry {
    object: SDK.RemoteObject.RemoteObject;
    listener: SDK.DOMDebuggerModel.EventListener;
    objectTree: ObjectUI.ObjectPropertiesSection.ObjectTree;
}
interface ViewInput {
    togglePassiveListener(listener: SDK.DOMDebuggerModel.EventListener): void;
    removeListener(listener: SDK.DOMDebuggerModel.EventListener): boolean;
    reveal(object: SDK.RemoteObject.RemoteObject): void;
    linkifier: Components.Linkifier.Linkifier;
    listeners: Map<string, ListenerEntry[]>;
    filter?: {
        showFramework: boolean;
        showPassive: boolean;
        showBlocking: boolean;
    };
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class EventListenersView extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, view?: View);
    get objects(): Array<SDK.RemoteObject.RemoteObject | null>;
    set objects(val: Array<SDK.RemoteObject.RemoteObject | null>);
    get filter(): {
        showFramework: boolean;
        showPassive: boolean;
        showBlocking: boolean;
    } | undefined;
    set filter(val: {
        showFramework: boolean;
        showPassive: boolean;
        showBlocking: boolean;
    } | undefined);
    performUpdate(): Promise<void>;
    private eventListenersArrivedForTest;
}
export {};

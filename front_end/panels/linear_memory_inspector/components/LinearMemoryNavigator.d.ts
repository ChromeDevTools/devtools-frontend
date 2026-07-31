import '../../../ui/kit/kit.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare const enum Navigation {
    BACKWARD = "Backward",
    FORWARD = "Forward"
}
export declare class AddressInputChangedEvent extends Event {
    static readonly eventName = "addressinputchanged";
    data: {
        address: string;
        mode: Mode;
    };
    constructor(address: string, mode: Mode);
}
export declare class PageNavigationEvent extends Event {
    static readonly eventName = "pagenavigation";
    data: Navigation;
    constructor(navigation: Navigation);
}
export declare class HistoryNavigationEvent extends Event {
    static readonly eventName = "historynavigation";
    data: Navigation;
    constructor(navigation: Navigation);
}
export declare class RefreshRequestedEvent extends Event {
    static readonly eventName = "refreshrequested";
    constructor();
}
export interface LinearMemoryNavigatorData {
    address: string;
    mode: Mode;
    canGoBackInHistory: boolean;
    canGoForwardInHistory: boolean;
    valid: boolean;
    error: string | undefined;
}
export declare const enum Mode {
    EDIT = "Edit",
    SUBMITTED = "Submitted",
    INVALID_SUBMIT = "InvalidSubmit"
}
export declare class LinearMemoryNavigator extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement);
    set data(data: LinearMemoryNavigatorData);
    performUpdate(): void;
}

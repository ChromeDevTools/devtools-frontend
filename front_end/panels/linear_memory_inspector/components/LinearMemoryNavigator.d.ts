import '../../../ui/kit/kit.js';
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
export declare class LinearMemoryNavigator extends HTMLElement {
    #private;
    set data(data: LinearMemoryNavigatorData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-linear-memory-inspector-navigator': LinearMemoryNavigator;
    }
}

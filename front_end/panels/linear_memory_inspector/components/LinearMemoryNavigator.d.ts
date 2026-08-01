import '../../../ui/kit/kit.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare const enum Navigation {
    BACKWARD = "Backward",
    FORWARD = "Forward"
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
    get onRefreshRequest(): (() => void) | undefined;
    set onRefreshRequest(callback: (() => void) | undefined);
    get onAddressChange(): ((address: string, mode: Mode) => void) | undefined;
    set onAddressChange(callback: ((address: string, mode: Mode) => void) | undefined);
    get onNavigatePage(): ((navigation: Navigation) => void) | undefined;
    set onNavigatePage(callback: ((navigation: Navigation) => void) | undefined);
    get onNavigateHistory(): ((navigation: Navigation) => void) | undefined;
    set onNavigateHistory(callback: ((navigation: Navigation) => void) | undefined);
    constructor(element?: HTMLElement);
    get address(): string;
    set address(address: string);
    get error(): string | undefined;
    set error(error: string | undefined);
    get valid(): boolean;
    set valid(valid: boolean);
    get canGoBackInHistory(): boolean;
    set canGoBackInHistory(canGoBackInHistory: boolean);
    get canGoForwardInHistory(): boolean;
    set canGoForwardInHistory(canGoForwardInHistory: boolean);
    get mode(): Mode;
    set mode(mode: Mode);
    performUpdate(): void;
}

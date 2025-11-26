import * as Common from '../../core/common/common.js';
import { GlassPane } from './GlassPane.js';
declare const Dialog_base: (new (...args: any[]) => {
    "__#private@#events": Common.ObjectWrapper.ObjectWrapper<EventTypes>;
    addEventListener<T extends Events.HIDDEN>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.HIDDEN>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.HIDDEN>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.HIDDEN): boolean;
    dispatchEventToListeners<T extends Events.HIDDEN>(eventType: import("../../core/platform/TypescriptUtilities.js").NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof GlassPane;
export declare class Dialog extends Dialog_base {
    private tabIndexBehavior;
    private tabIndexMap;
    private focusRestorer;
    private closeOnEscape;
    private targetDocument;
    private readonly targetDocumentKeyDownHandler;
    private escapeKeyCallback;
    constructor(jslogContext?: string);
    static hasInstance(): boolean;
    /**
     * If there is only one dialog, returns that.
     * If there are stacked dialogs, returns the topmost one.
     */
    static getInstance(): Dialog | null;
    /**
     * `stack` parameter is needed for being able to open a dialog on top
     * of an existing dialog. The main reason is, Settings Tab is
     * implemented as a Dialog. So, if we want to open a dialog on the
     * Settings Tab, we need to stack it on top of that dialog.
     *
     * @param where Container element of the dialog.
     * @param stack Whether to open this dialog on top of an existing dialog.
     */
    show(where?: Document | Element, stack?: boolean): void;
    hide(): void;
    setAriaLabel(label: string): void;
    setCloseOnEscape(close: boolean): void;
    setEscapeKeyCallback(callback: (arg0: KeyboardEvent) => void): void;
    addCloseButton(): void;
    setOutsideTabIndexBehavior(tabIndexBehavior: OutsideTabIndexBehavior): void;
    private disableTabIndexOnElements;
    private getMainWidgetTabIndexElements;
    private restoreTabIndexOnElements;
    private onKeyDown;
    private static dialogs;
}
export declare const enum Events {
    HIDDEN = "hidden"
}
export interface EventTypes {
    [Events.HIDDEN]: void;
}
export declare const enum OutsideTabIndexBehavior {
    DISABLE_ALL_OUTSIDE_TAB_INDEX = "DisableAllTabIndex",
    PRESERVE_MAIN_VIEW_TAB_INDEX = "PreserveMainViewTabIndex",
    PRESERVE_TAB_INDEX = "PreserveTabIndex"
}
export {};

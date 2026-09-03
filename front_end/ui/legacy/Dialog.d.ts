import * as Common from '../../core/common/common.js';
import { type LitTemplate } from '../../ui/lit/lit.js';
import { GlassPane } from './GlassPane.js';
import { Widget } from './Widget.js';
declare const DialogBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof GlassPane>;
export declare class Dialog extends DialogBase {
    private tabIndexBehavior;
    private tabIndexMap;
    private focusRestorer;
    private closeOnEscape;
    private targetDocument;
    private readonly targetDocumentKeyDownHandler;
    private escapeKeyCallback;
    constructor(jslogContext?: string);
    set jslogContext(jslogContext: string);
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
declare const DialogWidgetBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof Widget>;
export declare class DialogWidget extends DialogWidgetBase {
    #private;
    constructor(element?: HTMLElement);
    get open(): boolean;
    set open(open: boolean);
    get dialogStack(): boolean;
    set dialogStack(dialogStack: boolean);
    get content(): LitTemplate;
    set content(content: LitTemplate);
    get jslogContext(): string;
    set jslogContext(jslogContext: string);
    wasShown(): void;
    willHide(): void;
    onDetach(): void;
    performUpdate(): void;
}
export {};

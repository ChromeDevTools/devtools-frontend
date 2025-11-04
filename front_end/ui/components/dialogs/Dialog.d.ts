/**
 * Height in pixels of the dialog's connector. The connector is represented as
 * as a diamond and the height corresponds to half the height of the diamond.
 * (the visible height is only half of the diamond).
 **/
export declare const CONNECTOR_HEIGHT = 10;
export declare const DIALOG_SIDE_PADDING = 5;
export declare const DIALOG_VERTICAL_PADDING = 3;
/**
 * If the content of the dialog cannot be completely shown because otherwise
 * the dialog would overflow the window, the dialog's max width and height are
 * set such that the dialog remains inside the visible bounds. In this cases
 * some extra, determined by this constant, is added so that the dialog's borders
 * remain clearly visible. This constant accounts for the padding of the dialog's
 * content (20 px) and a 5px gap left on each extreme of the dialog from the viewport.
 **/
export declare const DIALOG_PADDING_FROM_WINDOW: number;
type DialogAnchor = HTMLElement | DOMRect | DOMPoint;
export declare const MODAL = "MODAL";
export type DialogOrigin = DialogAnchor | null | (() => DialogAnchor) | typeof MODAL;
export declare class Dialog extends HTMLElement {
    #private;
    get origin(): DialogOrigin;
    set origin(origin: DialogOrigin);
    set expectedMutationsSelector(mutationSelector: string);
    get expectedMutationsSelector(): string | undefined;
    get position(): DialogVerticalPosition;
    set position(position: DialogVerticalPosition);
    get horizontalAlignment(): DialogHorizontalAlignment;
    set horizontalAlignment(alignment: DialogHorizontalAlignment);
    get bestVerticalPosition(): DialogVerticalPosition | null;
    get bestHorizontalAlignment(): DialogHorizontalAlignment | null;
    get getConnectorCustomXPosition(): (() => number) | null;
    set getConnectorCustomXPosition(connectorXPosition: (() => number) | null);
    get dialogShownCallback(): (() => unknown) | null;
    get jslogContext(): string;
    set dialogShownCallback(dialogShownCallback: (() => unknown) | null);
    set closeOnESC(closeOnESC: boolean);
    set closeOnScroll(closeOnScroll: boolean);
    set closeButton(closeButton: boolean);
    set dialogTitle(dialogTitle: string);
    set jslogContext(jslogContext: string);
    set state(state: DialogState);
    connectedCallback(): void;
    disconnectedCallback(): void;
    getHitArea(): DOMRect;
    setDialogVisible(show: boolean): Promise<void>;
    getDialogBounds(): DOMRect;
    setBoundingElementForTesting(element: HTMLElement): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-dialog': Dialog;
    }
}
export declare class PointerLeftDialogEvent extends Event {
    static readonly eventName = "pointerleftdialog";
    constructor();
}
export declare class ClickOutsideDialogEvent extends Event {
    static readonly eventName = "clickoutsidedialog";
    constructor();
}
export declare class AnimationEndedEvent extends Event {
    static readonly eventName = "animationended";
    constructor();
}
export declare class ForcedDialogClose extends Event {
    static readonly eventName = "forceddialogclose";
    constructor();
}
export declare const enum DialogVerticalPosition {
    TOP = "top",
    BOTTOM = "bottom",
    AUTO = "auto"
}
export declare const enum DialogState {
    EXPANDED = "expanded",
    COLLAPSED = "collapsed",
    DISABLED = "disabled"
}
export declare const enum DialogHorizontalAlignment {
    LEFT = "left",
    RIGHT = "right",
    CENTER = "center",
    AUTO = "auto"
}
export {};

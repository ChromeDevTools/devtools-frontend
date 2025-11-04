import * as Dialogs from '../dialogs/dialogs.js';
export interface MenuData {
    /**
     * Whether the menu is open.
     */
    open: boolean;
    /**
     * Determines where the dialog with the menu will show relative to
     * the menu's origin.
     * Defaults to Bottom.
     */
    position: Dialogs.Dialog.DialogVerticalPosition;
    /**
     * Position or point the dialog is shown relative to.
     */
    origin: Dialogs.Dialog.DialogOrigin;
    /**
     * Determines if dividing lines between the menu's options
     * are shown.
     * Defaults to false.
     */
    showDivider: boolean;
    /**
     * Determines if the selected item is marked using a checkmark.
     * Defaults to true.
     */
    showSelectedItem: boolean;
    /**
     * Determines where the dialog with the menu will show horizontally
     * relative to the show button.
     * Defaults to Auto
     */
    horizontalAlignment: Dialogs.Dialog.DialogHorizontalAlignment;
    /**
     * Optional function used to the determine the x coordinate of the connector's
     * end (tip of the triangle), relative to the viewport. If not defined, the x
     * coordinate of the origin's center is used instead.
     */
    getConnectorCustomXPosition: (() => number) | null;
}
export declare class Menu extends HTMLElement {
    #private;
    get origin(): Dialogs.Dialog.DialogOrigin;
    set origin(origin: Dialogs.Dialog.DialogOrigin);
    get open(): boolean;
    set open(open: boolean);
    get position(): Dialogs.Dialog.DialogVerticalPosition;
    set position(position: Dialogs.Dialog.DialogVerticalPosition);
    get showDivider(): boolean;
    set showDivider(showDivider: boolean);
    get showSelectedItem(): boolean;
    set showSelectedItem(showSelectedItem: boolean);
    get horizontalAlignment(): Dialogs.Dialog.DialogHorizontalAlignment;
    set horizontalAlignment(horizontalAlignment: Dialogs.Dialog.DialogHorizontalAlignment);
    get getConnectorCustomXPosition(): (() => number) | null;
    set getConnectorCustomXPosition(connectorXPosition: (() => number) | null);
    connectedCallback(): void;
}
export declare class MenuItem extends HTMLElement {
    #private;
    connectedCallback(): void;
    get preventMenuCloseOnSelection(): boolean;
    set preventMenuCloseOnSelection(preventMenuCloseOnSelection: boolean);
    get value(): MenuItemValue;
    set value(value: MenuItemValue);
    get selected(): boolean;
    set selected(selected: boolean);
    get disabled(): boolean;
    set disabled(disabled: boolean);
}
export declare class MenuGroup extends HTMLElement {
    #private;
    get name(): string | null;
    set name(name: string | null);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-menu': Menu;
        'devtools-menu-item': MenuItem;
        'devtools-menu-group': MenuGroup;
    }
    interface HTMLElementEventMap {
        [MenuItemSelectedEvent.eventName]: MenuItemSelectedEvent;
        [MenuCloseRequest.eventName]: MenuCloseRequest;
    }
}
export declare class MenuItemSelectedEvent extends Event {
    itemValue: MenuItemValue;
    static readonly eventName = "menuitemselected";
    constructor(itemValue: MenuItemValue);
}
export declare class MenuCloseRequest extends Event {
    static readonly eventName = "menucloserequest";
    constructor();
}
export type MenuItemValue = string | number | boolean;

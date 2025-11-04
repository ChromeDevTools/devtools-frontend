import * as Lit from '../../../ui/lit/lit.js';
import * as Dialogs from '../dialogs/dialogs.js';
import { MenuGroup, type MenuItemValue } from './Menu.js';
export interface SelectMenuData {
    /**
     * Determines where the dialog with the menu will show relative to
     * the show button.
     * Defaults to Bottom.
     */
    position: Dialogs.Dialog.DialogVerticalPosition;
    /**
     * Determines where the dialog with the menu will show horizontally
     * relative to the show button.
     * Defaults to Auto
     */
    horizontalAlignment: Dialogs.Dialog.DialogHorizontalAlignment;
    /**
     * The title of the menu button. Can be either a string or a function
     * that returns a Lit template.
     * If not set, the title of the button will default to the selected
     * item's text.
     */
    buttonTitle: string | TitleCallback;
    /**
     * Determines if an arrow, pointing to the opposite side of
     * the dialog, is shown at the end of the button.
     * Defaults to false.
     */
    showArrow: boolean;
    /**
     * Determines if the component is formed by two buttons:
     * one to open the meny and another that triggers a
     * selectmenusidebuttonclickEvent. The RecordMenu instance of
     * the component is an example of this use case.
     * Defaults to false.
     */
    sideButton: boolean;
    /**
     * Whether the menu button is disabled.
     * Defaults to false.
     */
    disabled: boolean;
    /**
     * Determines if dividing lines between the menu's options
     * are shown.
     */
    showDivider: boolean;
    /**
     * Determines if the selected item is marked using a checkmark.
     * Defaults to true.
     */
    showSelectedItem: boolean;
    /**
     * Specifies a context for the visual element.
     */
    jslogContext: string;
}
type TitleCallback = () => Lit.TemplateResult;
/**
 * @deprecated use `<select>` instead.
 */
export declare class SelectMenu extends HTMLElement {
    #private;
    get buttonTitle(): string | TitleCallback;
    set buttonTitle(buttonTitle: string | TitleCallback);
    get position(): Dialogs.Dialog.DialogVerticalPosition;
    set position(position: Dialogs.Dialog.DialogVerticalPosition);
    get horizontalAlignment(): Dialogs.Dialog.DialogHorizontalAlignment;
    set horizontalAlignment(horizontalAlignment: Dialogs.Dialog.DialogHorizontalAlignment);
    get showArrow(): boolean;
    set showArrow(showArrow: boolean);
    get sideButton(): boolean;
    set sideButton(sideButton: boolean);
    get disabled(): boolean;
    set disabled(disabled: boolean);
    get showDivider(): boolean;
    set showDivider(showDivider: boolean);
    get showSelectedItem(): boolean;
    set showSelectedItem(showSelectedItem: boolean);
    get jslogContext(): string;
    set jslogContext(jslogContext: string);
    click(): void;
}
export interface SelectMenuButtonData {
    showArrow: boolean;
    arrowDirection: Dialogs.Dialog.DialogVerticalPosition;
    disabled: boolean;
    singleArrow: boolean;
    jslogContext: string;
}
export declare class SelectMenuButton extends HTMLElement {
    #private;
    connectedCallback(): void;
    get showArrow(): boolean;
    set showArrow(showArrow: boolean);
    get arrowDirection(): Dialogs.Dialog.DialogVerticalPosition;
    set arrowDirection(arrowDirection: Dialogs.Dialog.DialogVerticalPosition);
    get disabled(): boolean;
    set disabled(disabled: boolean);
    set open(open: boolean);
    set singleArrow(singleArrow: boolean);
    get jslogContext(): string;
    set jslogContext(jslogContext: string);
    click(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-select-menu': SelectMenu;
        'devtools-select-menu-button': SelectMenuButton;
    }
    interface HTMLElementEventMap {
        [SelectMenuItemSelectedEvent.eventName]: SelectMenuItemSelectedEvent;
    }
}
export declare class SelectMenuItemSelectedEvent extends Event {
    itemValue: SelectMenuItemValue;
    static readonly eventName = "selectmenuselected";
    constructor(itemValue: SelectMenuItemValue);
}
export declare class SelectMenuSideButtonClickEvent extends Event {
    static readonly eventName = "selectmenusidebuttonclick";
    constructor();
}
export declare class SelectMenuButtonTriggerEvent extends Event {
    static readonly eventName = "selectmenubuttontrigger";
    constructor();
}
/**
 * Exported artifacts used in this component and that belong to the Menu are
 * renamed to only make reference to the SelectMenu. This way, the Menu API
 * doesn't have to be used in SelectMenu usages and the SelectMenu implementation
 * can remain transparent to its users.
 **/
export type SelectMenuItemValue = MenuItemValue;
export { MenuGroup as SelectMenuGroup };

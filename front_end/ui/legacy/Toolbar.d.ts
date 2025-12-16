import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import { type Action } from './ActionRegistration.js';
import { ContextMenu } from './ContextMenu.js';
import type { Suggestion } from './SuggestBox.js';
/**
 * Custom element for toolbars.
 *
 * @property floating - The `"floating"` attribute is reflected as property.
 * @property wrappable - The `"wrappable"` attribute is reflected as property.
 * @attribute floating - If present the toolbar is rendered in columns, with a border
 *                  around it, and a non-transparent background. This is used to
 *                  build vertical toolbars that open with long-click. Defaults
 *                  to `false`.
 * @attribute wrappable - If present the toolbar items will wrap to a new row and the
 *                   toolbar height increases.
 */
export declare class Toolbar extends HTMLElement {
    #private;
    private items;
    enabled: boolean;
    private compactLayout;
    constructor();
    onItemsChange(mutationList: MutationRecord[]): void;
    connectedCallback(): void;
    /**
     * Returns whether this toolbar is floating.
     *
     * @returns `true` if the `"floating"` attribute is present on this toolbar,
     *         otherwise `false`.
     */
    get floating(): boolean;
    /**
     * Changes the value of the `"floating"` attribute on this toolbar.
     *
     * @param floating `true` to make the toolbar floating.
     */
    set floating(floating: boolean);
    /**
     * Returns whether this toolbar is wrappable.
     *
     * @returns `true` if the `"wrappable"` attribute is present on this toolbar,
     *         otherwise `false`.
     */
    get wrappable(): boolean;
    /**
     * Changes the value of the `"wrappable"` attribute on this toolbar.
     *
     * @param wrappable `true` to make the toolbar items wrap to a new row and
     *                  have the toolbar height adjust.
     */
    set wrappable(wrappable: boolean);
    hasCompactLayout(): boolean;
    setCompactLayout(enable: boolean): void;
    static createLongPressActionButton(action: Action, toggledOptions: ToolbarButton[], untoggledOptions: ToolbarButton[]): ToolbarButton;
    static createActionButton(action: Action, options?: ToolbarButtonOptions): ToolbarButton;
    static createActionButton(actionId: string, options?: ToolbarButtonOptions): ToolbarButton;
    empty(): boolean;
    setEnabled(enabled: boolean): void;
    appendToolbarItem(item: ToolbarItem): void;
    hasItem(item: ToolbarItem): boolean;
    prependToolbarItem(item: ToolbarItem): void;
    appendSeparator(): void;
    appendSpacer(): void;
    appendText(text: string): void;
    removeToolbarItem(itemToRemove: ToolbarItem): void;
    removeToolbarItems(): void;
    hideSeparatorDupes(): void;
    appendItemsAtLocation(location: string): Promise<void>;
}
export interface ToolbarButtonOptions {
    label?: () => Platform.UIString.LocalizedString;
}
export declare class ToolbarItem<T = any, E extends HTMLElement = HTMLElement> extends Common.ObjectWrapper.ObjectWrapper<T> {
    #private;
    element: E;
    enabled: boolean;
    toolbar: Toolbar | null;
    protected title?: string;
    constructor(element: E);
    setTitle(title: string, actionId?: string | undefined): void;
    setEnabled(value: boolean): void;
    applyEnabledState(enabled: boolean): void;
    visible(): boolean;
    setVisible(x: boolean): void;
    setCompactLayout(_enable: boolean): void;
    setMaxWidth(width: number): void;
    setMinWidth(width: number): void;
}
export declare const enum ToolbarItemWithCompactLayoutEvents {
    COMPACT_LAYOUT_UPDATED = "CompactLayoutUpdated"
}
interface ToolbarItemWithCompactLayoutEventTypes {
    [ToolbarItemWithCompactLayoutEvents.COMPACT_LAYOUT_UPDATED]: boolean;
}
export declare class ToolbarItemWithCompactLayout extends ToolbarItem<ToolbarItemWithCompactLayoutEventTypes> {
    setCompactLayout(enable: boolean): void;
}
export declare class ToolbarText extends ToolbarItem<void, HTMLElement> {
    constructor(text?: string);
    text(): string;
    setText(text: string): void;
}
export declare class ToolbarButton extends ToolbarItem<ToolbarButton.EventTypes, Buttons.Button.Button> {
    private button;
    private text?;
    private adorner?;
    constructor(title: string, glyph?: string, text?: string, jslogContext?: string, button?: Buttons.Button.Button);
    focus(): void;
    checked(checked: boolean): void;
    toggleOnClick(toggleOnClick: boolean): void;
    isToggled(): boolean;
    toggled(toggled: boolean): void;
    setToggleType(type: Buttons.Button.ToggleType): void;
    setLongClickable(longClickable: boolean): void;
    setSize(size: Buttons.Button.Size): void;
    setReducedFocusRing(): void;
    setText(text: string): void;
    setAdorner(adorner: HTMLElement): void;
    setGlyph(iconName: string): void;
    setToggledIcon(toggledIconName: string): void;
    setBackgroundImage(iconURL: string): void;
    setSecondary(): void;
    setDarkText(): void;
    clicked(event: Event): void;
}
export declare namespace ToolbarButton {
    const enum Events {
        CLICK = "Click"
    }
    interface EventTypes {
        [Events.CLICK]: Event;
    }
}
export declare class ToolbarInput extends ToolbarItem<ToolbarInput.EventTypes> {
    private prompt;
    private readonly proxyElement;
    constructor(placeholder: string, accessiblePlaceholder?: string, growFactor?: number, shrinkFactor?: number, tooltip?: string, completions?: ((arg0: string, arg1: string, arg2?: boolean | undefined) => Promise<Suggestion[]>), dynamicCompletions?: boolean, jslogContext?: string, element?: HTMLElement);
    applyEnabledState(enabled: boolean): void;
    setValue(value: string, notify?: boolean): void;
    value(): string;
    valueWithoutSuggestion(): string;
    clearAutocomplete(): void;
    focus(): void;
    private onKeydownCallback;
    private onChangeCallback;
    private updateEmptyStyles;
}
export declare class ToolbarFilter extends ToolbarInput {
    constructor(filterBy?: Common.UIString.LocalizedString, growFactor?: number, shrinkFactor?: number, tooltip?: string, completions?: ((arg0: string, arg1: string, arg2?: boolean | undefined) => Promise<Suggestion[]>), dynamicCompletions?: boolean, jslogContext?: string, element?: HTMLElement);
}
export declare class ToolbarInputElement extends HTMLElement {
    #private;
    static observedAttributes: string[];
    item?: ToolbarInput;
    datalist: HTMLDataListElement | null;
    value: string | undefined;
    connectedCallback(): void;
    focus(): void;
    attributeChangedCallback(name: string, _oldValue: string, newValue: string): void;
    set disabled(disabled: boolean);
    get disabled(): boolean;
}
export declare namespace ToolbarInput {
    const enum Event {
        TEXT_CHANGED = "TextChanged",
        ENTER_PRESSED = "EnterPressed"
    }
    interface EventTypes {
        [Event.TEXT_CHANGED]: string;
        [Event.ENTER_PRESSED]: string;
    }
}
export declare class ToolbarToggle extends ToolbarButton {
    private readonly toggledGlyph;
    constructor(title: string, glyph?: string, toggledGlyph?: string, jslogContext?: string, toggleOnClick?: boolean);
    setToggleOnClick(toggleOnClick: boolean): void;
    setToggled(toggled: boolean): void;
    setChecked(checked: boolean): void;
    enableToggleWithRedColor(): void;
}
export declare class ToolbarMenuButton extends ToolbarItem<ToolbarButton.EventTypes> {
    #private;
    private textElement?;
    private text?;
    private iconName?;
    private adorner?;
    private readonly contextMenuHandler;
    private readonly useSoftMenu;
    private readonly keepOpen;
    private readonly isIconDropdown;
    private triggerTimeoutId?;
    constructor(contextMenuHandler: (arg0: ContextMenu) => void, isIconDropdown?: boolean, useSoftMenu?: boolean, jslogContext?: string, iconName?: string, keepOpen?: boolean);
    setText(text: string): void;
    setAdorner(adorner: HTMLElement): void;
    setDarkText(): void;
    turnShrinkable(): void;
    setTriggerDelay(x: number): void;
    mouseDown(event: MouseEvent): void;
    private trigger;
    clicked(event: Event): void;
}
export declare class ToolbarSettingToggle extends ToolbarToggle {
    private readonly defaultTitle;
    private readonly setting;
    private willAnnounceState;
    constructor(setting: Common.Settings.Setting<boolean>, glyph: string, title: string, toggledGlyph?: string, jslogContext?: string);
    private settingChanged;
    clicked(event: Event): void;
}
export declare class ToolbarSeparator extends ToolbarItem<void> {
    constructor(spacer?: boolean);
}
export interface Provider {
    item(): ToolbarItem | null;
}
export interface ItemsProvider {
    toolbarItems(): ToolbarItem[];
}
export declare class ToolbarComboBox extends ToolbarItem<void, HTMLSelectElement> {
    constructor(changeHandler: ((arg0: Event) => void) | null, title: string, className?: string, jslogContext?: string, element?: HTMLSelectElement);
    turnShrinkable(): void;
    size(): number;
    options(): HTMLOptionElement[];
    addOption(option: Element): void;
    createOption(label: string, value?: string, jslogContext?: string): HTMLOptionElement;
    applyEnabledState(enabled: boolean): void;
    removeOption(option: Element): void;
    removeOptions(): void;
    selectedOption(): HTMLOptionElement | null;
    select(option: Element): void;
    setSelectedIndex(index: number): void;
    selectedIndex(): number;
}
export interface Option {
    value: string;
    label: string;
}
export declare class ToolbarSettingComboBox extends ToolbarComboBox {
    #private;
    private readonly setting;
    private muteSettingListener?;
    constructor(options: Option[], setting: Common.Settings.Setting<string>, accessibleName: string);
    setOptions(options: Option[]): void;
    value(): string;
    select(option: Element): void;
    setSelectedIndex(index: number): void;
    /**
     * Note: wondering why there are two event listeners and what the difference is?
     * It is because this combo box <select> is backed by a Devtools setting and
     * at any time there could be multiple instances of these elements that are
     * backed by the same setting. So they have to listen to two things:
     * 1. When the setting is changed via a different method.
     * 2. When the value of the select is changed, triggering a change to the setting.
     */
    /**
     * Runs when the DevTools setting is changed
     */
    private onDevToolsSettingChanged;
    /**
     * Run when the user interacts with the <select> element.
     */
    private onSelectValueChange;
}
export declare class ToolbarCheckbox extends ToolbarItem<void> {
    #private;
    constructor(text: Common.UIString.LocalizedString, tooltip?: Common.UIString.LocalizedString, listener?: ((arg0: MouseEvent) => void), jslogContext?: string);
    checked(): boolean;
    setChecked(value: boolean): void;
    applyEnabledState(enabled: boolean): void;
    setIndeterminate(indeterminate: boolean): void;
    /**
     * Sets the user visible text shown alongside the checkbox.
     * If you want to update the title/aria-label, use setTitle.
     */
    setLabelText(content: Common.UIString.LocalizedString): void;
}
export declare class ToolbarSettingCheckbox extends ToolbarCheckbox {
    constructor(setting: Common.Settings.Setting<boolean>, tooltip?: Common.UIString.LocalizedString, alternateTitle?: Common.UIString.LocalizedString);
}
export declare function registerToolbarItem(registration: ToolbarItemRegistration): void;
export interface ToolbarItemRegistration {
    order?: number;
    location: ToolbarItemLocation;
    separator?: boolean;
    label?: () => Platform.UIString.LocalizedString;
    actionId?: string;
    condition?: Root.Runtime.Condition;
    loadItem?: (() => Promise<Provider>);
    experiment?: string;
    jslog?: string;
}
export declare const enum ToolbarItemLocation {
    FILES_NAVIGATION_TOOLBAR = "files-navigator-toolbar",
    MAIN_TOOLBAR_RIGHT = "main-toolbar-right",
    MAIN_TOOLBAR_LEFT = "main-toolbar-left",
    STYLES_SIDEBARPANE_TOOLBAR = "styles-sidebarpane-toolbar"
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-toolbar': Toolbar;
        'devtools-toolbar-input': ToolbarInputElement;
    }
}
export {};

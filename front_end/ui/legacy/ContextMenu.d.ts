import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import type { Key, Modifier } from './KeyboardShortcut.js';
import { type SoftContextMenuDescriptor } from './SoftContextMenu.js';
/**
 * Represents a single item in a context menu.
 * @property jslogContext - An optional string identifying the element for visual logging.
 * @property customElement - A custom HTML element to be rendered for this item.
 * @property idInternal - The unique ID of this item. Undefined for separators.
 * @property contextMenu - The parent `ContextMenu` or `null` if this item is not part of a menu (e.g. a SubMenu).
 * @property isDevToolsPerformanceMenuItem - Controls whether the shortcuts will be shown in Mac native menus. Use only in exceptional cases where shortcuts are heavily context dependent and critical for a smooth user interaction.
 * @property disabled - Whether the item should be disabled.
 * @property previewFeature - Whether this item represents an experimental feature. Adds an experiment icon next to the menu item.
 * @property accelerator - Describes a keyboard shortcut for the item. Shortcut will not show in native Menus on Mac.
 * @property label - The text to display for the item. Not used for 'separator' type.
 */
export declare class Item {
    #private;
    private readonly typeInternal;
    protected readonly label: string | undefined;
    protected accelerator?: Host.InspectorFrontendHostAPI.AcceleratorDescriptor;
    protected featureName?: string;
    protected readonly previewFeature: boolean;
    protected disabled: boolean | undefined;
    private readonly checked;
    protected isDevToolsPerformanceMenuItem: boolean;
    protected contextMenu: ContextMenu | null;
    protected idInternal: number | undefined;
    customElement?: Element;
    private shortcut?;
    protected jslogContext: string | undefined;
    constructor(contextMenu: ContextMenu | null, type: 'checkbox' | 'item' | 'separator' | 'subMenu', label?: string, isPreviewFeature?: boolean, disabled?: boolean, checked?: boolean, accelerator?: Host.InspectorFrontendHostAPI.AcceleratorDescriptor, tooltip?: Platform.UIString.LocalizedString, jslogContext?: string, featureName?: string);
    /**
     * Returns the unique ID of this item.
     * @throws If the item ID was not set (e.g. for a separator).
     */
    id(): number;
    /**
     * Returns the type of this item (e.g. 'item', 'checkbox').
     */
    type(): string;
    /**
     * Returns whether this item is marked as a preview feature (experimental).
     */
    isPreviewFeature(): boolean;
    /**
     * Returns whether this item is enabled.
     */
    isEnabled(): boolean;
    /**
     * Sets the enabled state of this item.
     * @param enabled True to enable the item, false to disable it.
     */
    setEnabled(enabled: boolean): void;
    /**
     * Builds a descriptor object for this item.
     * This descriptor is used to create the actual menu item in either
     * a soft-rendered menu or a native menu.
     * @returns The descriptor for the item.
     * @throws If the item type is invalid.
     */
    buildDescriptor(): SoftContextMenuDescriptor | Host.InspectorFrontendHostAPI.ContextMenuDescriptor;
    /**
     * Sets a keyboard accelerator for this item.
     * @param key The key code for the accelerator.
     * @param modifiers An array of modifiers (e.g. Ctrl, Shift).
     */
    setAccelerator(key: Key, modifiers: Modifier[]): void;
    /**
     * This influences whether accelerators will be shown for native menus on Mac.
     * Use this ONLY for performance menus and ONLY where accelerators are critical
     * for a smooth user journey and heavily context dependent.
     * @param isDevToolsPerformanceMenuItem True if this is a DevTools performance menu item.
     */
    setIsDevToolsPerformanceMenuItem(isDevToolsPerformanceMenuItem: boolean): void;
    /**
     * Sets a display string for the shortcut associated with this item.
     * This is typically used when the shortcut is managed by `ActionRegistry`.
     * @param shortcut The shortcut string to display.
     */
    setShortcut(shortcut: string): void;
}
/**
 * Represents a section within a `ContextMenu` or `SubMenu`.
 * Sections are used to group related items and are often visually separated.
 * @property items - The list of items in this section.
 * @property contextMenu - The parent `ContextMenu` or `null`.
 */
export declare class Section {
    readonly contextMenu: ContextMenu | null;
    readonly items: Item[];
    constructor(contextMenu: ContextMenu | null);
    /**
     * Appends a standard clickable item to this section.
     * @param label The text to display for the item.
     * @param handler The function to execute when the item is clicked.
     * @param options Optional settings for the item.
     * @returns The newly created `Item`.
     */
    appendItem(label: string, handler: () => void, options?: {
        accelerator?: Host.InspectorFrontendHostAPI.AcceleratorDescriptor;
        isPreviewFeature?: boolean;
        disabled?: boolean;
        additionalElement?: Element;
        tooltip?: Platform.UIString.LocalizedString;
        jslogContext?: string;
        featureName?: string;
    }): Item;
    /**
     * Appends an item that contains a custom HTML element (for non-native menus only).
     * @param element The custom `Element` to display in the menu item.
     * @param jslogContext An optional string identifying the element for visual logging.
     * @returns The newly created `Item`.
     */
    appendCustomItem(element: Element, jslogContext?: string): Item;
    /**
     * Appends a visual separator to this section.
     * @returns The newly created separator `Item`.
     */
    appendSeparator(): Item;
    /**
     * Appends an item that triggers a registered `Action`.
     * The item's label, handler, enabled state, and shortcut are derived from the action.
     * @param actionId The ID of the action to append.
     * @param label Optional label to override the action's title.
     * @param optional If true and the action is not registered, this method does nothing.
     */
    appendAction(actionId: string, label?: string, optional?: boolean, jslogContext?: string, feature?: string): void;
    /**
     * Appends an item that, when clicked, opens a sub-menu.
     * @param label The text to display for the sub-menu item.
     * @param disabled Whether the sub-menu item should be disabled.
     * @param jslogContext An optional string identifying the element for visual logging.
     * @returns The newly created `SubMenu` instance.
     */
    appendSubMenuItem(label: string, disabled?: boolean, jslogContext?: string, featureName?: string): SubMenu;
    /**
     * Appends a checkbox item to this section.
     * @param label The text to display for the checkbox item.
     * @param handler The function to execute when the checkbox state changes.
     * @param options Optional settings for the checkbox item.
     * @returns The newly created checkbox `Item`.
     */
    appendCheckboxItem(label: string, handler: () => void, options?: {
        checked?: boolean;
        disabled?: boolean;
        experimental?: boolean;
        additionalElement?: Element;
        tooltip?: Platform.UIString.LocalizedString;
        jslogContext?: string;
        featureName?: string;
    }): Item;
}
/**
 * Represents an `Item` that opens a nested menu (a sub-menu).
 * It extends `Item` and manages its own set of `Section`s.
 * @property sections - A map of section names to `Section` objects.
 */
export declare class SubMenu extends Item {
    readonly sections: Map<string, Section>;
    private readonly sectionList;
    constructor(contextMenu: ContextMenu | null, label?: string, disabled?: boolean, jslogContext?: string, featureName?: string);
    /**
     * Initializes the standard sections for this sub-menu based on `ContextMenu.groupWeights`.
     */
    init(): void;
    /**
     * Retrieves an existing section by its name or creates a new one if it doesn't exist.
     *
     * If a section with the given `name` (or 'default' if `name` is unspecified) is not found,
     * a new `Section` instance is created, stored internally for future lookups by that name,
     * and added to the ordered list of sections for this submenu.
     *
     * @param name The optional name of the section. Defaults to 'default' if not provided.
     * @returns The `Section` object, either pre-existing or newly created.
     */
    section(name?: string): Section;
    /**
     * Retrieves or creates the 'header' section.
     * @returns The 'header' `Section` object.
     */
    headerSection(): Section;
    /**
     * Retrieves or creates the 'new' section.
     * @returns The 'new' `Section` object.
     */
    newSection(): Section;
    /**
     * Retrieves or creates the 'reveal' section.
     * @returns The 'reveal' `Section` object.
     */
    revealSection(): Section;
    /**
     * Retrieves or creates the 'clipboard' section.
     * @returns The 'clipboard' `Section` object.
     */
    clipboardSection(): Section;
    /**
     * Retrieves or creates the 'edit' section.
     * @returns The 'edit' `Section` object.
     */
    editSection(): Section;
    /**
     * Retrieves or creates the 'debug' section.
     * @returns The 'debug' `Section` object.
     */
    debugSection(): Section;
    /**
     * Retrieves or creates the 'view' section.
     * @returns The 'view' `Section` object.
     */
    viewSection(): Section;
    /**
     * Retrieves or creates the 'default' section.
     * This is often used for general-purpose menu items.
     * @returns The 'default' `Section` object.
     */
    defaultSection(): Section;
    /**
     * Retrieves or creates the 'override' section.
     * @returns The 'override' `Section` object.
     */
    overrideSection(): Section;
    /**
     * Retrieves or creates the 'save' section.
     * @returns The 'save' `Section` object.
     */
    saveSection(): Section;
    /**
     * Retrieves or creates the 'annotation' section.
     * @returns The 'annotation' `Section` object.
     */
    annotationSection(): Section;
    /**
     * Retrieves or creates the 'footer' section.
     * @returns The 'footer' `Section` object.
     */
    footerSection(): Section;
    buildDescriptor(): SoftContextMenuDescriptor | Host.InspectorFrontendHostAPI.ContextMenuDescriptor;
    /**
     * Appends registered context menu items that are configured to appear under a specific `location` path.
     * Items are sorted by their `order` property.
     * Experimental items are only added if their corresponding experiment is enabled.
     * @param location The base location path (e.g. 'mainMenu'). Items with locations like 'mainMenu/default' will be appended.
     */
    appendItemsAtLocation(location: string): void;
}
/**
 * Options for configuring a `ContextMenu`.
 */
export interface ContextMenuOptions {
    /**
     * Whether to use the soft (HTML-based) menu implementation.
     * Defaults to `false` unless globally overridden or in hosted mode.
     * Set this to true ONLY in exceptional cases where native context menu lacks desired functionality (e.g. keeping menu open after clicking items etc.)
     */
    useSoftMenu?: boolean;
    /** Whether the menu should remain open after an item is clicked. Defaults to `false`. */
    keepOpen?: boolean;
    /** A callback function that is invoked when a soft menu is closed. */
    onSoftMenuClosed?: () => void;
    /** The x-coordinate for the menu's position. Defaults to the mouse event's x-coordinate. */
    x?: number;
    /** The y-coordinate for the menu's position. Defaults to the mouse event's y-coordinate. */
    y?: number;
}
/**
 * Represents the main context menu. It extends `SubMenu` because a `ContextMenu`
 * is essentially a top-level menu that can contain sections and items, similar to a sub-menu.
 * It handles the display of the menu (either soft or native), event handling, and
 * integration with registered context menu providers.
 */
export declare class ContextMenu extends SubMenu {
    #private;
    protected contextMenu: this;
    private pendingTargets;
    private readonly event;
    private readonly useSoftMenu;
    private readonly keepOpen;
    private x;
    private y;
    private onSoftMenuClosed?;
    private readonly handlers;
    idInternal: number;
    private softMenu?;
    private contextMenuLabel?;
    private openHostedMenu;
    private eventTarget;
    private loggableParent;
    /**
     * Creates an instance of `ContextMenu`.
     * @param event The mouse event that triggered the menu.
     * @param options Optional configuration for the context menu.
     */
    constructor(event: Event, options?: ContextMenuOptions);
    /**
     * Initializes global settings for context menus, such as listening for
     * commands from the host to toggle soft menu usage.
     */
    static initialize(): void;
    /**
     * Installs a global context menu handler on the provided document's body.
     * This handler will create and show a `ContextMenu` when a contextmenu event is detected.
     * @param doc The `Document` to install the handler on.
     */
    static installHandler(doc: Document): void;
    /**
     * Generates the next unique ID for a menu item within this `ContextMenu`.
     * @returns A unique number for the item ID.
     */
    nextId(): number;
    /**
     * Checks if a native (hosted) context menu is currently open.
     * @returns `true` if a native menu is open, `false` otherwise.
     */
    isHostedMenuOpen(): boolean;
    /**
     * Retrieves the item descriptors if a soft menu is currently active.
     * @returns An array of `SoftContextMenuDescriptor`s or an empty array if no soft menu is active.
     */
    getItems(): SoftContextMenuDescriptor[];
    /**
     * Sets the checked state of an item in an active soft menu.
     * @param item The descriptor of the item to update.
     * @param checked `true` to check the item, `false` to uncheck it.
     */
    setChecked(item: SoftContextMenuDescriptor, checked: boolean): void;
    /**
     * Shows the context menu. This involves loading items from registered providers
     * and then displaying either a soft or native menu.
     */
    show(): Promise<void>;
    /**
     * Discards (closes) the soft context menu if it's currently shown.
     */
    discard(): void;
    private registerLoggablesWithin;
    /**
     * Sets the x-coordinate for the menu's position.
     * @param x The new x-coordinate.
     */
    setX(x: number): void;
    /**
     * Sets the y-coordinate for the menu's position.
     * @param y The new y-coordinate.
     */
    setY(y: number): void;
    /**
     * Associates a handler function with a menu item ID.
     * @param id The ID of the menu item.
     * @param handler The function to execute when the item is selected.
     */
    setHandler(id: number, handler: () => void): void;
    /**
     * Invokes the handler associated with the given menu item ID.
     * @param id The ID of the selected menu item.
     */
    invokeHandler(id: number): void;
    private buildMenuDescriptors;
    private onItemSelected;
    private itemSelected;
    private menuCleared;
    /**
     * Appends the `target` to the list of pending targets for which context menu providers
     * will be loaded when showing the context menu.
     *
     * @param target an object for which we can have registered menu item providers.
     */
    appendApplicableItems(target: unknown): void;
    /**
     * Marks the soft context menu (if one exists) to visually indicate that its items behave like checkboxes.
     */
    markAsMenuItemCheckBox(): void;
    private static pendingMenu;
    private static useSoftMenu;
    static readonly groupWeights: string[];
}
/**
 * @property jslogContext - Reflects the `"jslogContext"` attribute.
 * @property populateMenuCall - Callback function to populate the menu.
 * @property softMenu - Reflects the `"soft-menu"` attribute.
 * @property keepOpen -Reflects the `"keep-open"` attribute.
 * @property iconName - Reflects the `"icon-name"` attribute.
 * @property disabled - Reflects the `"disabled"` attribute.
 * @attribute soft-menu - Whether to use the soft menu implementation.
 * @attribute keep-open - Whether the menu should stay open after an item is clicked.
 * @attribute icon-name - Name of the icon to display on the button.
 * @attribute disabled - Whether the menu button is disabled
 * @attribute jslogContext - The jslog context for the button.
 *
 */
export declare class MenuButton extends HTMLElement {
    #private;
    static readonly observedAttributes: string[];
    /**
     * Sets the callback function used to populate the context menu when the button is clicked.
     * @param populateCall A function that takes a `ContextMenu` instance and adds items to it.
     */
    set populateMenuCall(populateCall: (arg0: ContextMenu) => void);
    /**
     * Reflects the `soft-menu` attribute. If true, uses the `SoftContextMenu` implementation.
     * @default false
     */
    get softMenu(): boolean;
    set softMenu(softMenu: boolean);
    /**
     * Reflects the `keep-open` attribute. If true, the menu stays open after an item click.
     * @default false
     */
    get keepOpen(): boolean;
    set keepOpen(keepOpen: boolean);
    /**
     * Reflects the `icon-name` attribute. Sets the icon to display on the button.
     */
    set iconName(iconName: string);
    get iconName(): string | null;
    /**
     * Reflects the `jslogContext` attribute. Sets the visual logging context for the button.
     */
    set jslogContext(jslogContext: string);
    get jslogContext(): string | null;
    /**
     * Reflects the `disabled` attribute. If true, the button cannot be clicked.
     * @default false
     */
    get disabled(): boolean;
    set disabled(disabled: boolean);
    attributeChangedCallback(_: string, oldValue: string, newValue: string): void;
    connectedCallback(): void;
}
export interface Provider<T> {
    /**
     * Appends menu items to the `contextMenu` for the given `target` object.
     * @param event The event that triggered the context menu.
     * @param contextMenu The `ContextMenu` to which items should be appended.
     * @param target The object for which context menu items are being provided.
     */
    appendApplicableItems(event: Event, contextMenu: ContextMenu, target: T): void;
}
/**
 * Registers a new context menu provider.
 * @template T The type of the object for which the provider supplies context menu items.
 * @param registration The provider registration object, specifying context types and how to load the provider.
 */
export declare function registerProvider<T>(registration: ProviderRegistration<T>): void;
/**
 * Registers a new context menu item.
 * These items are typically actions that appear in predefined locations in the menu.
 * @param registration The item registration object, specifying its location, action ID, and optional order/experiment.
 */
export declare function registerItem(registration: ContextMenuItemRegistration): void;
/**
 * Attempts to remove a registered context menu item.
 * The item is identified by its `actionId` and `location`.
 * @param registration The registration details of the item to remove.
 * @returns `true` if the item was found and removed, `false` otherwise.
 */
export declare function maybeRemoveItem(registration: ContextMenuItemRegistration): boolean;
/**
 * Defines specific locations within the DevTools UI where context menu items can be registered.
 */
export declare const enum ItemLocation {
    DEVICE_MODE_MENU_SAVE = "deviceModeMenu/save",
    MAIN_MENU = "mainMenu",
    MAIN_MENU_DEFAULT = "mainMenu/default",
    MAIN_MENU_FOOTER = "mainMenu/footer",
    MAIN_MENU_HELP_DEFAULT = "mainMenuHelp/default",
    NAVIGATOR_MENU_DEFAULT = "navigatorMenu/default",
    PROFILER_MENU_DEFAULT = "profilerMenu/default",
    TIMELINE_MENU_OPEN = "timelineMenu/open"
}
export interface ProviderRegistration<T> {
    /** A function that returns an array of constructor functions that this provider applies to. */
    contextTypes: () => Array<abstract new (...any: any[]) => T>;
    /** A function that asynchronously loads the provider instance. */
    loadProvider: () => Promise<Provider<T>>;
    /** Optional. The experiment that enables this provider. */
    experiment?: Root.Runtime.ExperimentName;
}
export interface ContextMenuItemRegistration {
    /** The location in the menu where this item should appear. */
    location: ItemLocation;
    /** The ID of the action to be triggered by this item. */
    actionId: string;
    /** Optional. A number used for sorting items within the same location. Lower numbers appear first. */
    order?: number;
    /** Optional. The experiment that enables this item. */
    experiment?: Root.Runtime.ExperimentName;
}

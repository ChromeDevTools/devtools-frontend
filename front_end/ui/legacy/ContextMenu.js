// Copyright 2009 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import * as Buttons from '../components/buttons/buttons.js';
import { html, render } from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';
import { ActionRegistry } from './ActionRegistry.js';
import { ShortcutRegistry } from './ShortcutRegistry.js';
import { SoftContextMenu } from './SoftContextMenu.js';
import { deepElementFromEvent, maybeCreateNewBadge } from './UIUtils.js';
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
export class Item {
    typeInternal;
    label;
    accelerator;
    featureName;
    previewFeature;
    disabled;
    checked;
    isDevToolsPerformanceMenuItem;
    contextMenu;
    idInternal;
    customElement;
    shortcut;
    #tooltip;
    jslogContext;
    constructor(contextMenu, type, label, isPreviewFeature, disabled, checked, accelerator, tooltip, jslogContext, featureName) {
        this.typeInternal = type;
        this.label = label;
        this.previewFeature = Boolean(isPreviewFeature);
        this.accelerator = accelerator;
        this.disabled = disabled;
        this.checked = checked;
        this.isDevToolsPerformanceMenuItem = false;
        this.contextMenu = contextMenu;
        this.idInternal = undefined;
        this.#tooltip = tooltip;
        if (type === 'item' || type === 'checkbox') {
            this.idInternal = contextMenu ? contextMenu.nextId() : 0;
        }
        this.jslogContext = jslogContext;
        this.featureName = featureName;
    }
    /**
     * Returns the unique ID of this item.
     * @throws If the item ID was not set (e.g. for a separator).
     */
    id() {
        if (this.idInternal === undefined) {
            throw new Error('Tried to access a ContextMenu Item ID but none was set.');
        }
        return this.idInternal;
    }
    /**
     * Returns the type of this item (e.g. 'item', 'checkbox').
     */
    type() {
        return this.typeInternal;
    }
    /**
     * Returns whether this item is marked as a preview feature (experimental).
     */
    isPreviewFeature() {
        return this.previewFeature;
    }
    /**
     * Returns whether this item is enabled.
     */
    isEnabled() {
        return !this.disabled;
    }
    /**
     * Sets the enabled state of this item.
     * @param enabled True to enable the item, false to disable it.
     */
    setEnabled(enabled) {
        this.disabled = !enabled;
    }
    /**
     * Builds a descriptor object for this item.
     * This descriptor is used to create the actual menu item in either
     * a soft-rendered menu or a native menu.
     * @returns The descriptor for the item.
     * @throws If the item type is invalid.
     */
    buildDescriptor() {
        switch (this.typeInternal) {
            case 'item': {
                const result = {
                    type: 'item',
                    id: this.idInternal,
                    label: this.label,
                    isExperimentalFeature: this.previewFeature,
                    enabled: !this.disabled,
                    checked: undefined,
                    subItems: undefined,
                    tooltip: this.#tooltip,
                    jslogContext: this.jslogContext,
                    featureName: this.featureName,
                };
                if (this.customElement) {
                    result.element = this.customElement;
                }
                if (this.shortcut) {
                    result.shortcut = this.shortcut;
                }
                if (this.accelerator) {
                    result.accelerator = this.accelerator;
                    if (this.isDevToolsPerformanceMenuItem) {
                        result.isDevToolsPerformanceMenuItem = true;
                    }
                }
                return result;
            }
            case 'separator': {
                return {
                    type: 'separator',
                    id: undefined,
                    label: undefined,
                    enabled: undefined,
                    checked: undefined,
                    subItems: undefined,
                };
            }
            case 'checkbox': {
                const result = {
                    type: 'checkbox',
                    id: this.idInternal,
                    label: this.label,
                    checked: Boolean(this.checked),
                    isExperimentalFeature: this.previewFeature,
                    enabled: !this.disabled,
                    subItems: undefined,
                    tooltip: this.#tooltip,
                    jslogContext: this.jslogContext,
                };
                if (this.customElement) {
                    result.element = this.customElement;
                }
                return result;
            }
        }
        throw new Error('Invalid item type:' + this.typeInternal);
    }
    /**
     * Sets a keyboard accelerator for this item.
     * @param key The key code for the accelerator.
     * @param modifiers An array of modifiers (e.g. Ctrl, Shift).
     */
    setAccelerator(key, modifiers) {
        const modifierSum = modifiers.reduce((result, modifier) => result + ShortcutRegistry.instance().devToolsToChromeModifier(modifier), 0);
        this.accelerator = { keyCode: key.code, modifiers: modifierSum };
    }
    /**
     * This influences whether accelerators will be shown for native menus on Mac.
     * Use this ONLY for performance menus and ONLY where accelerators are critical
     * for a smooth user journey and heavily context dependent.
     * @param isDevToolsPerformanceMenuItem True if this is a DevTools performance menu item.
     */
    setIsDevToolsPerformanceMenuItem(isDevToolsPerformanceMenuItem) {
        this.isDevToolsPerformanceMenuItem = isDevToolsPerformanceMenuItem;
    }
    /**
     * Sets a display string for the shortcut associated with this item.
     * This is typically used when the shortcut is managed by `ActionRegistry`.
     * @param shortcut The shortcut string to display.
     */
    setShortcut(shortcut) {
        this.shortcut = shortcut;
    }
}
/**
 * Represents a section within a `ContextMenu` or `SubMenu`.
 * Sections are used to group related items and are often visually separated.
 * @property items - The list of items in this section.
 * @property contextMenu - The parent `ContextMenu` or `null`.
 */
export class Section {
    contextMenu;
    items;
    constructor(contextMenu) {
        this.contextMenu = contextMenu;
        this.items = [];
    }
    /**
     * Appends a standard clickable item to this section.
     * @param label The text to display for the item.
     * @param handler The function to execute when the item is clicked.
     * @param options Optional settings for the item.
     * @returns The newly created `Item`.
     */
    appendItem(label, handler, options) {
        const item = new Item(this.contextMenu, 'item', label, options?.isPreviewFeature, options?.disabled, undefined, options?.accelerator, options?.tooltip, options?.jslogContext, options?.featureName);
        if (options?.additionalElement) {
            item.customElement = options?.additionalElement;
        }
        this.items.push(item);
        if (this.contextMenu) {
            this.contextMenu.setHandler(item.id(), handler);
        }
        return item;
    }
    /**
     * Appends an item that contains a custom HTML element (for non-native menus only).
     * @param element The custom `Element` to display in the menu item.
     * @param jslogContext An optional string identifying the element for visual logging.
     * @returns The newly created `Item`.
     */
    appendCustomItem(element, jslogContext) {
        const item = new Item(this.contextMenu, 'item', undefined, undefined, undefined, undefined, undefined, undefined, jslogContext);
        item.customElement = element;
        this.items.push(item);
        return item;
    }
    /**
     * Appends a visual separator to this section.
     * @returns The newly created separator `Item`.
     */
    appendSeparator() {
        const item = new Item(this.contextMenu, 'separator');
        this.items.push(item);
        return item;
    }
    /**
     * Appends an item that triggers a registered `Action`.
     * The item's label, handler, enabled state, and shortcut are derived from the action.
     * @param actionId The ID of the action to append.
     * @param label Optional label to override the action's title.
     * @param optional If true and the action is not registered, this method does nothing.
     */
    appendAction(actionId, label, optional, jslogContext, feature) {
        if (optional && !ActionRegistry.instance().hasAction(actionId)) {
            return;
        }
        const action = ActionRegistry.instance().getAction(actionId);
        if (!label) {
            label = action.title();
        }
        const promotionId = action.featurePromotionId();
        let additionalElement = undefined;
        if (promotionId) {
            additionalElement = maybeCreateNewBadge(promotionId);
        }
        const result = this.appendItem(label, action.execute.bind(action), { disabled: !action.enabled(), jslogContext: jslogContext ?? actionId, featureName: feature, additionalElement });
        const shortcut = ShortcutRegistry.instance().shortcutTitleForAction(actionId);
        const keyAndModifier = ShortcutRegistry.instance().keyAndModifiersForAction(actionId);
        if (keyAndModifier) {
            result.setAccelerator(keyAndModifier.key, [keyAndModifier.modifier]);
        }
        if (shortcut) {
            result.setShortcut(shortcut);
        }
    }
    /**
     * Appends an item that, when clicked, opens a sub-menu.
     * @param label The text to display for the sub-menu item.
     * @param disabled Whether the sub-menu item should be disabled.
     * @param jslogContext An optional string identifying the element for visual logging.
     * @returns The newly created `SubMenu` instance.
     */
    appendSubMenuItem(label, disabled, jslogContext, featureName) {
        const item = new SubMenu(this.contextMenu, label, disabled, jslogContext, featureName);
        item.init();
        this.items.push(item);
        return item;
    }
    /**
     * Appends a checkbox item to this section.
     * @param label The text to display for the checkbox item.
     * @param handler The function to execute when the checkbox state changes.
     * @param options Optional settings for the checkbox item.
     * @returns The newly created checkbox `Item`.
     */
    appendCheckboxItem(label, handler, options) {
        const item = new Item(this.contextMenu, 'checkbox', label, options?.experimental, options?.disabled, options?.checked, undefined, options?.tooltip, options?.jslogContext, options?.featureName);
        this.items.push(item);
        if (this.contextMenu) {
            this.contextMenu.setHandler(item.id(), handler);
        }
        if (options?.additionalElement) {
            item.customElement = options.additionalElement;
        }
        return item;
    }
}
/**
 * Represents an `Item` that opens a nested menu (a sub-menu).
 * It extends `Item` and manages its own set of `Section`s.
 * @property sections - A map of section names to `Section` objects.
 */
export class SubMenu extends Item {
    sections;
    sectionList;
    constructor(contextMenu, label, disabled, jslogContext, featureName) {
        super(contextMenu, 'subMenu', label, undefined, disabled, undefined, undefined, undefined, jslogContext, featureName);
        this.sections = new Map();
        this.sectionList = [];
    }
    /**
     * Initializes the standard sections for this sub-menu based on `ContextMenu.groupWeights`.
     */
    init() {
        ContextMenu.groupWeights.forEach(name => this.section(name));
    }
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
    section(name) {
        if (!name) {
            name = 'default';
        }
        let section = name ? this.sections.get(name) : null;
        if (!section) {
            section = new Section(this.contextMenu);
            if (name) {
                this.sections.set(name, section);
                this.sectionList.push(section);
            }
            else {
                this.sectionList.splice(ContextMenu.groupWeights.indexOf('default'), 0, section);
            }
        }
        return section;
    }
    /**
     * Retrieves or creates the 'header' section.
     * @returns The 'header' `Section` object.
     */
    headerSection() {
        return this.section('header');
    }
    /**
     * Retrieves or creates the 'new' section.
     * @returns The 'new' `Section` object.
     */
    newSection() {
        return this.section('new');
    }
    /**
     * Retrieves or creates the 'reveal' section.
     * @returns The 'reveal' `Section` object.
     */
    revealSection() {
        return this.section('reveal');
    }
    /**
     * Retrieves or creates the 'clipboard' section.
     * @returns The 'clipboard' `Section` object.
     */
    clipboardSection() {
        return this.section('clipboard');
    }
    /**
     * Retrieves or creates the 'edit' section.
     * @returns The 'edit' `Section` object.
     */
    editSection() {
        return this.section('edit');
    }
    /**
     * Retrieves or creates the 'debug' section.
     * @returns The 'debug' `Section` object.
     */
    debugSection() {
        return this.section('debug');
    }
    /**
     * Retrieves or creates the 'view' section.
     * @returns The 'view' `Section` object.
     */
    viewSection() {
        return this.section('view');
    }
    /**
     * Retrieves or creates the 'default' section.
     * This is often used for general-purpose menu items.
     * @returns The 'default' `Section` object.
     */
    defaultSection() {
        return this.section('default');
    }
    /**
     * Retrieves or creates the 'override' section.
     * @returns The 'override' `Section` object.
     */
    overrideSection() {
        return this.section('override');
    }
    /**
     * Retrieves or creates the 'save' section.
     * @returns The 'save' `Section` object.
     */
    saveSection() {
        return this.section('save');
    }
    /**
     * Retrieves or creates the 'annotation' section.
     * @returns The 'annotation' `Section` object.
     */
    annotationSection() {
        return this.section('annotation');
    }
    /**
     * Retrieves or creates the 'footer' section.
     * @returns The 'footer' `Section` object.
     */
    footerSection() {
        return this.section('footer');
    }
    buildDescriptor() {
        const result = {
            type: 'subMenu',
            label: this.label,
            accelerator: this.accelerator,
            isDevToolsPerformanceMenuItem: this.accelerator ? this.isDevToolsPerformanceMenuItem : undefined,
            isExperimentalFeature: this.previewFeature,
            enabled: !this.disabled,
            subItems: [],
            id: undefined,
            checked: undefined,
            jslogContext: this.jslogContext,
            featureName: this.featureName,
        };
        const nonEmptySections = this.sectionList.filter(section => Boolean(section.items.length));
        for (const section of nonEmptySections) {
            for (const item of section.items) {
                if (!result.subItems) {
                    result.subItems = [];
                }
                result.subItems.push(item.buildDescriptor());
            }
            if (section !== nonEmptySections[nonEmptySections.length - 1]) {
                if (!result.subItems) {
                    result.subItems = [];
                }
                result.subItems.push({
                    type: 'separator',
                    id: undefined,
                    subItems: undefined,
                    checked: undefined,
                    enabled: undefined,
                    label: undefined,
                });
            }
        }
        return result;
    }
    /**
     * Appends registered context menu items that are configured to appear under a specific `location` path.
     * Items are sorted by their `order` property.
     * Experimental items are only added if their corresponding experiment is enabled.
     * @param location The base location path (e.g. 'mainMenu'). Items with locations like 'mainMenu/default' will be appended.
     */
    appendItemsAtLocation(location) {
        const items = getRegisteredItems();
        items.sort((firstItem, secondItem) => {
            const order1 = firstItem.order || 0;
            const order2 = secondItem.order || 0;
            return order1 - order2;
        });
        for (const item of items) {
            if (item.experiment && !Root.Runtime.experiments.isEnabled(item.experiment)) {
                continue;
            }
            const itemLocation = item.location;
            const actionId = item.actionId;
            if (!itemLocation?.startsWith(location + '/')) {
                continue;
            }
            const section = itemLocation.substr(location.length + 1);
            if (!section || section.includes('/')) {
                continue;
            }
            if (actionId) {
                this.section(section).appendAction(actionId);
            }
        }
    }
}
const MENU_ITEM_HEIGHT_FOR_LOGGING = 20;
const MENU_ITEM_WIDTH_FOR_LOGGING = 200;
/**
 * Represents the main context menu. It extends `SubMenu` because a `ContextMenu`
 * is essentially a top-level menu that can contain sections and items, similar to a sub-menu.
 * It handles the display of the menu (either soft or native), event handling, and
 * integration with registered context menu providers.
 */
export class ContextMenu extends SubMenu {
    contextMenu;
    pendingTargets;
    event;
    useSoftMenu;
    keepOpen;
    x;
    y;
    onSoftMenuClosed;
    handlers;
    idInternal;
    softMenu;
    contextMenuLabel;
    openHostedMenu;
    eventTarget;
    loggableParent = null;
    /**
     * Creates an instance of `ContextMenu`.
     * @param event The mouse event that triggered the menu.
     * @param options Optional configuration for the context menu.
     */
    constructor(event, options = {}) {
        super(null);
        const mouseEvent = event;
        this.contextMenu = this;
        super.init();
        this.pendingTargets = [];
        this.event = mouseEvent;
        this.eventTarget = this.event.target;
        this.useSoftMenu = Boolean(options.useSoftMenu);
        this.keepOpen = Boolean(options.keepOpen);
        this.x = options.x === undefined ? mouseEvent.x : options.x;
        this.y = options.y === undefined ? mouseEvent.y : options.y;
        this.onSoftMenuClosed = options.onSoftMenuClosed;
        this.handlers = new Map();
        this.idInternal = 0;
        this.openHostedMenu = null;
        let target = (deepElementFromEvent(event) || event.target);
        if (target) {
            this.appendApplicableItems(target);
            while (target instanceof Element && !target.hasAttribute('jslog')) {
                target = target.parentElementOrShadowHost() ?? null;
            }
            if (target instanceof Element) {
                this.loggableParent = target;
            }
        }
    }
    /**
     * Initializes global settings for context menus, such as listening for
     * commands from the host to toggle soft menu usage.
     */
    static initialize() {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.SetUseSoftMenu, setUseSoftMenu);
        /**
         * Sets the global preference for using soft menus.
         * @param event The event containing the new preference.
         */
        function setUseSoftMenu(event) {
            ContextMenu.useSoftMenu = event.data;
        }
    }
    /**
     * Installs a global context menu handler on the provided document's body.
     * This handler will create and show a `ContextMenu` when a contextmenu event is detected.
     * @param doc The `Document` to install the handler on.
     */
    static installHandler(doc) {
        doc.body.addEventListener('contextmenu', handler, false);
        function handler(event) {
            const contextMenu = new ContextMenu(event);
            void contextMenu.show();
        }
    }
    /**
     * Generates the next unique ID for a menu item within this `ContextMenu`.
     * @returns A unique number for the item ID.
     */
    nextId() {
        return this.idInternal++;
    }
    /**
     * Checks if a native (hosted) context menu is currently open.
     * @returns `true` if a native menu is open, `false` otherwise.
     */
    isHostedMenuOpen() {
        return Boolean(this.openHostedMenu);
    }
    /**
     * Retrieves the item descriptors if a soft menu is currently active.
     * @returns An array of `SoftContextMenuDescriptor`s or an empty array if no soft menu is active.
     */
    getItems() {
        return this.softMenu?.getItems() || [];
    }
    /**
     * Sets the checked state of an item in an active soft menu.
     * @param item The descriptor of the item to update.
     * @param checked `true` to check the item, `false` to uncheck it.
     */
    setChecked(item, checked) {
        this.softMenu?.setChecked(item, checked);
    }
    /**
     * Shows the context menu. This involves loading items from registered providers
     * and then displaying either a soft or native menu.
     */
    async show() {
        ContextMenu.pendingMenu = this;
        this.event.consume(true);
        const loadedProviders = await Promise.all(this.pendingTargets.map(async (target) => {
            const providers = await loadApplicableRegisteredProviders(target);
            return { target, providers };
        }));
        // After loading all providers, the contextmenu might be hidden again, so bail out.
        if (ContextMenu.pendingMenu !== this) {
            return;
        }
        ContextMenu.pendingMenu = null;
        for (const { target, providers } of loadedProviders) {
            for (const provider of providers) {
                provider.appendApplicableItems(this.event, this, target);
            }
        }
        this.pendingTargets = [];
        this.#show();
    }
    /**
     * Discards (closes) the soft context menu if it's currently shown.
     */
    discard() {
        if (this.softMenu) {
            this.softMenu.discard();
        }
    }
    registerLoggablesWithin(descriptors, parent) {
        for (const descriptor of descriptors) {
            if (descriptor.jslogContext) {
                if (descriptor.type === 'checkbox') {
                    VisualLogging.registerLoggable(descriptor, `${VisualLogging.toggle().track({ click: true }).context(descriptor.jslogContext)}`, parent || descriptors, new DOMRect(0, 0, MENU_ITEM_WIDTH_FOR_LOGGING, MENU_ITEM_HEIGHT_FOR_LOGGING));
                }
                else if (descriptor.type === 'item') {
                    VisualLogging.registerLoggable(descriptor, `${VisualLogging.action().track({ click: true }).context(descriptor.jslogContext)}`, parent || descriptors, new DOMRect(0, 0, MENU_ITEM_WIDTH_FOR_LOGGING, MENU_ITEM_HEIGHT_FOR_LOGGING));
                }
                else if (descriptor.type === 'subMenu') {
                    VisualLogging.registerLoggable(descriptor, `${VisualLogging.item().context(descriptor.jslogContext)}`, parent || descriptors, new DOMRect(0, 0, MENU_ITEM_WIDTH_FOR_LOGGING, MENU_ITEM_HEIGHT_FOR_LOGGING));
                }
                if (descriptor.subItems) {
                    this.registerLoggablesWithin(descriptor.subItems, descriptor);
                }
            }
        }
    }
    #show() {
        if (!this.eventTarget) {
            return;
        }
        const menuObject = this.buildMenuDescriptors();
        const ownerDocument = this.eventTarget.ownerDocument;
        let useSoftMenu = this.useSoftMenu || ContextMenu.useSoftMenu ||
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode();
        // Allow force opening a Native menu when DevTools is under test.
        // This allows opening DevTools on DevTools
        if (!this.useSoftMenu && ContextMenu.useSoftMenu && this.event.altKey) {
            useSoftMenu = false;
        }
        if (useSoftMenu) {
            this.softMenu = new SoftContextMenu(menuObject, this.itemSelected.bind(this), this.keepOpen, undefined, this.onSoftMenuClosed, this.loggableParent);
            // let soft context menu focus on the first item when the event is triggered by a non-mouse event
            // add another check of button value to differentiate mouse event with 'shift + f10' keyboard event
            const isMouseEvent = this.event.pointerType === 'mouse' && this.event.button >= 0;
            this.softMenu.setFocusOnTheFirstItem(!isMouseEvent);
            this.softMenu.show((ownerDocument), new AnchorBox(this.x, this.y, 0, 0));
            if (this.contextMenuLabel) {
                this.softMenu.setContextMenuElementLabel(this.contextMenuLabel);
            }
        }
        else {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.showContextMenuAtPoint(this.x, this.y, menuObject, (ownerDocument));
            function listenToEvents() {
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.ContextMenuCleared, this.menuCleared, this);
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.ContextMenuItemSelected, this.onItemSelected, this);
            }
            VisualLogging.registerLoggable(menuObject, `${VisualLogging.menu()}`, this.loggableParent, new DOMRect(0, 0, MENU_ITEM_WIDTH_FOR_LOGGING, MENU_ITEM_HEIGHT_FOR_LOGGING * menuObject.length));
            this.registerLoggablesWithin(menuObject);
            this.openHostedMenu = menuObject;
            // showContextMenuAtPoint call above synchronously issues a clear event for previous context menu (if any),
            // so we skip it before subscribing to the clear event.
            queueMicrotask(listenToEvents.bind(this));
        }
    }
    /**
     * Sets the x-coordinate for the menu's position.
     * @param x The new x-coordinate.
     */
    setX(x) {
        this.x = x;
    }
    /**
     * Sets the y-coordinate for the menu's position.
     * @param y The new y-coordinate.
     */
    setY(y) {
        this.y = y;
    }
    /**
     * Associates a handler function with a menu item ID.
     * @param id The ID of the menu item.
     * @param handler The function to execute when the item is selected.
     */
    setHandler(id, handler) {
        if (handler) {
            this.handlers.set(id, handler);
        }
    }
    /**
     * Invokes the handler associated with the given menu item ID.
     * @param id The ID of the selected menu item.
     */
    invokeHandler(id) {
        const handler = this.handlers.get(id);
        if (handler) {
            handler.call(this);
        }
    }
    buildMenuDescriptors() {
        return super.buildDescriptor().subItems;
    }
    onItemSelected(event) {
        this.itemSelected(event.data);
    }
    itemSelected(id) {
        this.invokeHandler(id);
        // Collect all features used along the way when searching for the clicked item.
        // I.e. a 'feature' on a submenu should be counted as 'used' if its submenu items are clicked.
        const featuresUsed = [];
        if (this.openHostedMenu) {
            const itemWithId = (items, id) => {
                for (const item of items) {
                    if (item.id === id) {
                        if (item.featureName) {
                            featuresUsed.push(item.featureName);
                        }
                        return item;
                    }
                    const subitem = item.subItems && itemWithId(item.subItems, id);
                    if (subitem) {
                        // Record submenu feature.
                        if (item.featureName) {
                            featuresUsed.push(item.featureName);
                        }
                        return subitem;
                    }
                }
                return null;
            };
            const item = itemWithId(this.openHostedMenu, id);
            if (item?.jslogContext) {
                void VisualLogging.logClick(item, new MouseEvent('click'));
            }
            if (item && featuresUsed.length > 0) {
                featuresUsed.map(feature => Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordNewBadgeUsage(feature));
            }
        }
        this.menuCleared();
    }
    menuCleared() {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(Host.InspectorFrontendHostAPI.Events.ContextMenuCleared, this.menuCleared, this);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(Host.InspectorFrontendHostAPI.Events.ContextMenuItemSelected, this.onItemSelected, this);
        if (this.openHostedMenu) {
            void VisualLogging.logResize(this.openHostedMenu, new DOMRect(0, 0, 0, 0));
        }
        this.openHostedMenu = null;
        if (!this.keepOpen) {
            this.onSoftMenuClosed?.();
        }
    }
    /**
     * Appends the `target` to the list of pending targets for which context menu providers
     * will be loaded when showing the context menu.
     *
     * @param target an object for which we can have registered menu item providers.
     */
    appendApplicableItems(target) {
        if (this.pendingTargets.includes(target)) {
            return;
        }
        this.pendingTargets.push(target);
    }
    /**
     * Marks the soft context menu (if one exists) to visually indicate that its items behave like checkboxes.
     */
    markAsMenuItemCheckBox() {
        if (this.softMenu) {
            this.softMenu.markAsMenuItemCheckBox();
        }
    }
    static pendingMenu = null;
    static useSoftMenu = false;
    static groupWeights = [
        'header', 'new', 'reveal', 'edit', 'clipboard', 'debug', 'view', 'default', 'override', 'save', 'annotation',
        'footer'
    ];
}
/* eslint-disable @devtools/no-lit-render-outside-of-view */
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
export class MenuButton extends HTMLElement {
    static observedAttributes = ['icon-name', 'disabled'];
    #shadow = this.attachShadow({ mode: 'open' });
    #triggerTimeoutId;
    #populateMenuCall;
    /**
     * Sets the callback function used to populate the context menu when the button is clicked.
     * @param populateCall A function that takes a `ContextMenu` instance and adds items to it.
     */
    set populateMenuCall(populateCall) {
        this.#populateMenuCall = populateCall;
    }
    /**
     * Reflects the `soft-menu` attribute. If true, uses the `SoftContextMenu` implementation.
     * @default false
     */
    get softMenu() {
        return Boolean(this.getAttribute('soft-menu'));
    }
    set softMenu(softMenu) {
        this.toggleAttribute('soft-menu', softMenu);
    }
    /**
     * Reflects the `keep-open` attribute. If true, the menu stays open after an item click.
     * @default false
     */
    get keepOpen() {
        return Boolean(this.getAttribute('keep-open'));
    }
    set keepOpen(keepOpen) {
        this.toggleAttribute('keep-open', keepOpen);
    }
    /**
     * Reflects the `icon-name` attribute. Sets the icon to display on the button.
     */
    set iconName(iconName) {
        this.setAttribute('icon-name', iconName);
    }
    get iconName() {
        return this.getAttribute('icon-name');
    }
    /**
     * Reflects the `jslogContext` attribute. Sets the visual logging context for the button.
     */
    set jslogContext(jslogContext) {
        this.setAttribute('jslog', VisualLogging.dropDown(jslogContext).track({ click: true }).toString());
    }
    get jslogContext() {
        return this.getAttribute('jslogContext');
    }
    /**
     * Reflects the `disabled` attribute. If true, the button cannot be clicked.
     * @default false
     */
    get disabled() {
        return this.hasAttribute('disabled');
    }
    set disabled(disabled) {
        this.toggleAttribute('disabled', disabled);
    }
    /**
     * Creates and shows the `ContextMenu`. It calls the `populateMenuCall`
     * callback to fill the menu with items before displaying it relative to the button.
     * Manages the `aria-expanded` state.
     * @param event The event that triggered the menu
     */
    #openMenu(event) {
        this.#triggerTimeoutId = undefined;
        if (!this.#populateMenuCall) {
            return;
        }
        const button = this.#shadow.querySelector('devtools-button');
        const contextMenu = new ContextMenu(event, {
            useSoftMenu: this.softMenu,
            keepOpen: this.keepOpen,
            x: this.getBoundingClientRect().right,
            y: this.getBoundingClientRect().top + this.offsetHeight,
            // Without adding a delay, pointer events will be un-ignored too early, and a single click causes
            // the context menu to be closed and immediately re-opened on Windows (https://crbug.com/339560549).
            onSoftMenuClosed: () => setTimeout(() => button?.removeAttribute('aria-expanded'), 50),
        });
        this.#populateMenuCall(contextMenu);
        button?.setAttribute('aria-expanded', 'true');
        void contextMenu.show();
    }
    /**
     * Handles the click event on the button. It clears any pending trigger timeout
     * and immediately calls the `openMenu` method to show the context menu.
     * @param event The click event.
     */
    #triggerContextMenu(event) {
        const triggerTimeout = 50;
        if (!this.#triggerTimeoutId) {
            this.#triggerTimeoutId = window.setTimeout(this.#openMenu.bind(this, event), triggerTimeout);
        }
    }
    attributeChangedCallback(_, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.#render();
        }
    }
    connectedCallback() {
        this.#render();
    }
    #render() {
        if (!this.iconName) {
            throw new Error('<devtools-menu-button> expects an icon.');
        }
        // clang-format off
        render(html `
        <devtools-button .disabled=${this.disabled}
                         .iconName=${this.iconName}
                         .variant=${"icon" /* Buttons.Button.Variant.ICON */}
                         .title=${this.title}
                         aria-haspopup='menu'
                         @click=${this.#triggerContextMenu}>
        </devtools-button>`, this.#shadow, { host: this });
        // clang-format on
    }
}
customElements.define('devtools-menu-button', MenuButton);
/**
 * Stores all registered context menu provider registrations.
 */
const registeredProviders = [];
/**
 * Registers a new context menu provider.
 * @template T The type of the object for which the provider supplies context menu items.
 * @param registration The provider registration object, specifying context types and how to load the provider.
 */
export function registerProvider(registration) {
    registeredProviders.push(registration);
}
/**
 * Asynchronously loads all registered providers that are applicable to the given `target` object.
 * A provider is applicable if the `target` is an instance of one of its specified `contextTypes`
 * and if its associated experiment (if any) is enabled.
 * @param target The object for which to load applicable providers.
 * @returns A promise that resolves to an array of loaded `Provider` instances.
 */
async function loadApplicableRegisteredProviders(target) {
    const providers = [];
    for (const providerRegistration of registeredProviders) {
        if (!Root.Runtime.Runtime.isDescriptorEnabled({ experiment: providerRegistration.experiment, condition: undefined })) {
            continue;
        }
        if (providerRegistration.contextTypes) {
            for (const contextType of providerRegistration.contextTypes()) {
                if (target instanceof contextType) {
                    providers.push(await providerRegistration.loadProvider());
                }
            }
        }
    }
    return providers;
}
/**
 * Stores all registered context menu item registrations.
 */
const registeredItemsProviders = [];
/**
 * Registers a new context menu item.
 * These items are typically actions that appear in predefined locations in the menu.
 * @param registration The item registration object, specifying its location, action ID, and optional order/experiment.
 */
export function registerItem(registration) {
    registeredItemsProviders.push(registration);
}
/**
 * Attempts to remove a registered context menu item.
 * The item is identified by its `actionId` and `location`.
 * @param registration The registration details of the item to remove.
 * @returns `true` if the item was found and removed, `false` otherwise.
 */
export function maybeRemoveItem(registration) {
    const itemIndex = registeredItemsProviders.findIndex(item => item.actionId === registration.actionId && item.location === registration.location);
    if (itemIndex < 0) {
        return false;
    }
    registeredItemsProviders.splice(itemIndex, 1);
    return true;
}
/**
 * Retrieves all currently registered context menu items.
 * @returns An array of `ContextMenuItemRegistration` objects.
 */
function getRegisteredItems() {
    return registeredItemsProviders;
}
//# sourceMappingURL=ContextMenu.js.map
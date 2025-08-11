/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import type * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as Buttons from '../components/buttons/buttons.js';
import {html, render} from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import {ActionRegistry} from './ActionRegistry.js';
import type {Key, Modifier} from './KeyboardShortcut.js';
import {ShortcutRegistry} from './ShortcutRegistry.js';
import {SoftContextMenu, type SoftContextMenuDescriptor} from './SoftContextMenu.js';
import {deepElementFromEvent} from './UIUtils.js';

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
  private readonly typeInternal: string;
  protected readonly label: string|undefined;
  protected accelerator?: Host.InspectorFrontendHostAPI.AcceleratorDescriptor;
  protected featureName?: string;
  protected readonly previewFeature: boolean;
  protected disabled: boolean|undefined;
  private readonly checked: boolean|undefined;
  protected isDevToolsPerformanceMenuItem: boolean;
  protected contextMenu: ContextMenu|null;
  protected idInternal: number|undefined;
  customElement?: Element;
  private shortcut?: string;
  #tooltip: Common.UIString.LocalizedString|undefined;
  protected jslogContext: string|undefined;

  constructor(
      contextMenu: ContextMenu|null, type: 'checkbox'|'item'|'separator'|'subMenu', label?: string,
      isPreviewFeature?: boolean, disabled?: boolean, checked?: boolean,
      accelerator?: Host.InspectorFrontendHostAPI.AcceleratorDescriptor, tooltip?: Platform.UIString.LocalizedString,
      jslogContext?: string, featureName?: string) {
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
  id(): number {
    if (this.idInternal === undefined) {
      throw new Error('Tried to access a ContextMenu Item ID but none was set.');
    }
    return this.idInternal;
  }

  /**
   * Returns the type of this item (e.g. 'item', 'checkbox').
   */
  type(): string {
    return this.typeInternal;
  }

  /**
   * Returns whether this item is marked as a preview feature (experimental).
   */
  isPreviewFeature(): boolean {
    return this.previewFeature;
  }

  /**
   * Returns whether this item is enabled.
   */
  isEnabled(): boolean {
    return !this.disabled;
  }

  /**
   * Sets the enabled state of this item.
   * @param enabled True to enable the item, false to disable it.
   */
  setEnabled(enabled: boolean): void {
    this.disabled = !enabled;
  }

  /**
   * Builds a descriptor object for this item.
   * This descriptor is used to create the actual menu item in either
   * a soft-rendered menu or a native menu.
   * @returns The descriptor for the item.
   * @throws If the item type is invalid.
   */
  buildDescriptor(): SoftContextMenuDescriptor|Host.InspectorFrontendHostAPI.ContextMenuDescriptor {
    switch (this.typeInternal) {
      case 'item': {
        const result: SoftContextMenuDescriptor = {
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
        const result: SoftContextMenuDescriptor = {
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
  setAccelerator(key: Key, modifiers: Modifier[]): void {
    const modifierSum = modifiers.reduce(
        (result, modifier) => result + ShortcutRegistry.instance().devToolsToChromeModifier(modifier), 0);
    this.accelerator = {keyCode: key.code, modifiers: modifierSum};
  }

  /**
   * This influences whether accelerators will be shown for native menus on Mac.
   * Use this ONLY for performance menus and ONLY where accelerators are critical
   * for a smooth user journey and heavily context dependent.
   * @param isDevToolsPerformanceMenuItem True if this is a DevTools performance menu item.
   */
  setIsDevToolsPerformanceMenuItem(isDevToolsPerformanceMenuItem: boolean): void {
    this.isDevToolsPerformanceMenuItem = isDevToolsPerformanceMenuItem;
  }

  /**
   * Sets a display string for the shortcut associated with this item.
   * This is typically used when the shortcut is managed by `ActionRegistry`.
   * @param shortcut The shortcut string to display.
   */
  setShortcut(shortcut: string): void {
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
  readonly contextMenu: ContextMenu|null;
  readonly items: Item[];

  constructor(contextMenu: ContextMenu|null) {
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
  appendItem(label: string, handler: () => void, options?: {
    accelerator?: Host.InspectorFrontendHostAPI.AcceleratorDescriptor,
    isPreviewFeature?: boolean,
    disabled?: boolean,
    additionalElement?: Element,
    tooltip?: Platform.UIString.LocalizedString,
    jslogContext?: string,
    featureName?: string,
  }): Item {
    const item = new Item(
        this.contextMenu, 'item', label, options?.isPreviewFeature, options?.disabled, undefined, options?.accelerator,
        options?.tooltip, options?.jslogContext, options?.featureName);
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
  appendCustomItem(element: Element, jslogContext?: string): Item {
    const item = new Item(
        this.contextMenu, 'item', undefined, undefined, undefined, undefined, undefined, undefined, jslogContext);
    item.customElement = element;
    this.items.push(item);
    return item;
  }

  /**
   * Appends a visual separator to this section.
   * @returns The newly created separator `Item`.
   */
  appendSeparator(): Item {
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
  appendAction(actionId: string, label?: string, optional?: boolean, jslogContext?: string, feature?: string): void {
    if (optional && !ActionRegistry.instance().hasAction(actionId)) {
      return;
    }
    const action = ActionRegistry.instance().getAction(actionId);
    if (!label) {
      label = action.title();
    }
    const result = this.appendItem(label, action.execute.bind(action), {
      disabled: !action.enabled(),
      jslogContext: jslogContext ?? actionId,
      featureName: feature,
    });
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
  appendSubMenuItem(label: string, disabled?: boolean, jslogContext?: string, featureName?: string): SubMenu {
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
  appendCheckboxItem(label: string, handler: () => void, options?: {
    checked?: boolean,
    disabled?: boolean,
    experimental?: boolean,
    additionalElement?: Element,
    tooltip?: Platform.UIString.LocalizedString,
    jslogContext?: string,
    featureName?: string,
  }): Item {
    const item = new Item(
        this.contextMenu, 'checkbox', label, options?.experimental, options?.disabled, options?.checked, undefined,
        options?.tooltip, options?.jslogContext, options?.featureName);
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
  readonly sections: Map<string, Section>;
  private readonly sectionList: Section[];

  constructor(
      contextMenu: ContextMenu|null, label?: string, disabled?: boolean, jslogContext?: string, featureName?: string) {
    super(
        contextMenu, 'subMenu', label, undefined, disabled, undefined, undefined, undefined, jslogContext, featureName);
    this.sections = new Map();
    this.sectionList = [];
  }

  /**
   * Initializes the standard sections for this sub-menu based on `ContextMenu.groupWeights`.
   */
  init(): void {
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
  section(name?: string): Section {
    if (!name) {
      name = 'default';
    }
    let section: Section|(Section | null | undefined) = name ? this.sections.get(name) : null;
    if (!section) {
      section = new Section(this.contextMenu);
      if (name) {
        this.sections.set(name, section);
        this.sectionList.push(section);
      } else {
        this.sectionList.splice(ContextMenu.groupWeights.indexOf('default'), 0, section);
      }
    }
    return section;
  }

  /**
   * Retrieves or creates the 'header' section.
   * @returns The 'header' `Section` object.
   */
  headerSection(): Section {
    return this.section('header');
  }

  /**
   * Retrieves or creates the 'new' section.
   * @returns The 'new' `Section` object.
   */
  newSection(): Section {
    return this.section('new');
  }

  /**
   * Retrieves or creates the 'reveal' section.
   * @returns The 'reveal' `Section` object.
   */

  revealSection(): Section {
    return this.section('reveal');
  }

  /**
   * Retrieves or creates the 'clipboard' section.
   * @returns The 'clipboard' `Section` object.
   */
  clipboardSection(): Section {
    return this.section('clipboard');
  }

  /**
   * Retrieves or creates the 'edit' section.
   * @returns The 'edit' `Section` object.
   */
  editSection(): Section {
    return this.section('edit');
  }

  /**
   * Retrieves or creates the 'debug' section.
   * @returns The 'debug' `Section` object.
   */
  debugSection(): Section {
    return this.section('debug');
  }

  /**
   * Retrieves or creates the 'view' section.
   * @returns The 'view' `Section` object.
   */
  viewSection(): Section {
    return this.section('view');
  }

  /**
   * Retrieves or creates the 'default' section.
   * This is often used for general-purpose menu items.
   * @returns The 'default' `Section` object.
   */
  defaultSection(): Section {
    return this.section('default');
  }

  /**
   * Retrieves or creates the 'override' section.
   * @returns The 'override' `Section` object.
   */
  overrideSection(): Section {
    return this.section('override');
  }

  /**
   * Retrieves or creates the 'save' section.
   * @returns The 'save' `Section` object.
   */
  saveSection(): Section {
    return this.section('save');
  }

  /**
   * Retrieves or creates the 'annotation' section.
   * @returns The 'annotation' `Section` object.
   */
  annotationSection(): Section {
    return this.section('annotation');
  }

  /**
   * Retrieves or creates the 'footer' section.
   * @returns The 'footer' `Section` object.
   */
  footerSection(): Section {
    return this.section('footer');
  }

  override buildDescriptor(): SoftContextMenuDescriptor|Host.InspectorFrontendHostAPI.ContextMenuDescriptor {
    const result: Host.InspectorFrontendHostAPI.ContextMenuDescriptor|SoftContextMenuDescriptor = {
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
  appendItemsAtLocation(location: string): void {
    const items: ContextMenuItemRegistration[] = getRegisteredItems();
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

const MENU_ITEM_HEIGHT_FOR_LOGGING = 20;
const MENU_ITEM_WIDTH_FOR_LOGGING = 200;

/**
 * Represents the main context menu. It extends `SubMenu` because a `ContextMenu`
 * is essentially a top-level menu that can contain sections and items, similar to a sub-menu.
 * It handles the display of the menu (either soft or native), event handling, and
 * integration with registered context menu providers.
 */
export class ContextMenu extends SubMenu {
  protected override contextMenu: this;
  private pendingTargets: unknown[];
  private readonly event: MouseEvent;
  private readonly useSoftMenu: boolean;
  private readonly keepOpen: boolean;
  private x: number;
  private y: number;
  private onSoftMenuClosed?: () => void;
  private readonly handlers: Map<number, () => void>;
  override idInternal: number;
  private softMenu?: SoftContextMenu;
  private contextMenuLabel?: string;
  private openHostedMenu: Host.InspectorFrontendHostAPI.ContextMenuDescriptor[]|null;
  private eventTarget: EventTarget|null;
  private loggableParent: Element|null = null;

  /**
   * Creates an instance of `ContextMenu`.
   * @param event The mouse event that triggered the menu.
   * @param options Optional configuration for the context menu.
   */
  constructor(event: Event, options: ContextMenuOptions = {}) {
    super(null);
    const mouseEvent = (event as MouseEvent);
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

    let target = (deepElementFromEvent(event) || event.target) as Element | null;
    if (target) {
      this.appendApplicableItems((target as Object));
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
  static initialize(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.SetUseSoftMenu, setUseSoftMenu);
    /**
     * Sets the global preference for using soft menus.
     * @param event The event containing the new preference.
     */
    function setUseSoftMenu(event: Common.EventTarget.EventTargetEvent<boolean>): void {
      ContextMenu.useSoftMenu = event.data;
    }
  }

  /**
   * Installs a global context menu handler on the provided document's body.
   * This handler will create and show a `ContextMenu` when a contextmenu event is detected.
   * @param doc The `Document` to install the handler on.
   */
  static installHandler(doc: Document): void {
    doc.body.addEventListener('contextmenu', handler, false);

    function handler(event: Event): void {
      const contextMenu = new ContextMenu(event);
      void contextMenu.show();
    }
  }

  /**
   * Generates the next unique ID for a menu item within this `ContextMenu`.
   * @returns A unique number for the item ID.
   */
  nextId(): number {
    return this.idInternal++;
  }

  /**
   * Checks if a native (hosted) context menu is currently open.
   * @returns `true` if a native menu is open, `false` otherwise.
   */
  isHostedMenuOpen(): boolean {
    return Boolean(this.openHostedMenu);
  }

  /**
   * Retrieves the item descriptors if a soft menu is currently active.
   * @returns An array of `SoftContextMenuDescriptor`s or an empty array if no soft menu is active.
   */
  getItems(): SoftContextMenuDescriptor[] {
    return this.softMenu?.getItems() || [];
  }

  /**
   * Sets the checked state of an item in an active soft menu.
   * @param item The descriptor of the item to update.
   * @param checked `true` to check the item, `false` to uncheck it.
   */
  setChecked(item: SoftContextMenuDescriptor, checked: boolean): void {
    this.softMenu?.setChecked(item, checked);
  }

  /**
   * Shows the context menu. This involves loading items from registered providers
   * and then displaying either a soft or native menu.
   */
  async show(): Promise<void> {
    ContextMenu.pendingMenu = this;
    this.event.consume(true);
    const loadedProviders = await Promise.all(this.pendingTargets.map(async target => {
      const providers = await loadApplicableRegisteredProviders(target);
      return {target, providers};
    }));

    // After loading all providers, the contextmenu might be hidden again, so bail out.
    if (ContextMenu.pendingMenu !== this) {
      return;
    }
    ContextMenu.pendingMenu = null;

    for (const {target, providers} of loadedProviders) {
      for (const provider of providers) {
        provider.appendApplicableItems(this.event, this, target);
      }
    }

    this.pendingTargets = [];

    this.innerShow();
  }

  /**
   * Discards (closes) the soft context menu if it's currently shown.
   */
  discard(): void {
    if (this.softMenu) {
      this.softMenu.discard();
    }
  }

  private registerLoggablesWithin(
      descriptors: Host.InspectorFrontendHostAPI.ContextMenuDescriptor[],
      parent?: Host.InspectorFrontendHostAPI.ContextMenuDescriptor): void {
    for (const descriptor of descriptors) {
      if (descriptor.jslogContext) {
        if (descriptor.type === 'checkbox') {
          VisualLogging.registerLoggable(
              descriptor, `${VisualLogging.toggle().track({click: true}).context(descriptor.jslogContext)}`,
              parent || descriptors, new DOMRect(0, 0, MENU_ITEM_WIDTH_FOR_LOGGING, MENU_ITEM_HEIGHT_FOR_LOGGING));
        } else if (descriptor.type === 'item') {
          VisualLogging.registerLoggable(
              descriptor, `${VisualLogging.action().track({click: true}).context(descriptor.jslogContext)}`,
              parent || descriptors, new DOMRect(0, 0, MENU_ITEM_WIDTH_FOR_LOGGING, MENU_ITEM_HEIGHT_FOR_LOGGING));
        } else if (descriptor.type === 'subMenu') {
          VisualLogging.registerLoggable(
              descriptor, `${VisualLogging.item().context(descriptor.jslogContext)}`, parent || descriptors,
              new DOMRect(0, 0, MENU_ITEM_WIDTH_FOR_LOGGING, MENU_ITEM_HEIGHT_FOR_LOGGING));
        }
        if (descriptor.subItems) {
          this.registerLoggablesWithin(descriptor.subItems, descriptor);
        }
      }
    }
  }

  private innerShow(): void {
    if (!this.eventTarget) {
      return;
    }

    const menuObject = this.buildMenuDescriptors();
    const ownerDocument = (this.eventTarget as HTMLElement).ownerDocument;
    if (this.useSoftMenu || ContextMenu.useSoftMenu ||
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode()) {
      this.softMenu = new SoftContextMenu(
          (menuObject as SoftContextMenuDescriptor[]), this.itemSelected.bind(this), this.keepOpen, undefined,
          this.onSoftMenuClosed, this.loggableParent);
      // let soft context menu focus on the first item when the event is triggered by a non-mouse event
      // add another check of button value to differentiate mouse event with 'shift + f10' keyboard event
      const isMouseEvent =
          (this.event as PointerEvent).pointerType === 'mouse' && (this.event as PointerEvent).button >= 0;
      this.softMenu.setFocusOnTheFirstItem(!isMouseEvent);
      this.softMenu.show((ownerDocument), new AnchorBox(this.x, this.y, 0, 0));
      if (this.contextMenuLabel) {
        this.softMenu.setContextMenuElementLabel(this.contextMenuLabel);
      }
    } else {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.showContextMenuAtPoint(
          this.x, this.y, menuObject, (ownerDocument));

      function listenToEvents(this: ContextMenu): void {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
            Host.InspectorFrontendHostAPI.Events.ContextMenuCleared, this.menuCleared, this);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
            Host.InspectorFrontendHostAPI.Events.ContextMenuItemSelected, this.onItemSelected, this);
      }
      VisualLogging.registerLoggable(
          menuObject, `${VisualLogging.menu()}`, this.loggableParent,
          new DOMRect(0, 0, MENU_ITEM_WIDTH_FOR_LOGGING, MENU_ITEM_HEIGHT_FOR_LOGGING * menuObject.length));
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
  setX(x: number): void {
    this.x = x;
  }

  /**
   * Sets the y-coordinate for the menu's position.
   * @param y The new y-coordinate.
   */
  setY(y: number): void {
    this.y = y;
  }

  /**
   * Associates a handler function with a menu item ID.
   * @param id The ID of the menu item.
   * @param handler The function to execute when the item is selected.
   */
  setHandler(id: number, handler: () => void): void {
    if (handler) {
      this.handlers.set(id, handler);
    }
  }

  /**
   * Invokes the handler associated with the given menu item ID.
   * @param id The ID of the selected menu item.
   */
  invokeHandler(id: number): void {
    const handler = this.handlers.get(id);
    if (handler) {
      handler.call(this);
    }
  }

  private buildMenuDescriptors(): Array<SoftContextMenuDescriptor|Host.InspectorFrontendHostAPI.ContextMenuDescriptor> {
    return super.buildDescriptor().subItems as
        Array<SoftContextMenuDescriptor|Host.InspectorFrontendHostAPI.ContextMenuDescriptor>;
  }

  private onItemSelected(event: Common.EventTarget.EventTargetEvent<number>): void {
    this.itemSelected(event.data);
  }

  private itemSelected(id: number): void {
    this.invokeHandler(id);
    // Collect all features used along the way when searching for the clicked item.
    // I.e. a 'feature' on a submenu should be counted as 'used' if its submenu items are clicked.
    const featuresUsed: string[] = [];
    if (this.openHostedMenu) {
      const itemWithId = (items: Host.InspectorFrontendHostAPI.ContextMenuDescriptor[],
                          id: number): Host.InspectorFrontendHostAPI.ContextMenuDescriptor|null => {
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
        featuresUsed.map(
            feature => Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordNewBadgeUsage(feature));
      }
    }

    this.menuCleared();
  }

  private menuCleared(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(
        Host.InspectorFrontendHostAPI.Events.ContextMenuCleared, this.menuCleared, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(
        Host.InspectorFrontendHostAPI.Events.ContextMenuItemSelected, this.onItemSelected, this);
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
  appendApplicableItems(target: unknown): void {
    if (this.pendingTargets.includes(target)) {
      return;
    }
    this.pendingTargets.push(target);
  }

  /**
   * Marks the soft context menu (if one exists) to visually indicate that its items behave like checkboxes.
   */
  markAsMenuItemCheckBox(): void {
    if (this.softMenu) {
      this.softMenu.markAsMenuItemCheckBox();
    }
  }

  private static pendingMenu: ContextMenu|null = null;
  private static useSoftMenu = false;
  static readonly groupWeights = [
    'header', 'new', 'reveal', 'edit', 'clipboard', 'debug', 'view', 'default', 'override', 'save', 'annotation',
    'footer'
  ];
}

/* eslint-disable rulesdir/no-lit-render-outside-of-view */
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
  static readonly observedAttributes = ['icon-name', 'disabled'];
  readonly #shadow = this.attachShadow({mode: 'open'});
  #triggerTimeoutId?: number;
  #populateMenuCall?: (arg0: ContextMenu) => void;

  /**
   * Sets the callback function used to populate the context menu when the button is clicked.
   * @param populateCall A function that takes a `ContextMenu` instance and adds items to it.
   */
  set populateMenuCall(populateCall: (arg0: ContextMenu) => void) {
    this.#populateMenuCall = populateCall;
  }

  /**
   * Reflects the `soft-menu` attribute. If true, uses the `SoftContextMenu` implementation.
   * @default false
   */
  get softMenu(): boolean {
    return Boolean(this.getAttribute('soft-menu'));
  }

  set softMenu(softMenu: boolean) {
    this.toggleAttribute('soft-menu', softMenu);
  }

  /**
   * Reflects the `keep-open` attribute. If true, the menu stays open after an item click.
   * @default false
   */
  get keepOpen(): boolean {
    return Boolean(this.getAttribute('keep-open'));
  }

  set keepOpen(keepOpen: boolean) {
    this.toggleAttribute('keep-open', keepOpen);
  }

  /**
   * Reflects the `icon-name` attribute. Sets the icon to display on the button.
   */
  set iconName(iconName: string) {
    this.setAttribute('icon-name', iconName);
  }

  get iconName(): string|null {
    return this.getAttribute('icon-name');
  }

  /**
   * Reflects the `jslogContext` attribute. Sets the visual logging context for the button.
   */
  set jslogContext(jslogContext: string) {
    this.setAttribute('jslog', VisualLogging.dropDown(jslogContext).track({click: true}).toString());
  }

  get jslogContext(): string|null {
    return this.getAttribute('jslogContext');
  }

  /**
   * Reflects the `disabled` attribute. If true, the button cannot be clicked.
   * @default false
   */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(disabled: boolean) {
    this.toggleAttribute('disabled', disabled);
  }

  /**
   * Creates and shows the `ContextMenu`. It calls the `populateMenuCall`
   * callback to fill the menu with items before displaying it relative to the button.
   * Manages the `aria-expanded` state.
   * @param event The event that triggered the menu
   */
  #openMenu(event: Event): void {
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
  #triggerContextMenu(event: MouseEvent): void {
    const triggerTimeout = 50;
    if (!this.#triggerTimeoutId) {
      this.#triggerTimeoutId = window.setTimeout(this.#openMenu.bind(this, event), triggerTimeout);
    }
  }

  attributeChangedCallback(_: string, oldValue: string, newValue: string): void {
    if (oldValue !== newValue) {
      this.#render();
    }
  }

  connectedCallback(): void {
    this.#render();
  }

  #render(): void {
    if (!this.iconName) {
      throw new Error('<devtools-menu-button> expects an icon.');
    }

    // clang-format off
    render(html`
        <devtools-button .disabled=${this.disabled}
                         .iconName=${this.iconName}
                         .variant=${Buttons.Button.Variant.ICON}
                         .title=${this.title}
                         aria-haspopup='menu'
                         @click=${this.#triggerContextMenu}>
        </devtools-button>`,
        this.#shadow, { host: this });
    // clang-format on
  }
}
customElements.define('devtools-menu-button', MenuButton);
/* eslint-enable rulesdir/no-lit-render-outside-of-view */

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
 * Stores all registered context menu provider registrations.
 */
const registeredProviders: Array<ProviderRegistration<unknown>> = [];

/**
 * Registers a new context menu provider.
 * @template T The type of the object for which the provider supplies context menu items.
 * @param registration The provider registration object, specifying context types and how to load the provider.
 */
export function registerProvider<T>(registration: ProviderRegistration<T>): void {
  registeredProviders.push(registration);
}

/**
 * Asynchronously loads all registered providers that are applicable to the given `target` object.
 * A provider is applicable if the `target` is an instance of one of its specified `contextTypes`
 * and if its associated experiment (if any) is enabled.
 * @param target The object for which to load applicable providers.
 * @returns A promise that resolves to an array of loaded `Provider` instances.
 */
async function loadApplicableRegisteredProviders(target: unknown): Promise<Array<Provider<unknown>>> {
  const providers: Array<Provider<unknown>> = [];
  for (const providerRegistration of registeredProviders) {
    if (!Root.Runtime.Runtime.isDescriptorEnabled(
            {experiment: providerRegistration.experiment, condition: undefined})) {
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
const registeredItemsProviders: ContextMenuItemRegistration[] = [];

/**
 * Registers a new context menu item.
 * These items are typically actions that appear in predefined locations in the menu.
 * @param registration The item registration object, specifying its location, action ID, and optional order/experiment.
 */
export function registerItem(registration: ContextMenuItemRegistration): void {
  registeredItemsProviders.push(registration);
}

/**
 * Attempts to remove a registered context menu item.
 * The item is identified by its `actionId` and `location`.
 * @param registration The registration details of the item to remove.
 * @returns `true` if the item was found and removed, `false` otherwise.
 */
export function maybeRemoveItem(registration: ContextMenuItemRegistration): boolean {
  const itemIndex = registeredItemsProviders.findIndex(
      item => item.actionId === registration.actionId && item.location === registration.location);
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
function getRegisteredItems(): ContextMenuItemRegistration[] {
  return registeredItemsProviders;
}

/**
 * Defines specific locations within the DevTools UI where context menu items can be registered.
 */
export const enum ItemLocation {
  DEVICE_MODE_MENU_SAVE = 'deviceModeMenu/save',
  MAIN_MENU = 'mainMenu',
  MAIN_MENU_DEFAULT = 'mainMenu/default',
  MAIN_MENU_FOOTER = 'mainMenu/footer',
  MAIN_MENU_HELP_DEFAULT = 'mainMenuHelp/default',
  NAVIGATOR_MENU_DEFAULT = 'navigatorMenu/default',
  PROFILER_MENU_DEFAULT = 'profilerMenu/default',
  TIMELINE_MENU_OPEN = 'timelineMenu/open',
}

export interface ProviderRegistration<T> {
  /** A function that returns an array of constructor functions that this provider applies to. */
  contextTypes: () => Array<abstract new(...any: any[]) => T>;
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

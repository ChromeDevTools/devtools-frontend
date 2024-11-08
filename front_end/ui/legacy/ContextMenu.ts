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
import * as VisualLogging from '../visual_logging/visual_logging.js';

import {ActionRegistry} from './ActionRegistry.js';
import type {Key, Modifier} from './KeyboardShortcut.js';
import {ShortcutRegistry} from './ShortcutRegistry.js';
import {SoftContextMenu, type SoftContextMenuDescriptor} from './SoftContextMenu.js';
import {deepElementFromEvent} from './UIUtils.js';

export class Item {
  private readonly typeInternal: string;
  protected readonly label: string|undefined;
  protected accelerator?: Host.InspectorFrontendHostAPI.AcceleratorDescriptor;
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
      jslogContext?: string) {
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
  }

  id(): number {
    if (this.idInternal === undefined) {
      throw new Error('Tried to access a ContextMenu Item ID but none was set.');
    }
    return this.idInternal;
  }

  type(): string {
    return this.typeInternal;
  }

  isPreviewFeature(): boolean {
    return this.previewFeature;
  }

  isEnabled(): boolean {
    return !this.disabled;
  }

  setEnabled(enabled: boolean): void {
    this.disabled = !enabled;
  }

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

  setAccelerator(key: Key, modifiers: Modifier[]): void {
    const modifierSum = modifiers.reduce((result, modifier) => result + modifier.value, 0);
    this.accelerator = {keyCode: key.code, modifiers: modifierSum};
  }

  // This influences whether accelerators will be shown for native menus on Mac.
  // Use this ONLY for performance menus and ONLY where accelerators are critical
  // for a smooth user journey and heavily context dependent.
  setIsDevToolsPerformanceMenuItem(isDevToolsPerformanceMenuItem: boolean): void {
    this.isDevToolsPerformanceMenuItem = isDevToolsPerformanceMenuItem;
  }

  setShortcut(shortcut: string): void {
    this.shortcut = shortcut;
  }
}

export class Section {
  readonly contextMenu: ContextMenu|null;
  readonly items: Item[];
  constructor(contextMenu: ContextMenu|null) {
    this.contextMenu = contextMenu;
    this.items = [];
  }

  appendItem(label: string, handler: () => void, options?: {
    accelerator?: Host.InspectorFrontendHostAPI.AcceleratorDescriptor,
    isPreviewFeature?: boolean,
    disabled?: boolean,
    additionalElement?: Element,
    tooltip?: Platform.UIString.LocalizedString,
    jslogContext?: string,
  }): Item {
    const item = new Item(
        this.contextMenu, 'item', label, options?.isPreviewFeature, options?.disabled, undefined, options?.accelerator,
        options?.tooltip, options?.jslogContext);
    if (options?.additionalElement) {
      item.customElement = options?.additionalElement;
    }
    this.items.push(item);
    if (this.contextMenu) {
      this.contextMenu.setHandler(item.id(), handler);
    }
    return item;
  }

  appendCustomItem(element: Element, jslogContext?: string): Item {
    const item = new Item(
        this.contextMenu, 'item', undefined, undefined, undefined, undefined, undefined, undefined, jslogContext);
    item.customElement = element;
    this.items.push(item);
    return item;
  }

  appendSeparator(): Item {
    const item = new Item(this.contextMenu, 'separator');
    this.items.push(item);
    return item;
  }

  appendAction(actionId: string, label?: string, optional?: boolean): void {
    if (optional && !ActionRegistry.instance().hasAction(actionId)) {
      return;
    }
    const action = ActionRegistry.instance().getAction(actionId);
    if (!label) {
      label = action.title();
    }
    const result = this.appendItem(label, action.execute.bind(action), {
      disabled: !action.enabled(),
      jslogContext: actionId,
    });
    const shortcut = ShortcutRegistry.instance().shortcutTitleForAction(actionId);
    if (shortcut) {
      result.setShortcut(shortcut);
    }
  }

  appendSubMenuItem(label: string, disabled?: boolean, jslogContext?: string): SubMenu {
    const item = new SubMenu(this.contextMenu, label, disabled, jslogContext);
    item.init();
    this.items.push(item);
    return item;
  }

  appendCheckboxItem(label: string, handler: () => void, options?: {
    checked?: boolean,
    disabled?: boolean,
    additionalElement?: Element,
    tooltip?: Platform.UIString.LocalizedString,
    jslogContext?: string,
  }): Item {
    const item = new Item(
        this.contextMenu, 'checkbox', label, undefined, options?.disabled, options?.checked, undefined,
        options?.tooltip, options?.jslogContext);
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

export class SubMenu extends Item {
  readonly sections: Map<string, Section>;
  private readonly sectionList: Section[];

  constructor(contextMenu: ContextMenu|null, label?: string, disabled?: boolean, jslogContext?: string) {
    super(contextMenu, 'subMenu', label, undefined, disabled, undefined, undefined, undefined, jslogContext);
    this.sections = new Map();
    this.sectionList = [];
  }

  init(): void {
    ContextMenu.groupWeights.forEach(name => this.section(name));
  }

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

  headerSection(): Section {
    return this.section('header');
  }

  newSection(): Section {
    return this.section('new');
  }

  revealSection(): Section {
    return this.section('reveal');
  }

  clipboardSection(): Section {
    return this.section('clipboard');
  }

  editSection(): Section {
    return this.section('edit');
  }

  debugSection(): Section {
    return this.section('debug');
  }

  viewSection(): Section {
    return this.section('view');
  }

  defaultSection(): Section {
    return this.section('default');
  }

  overrideSection(): Section {
    return this.section('override');
  }

  saveSection(): Section {
    return this.section('save');
  }

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
      if (!itemLocation || !itemLocation.startsWith(location + '/')) {
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

  private static uniqueSectionName: number = 0;
}

export interface ContextMenuOptions {
  useSoftMenu?: boolean;
  keepOpen?: boolean;
  onSoftMenuClosed?: () => void;
  x?: number;
  y?: number;
}

export class ContextMenu extends SubMenu {
  protected override contextMenu: this;
  private pendingTargets: unknown[];
  private readonly event: MouseEvent;
  private readonly useSoftMenu: boolean;
  private readonly keepOpen: boolean;
  private x: number;
  private y: number;
  private onSoftMenuClosed?: () => void;
  private jsLogContext?: string;
  private readonly handlers: Map<number, () => void>;
  override idInternal: number;
  private softMenu?: SoftContextMenu;
  private contextMenuLabel?: string;
  private openHostedMenu: Host.InspectorFrontendHostAPI.ContextMenuDescriptor[]|null;
  private eventTarget: EventTarget|null;
  private loggableParent: Element|null = null;

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

  static initialize(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.SetUseSoftMenu, setUseSoftMenu);
    function setUseSoftMenu(event: Common.EventTarget.EventTargetEvent<boolean>): void {
      ContextMenu.useSoftMenu = event.data;
    }
  }

  static installHandler(doc: Document): void {
    doc.body.addEventListener('contextmenu', handler, false);

    function handler(event: Event): void {
      const contextMenu = new ContextMenu(event);
      void contextMenu.show();
    }
  }

  nextId(): number {
    return this.idInternal++;
  }

  isHostedMenuOpen(): boolean {
    return Boolean(this.openHostedMenu);
  }

  getItems(): SoftContextMenuDescriptor[] {
    return this.softMenu?.getItems() || [];
  }

  setChecked(item: SoftContextMenuDescriptor, checked: boolean): void {
    this.softMenu?.setChecked(item, checked);
  }

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
              parent || descriptors);
        } else if (descriptor.type === 'item') {
          VisualLogging.registerLoggable(
              descriptor, `${VisualLogging.action().track({click: true}).context(descriptor.jslogContext)}`,
              parent || descriptors);
        } else if (descriptor.type === 'subMenu') {
          VisualLogging.registerLoggable(
              descriptor, `${VisualLogging.item().context(descriptor.jslogContext)}`, parent || descriptors);
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
      this.softMenu.show((ownerDocument as Document), new AnchorBox(this.x, this.y, 0, 0));
      if (this.contextMenuLabel) {
        this.softMenu.setContextMenuElementLabel(this.contextMenuLabel);
      }
    } else {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.showContextMenuAtPoint(
          this.x, this.y, menuObject, (ownerDocument as Document));

      function listenToEvents(this: ContextMenu): void {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
            Host.InspectorFrontendHostAPI.Events.ContextMenuCleared, this.menuCleared, this);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
            Host.InspectorFrontendHostAPI.Events.ContextMenuItemSelected, this.onItemSelected, this);
      }
      VisualLogging.registerLoggable(menuObject, `${VisualLogging.menu()}`, this.loggableParent);
      this.registerLoggablesWithin(menuObject);
      this.openHostedMenu = menuObject;
      // showContextMenuAtPoint call above synchronously issues a clear event for previous context menu (if any),
      // so we skip it before subscribing to the clear event.
      queueMicrotask(listenToEvents.bind(this));
    }
  }

  setContextMenuLabel(label: string): void {
    this.contextMenuLabel = label;
  }

  setX(x: number): void {
    this.x = x;
  }

  setY(y: number): void {
    this.y = y;
  }

  setHandler(id: number, handler: () => void): void {
    if (handler) {
      this.handlers.set(id, handler);
    }
  }

  invokeHandler(id: number): void {
    const handler = this.handlers.get(id);
    if (handler) {
      handler.call(this);
    }
  }

  private buildMenuDescriptors(): (SoftContextMenuDescriptor|Host.InspectorFrontendHostAPI.ContextMenuDescriptor)[] {
    return super.buildDescriptor().subItems as (
               SoftContextMenuDescriptor | Host.InspectorFrontendHostAPI.ContextMenuDescriptor)[];
  }

  private onItemSelected(event: Common.EventTarget.EventTargetEvent<number>): void {
    this.itemSelected(event.data);
  }

  private itemSelected(id: number): void {
    this.invokeHandler(id);
    if (this.openHostedMenu) {
      const itemWithId = (items: Host.InspectorFrontendHostAPI.ContextMenuDescriptor[],
                          id: number): Host.InspectorFrontendHostAPI.ContextMenuDescriptor|null => {
        for (const item of items) {
          if (item.id === id) {
            return item;
          }
          const subitem = item.subItems && itemWithId(item.subItems, id);
          if (subitem) {
            return subitem;
          }
        }
        return null;
      };
      const item = itemWithId(this.openHostedMenu, id);
      if (item && item.jslogContext) {
        void VisualLogging.logClick(item, new MouseEvent('click'));
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
   * will be loaded when showing the context menu. If the `target` was already appended
   * before, it just ignores this call.
   *
   * @param target an object for which we can have registered menu item providers.
   */
  appendApplicableItems(target: unknown): void {
    if (this.pendingTargets.includes(target)) {
      return;
    }
    this.pendingTargets.push(target);
  }

  markAsMenuItemCheckBox(): void {
    if (this.softMenu) {
      this.softMenu.markAsMenuItemCheckBox();
    }
  }

  private static pendingMenu: ContextMenu|null = null;
  private static useSoftMenu = false;
  static readonly groupWeights =
      ['header', 'new', 'reveal', 'edit', 'clipboard', 'debug', 'view', 'default', 'override', 'save', 'footer'];
}

export interface Provider<T> {
  appendApplicableItems(event: Event, contextMenu: ContextMenu, target: T): void;
}

const registeredProviders: ProviderRegistration<unknown>[] = [];

export function registerProvider<T>(registration: ProviderRegistration<T>): void {
  registeredProviders.push(registration);
}

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

const registeredItemsProviders: ContextMenuItemRegistration[] = [];

export function registerItem(registration: ContextMenuItemRegistration): void {
  registeredItemsProviders.push(registration);
}

export function maybeRemoveItem(registration: ContextMenuItemRegistration): boolean {
  const itemIndex = registeredItemsProviders.findIndex(
      item => item.actionId === registration.actionId && item.location === registration.location);
  if (itemIndex < 0) {
    return false;
  }
  registeredItemsProviders.splice(itemIndex, 1);
  return true;
}

function getRegisteredItems(): ContextMenuItemRegistration[] {
  return registeredItemsProviders;
}

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
  contextTypes: () => Array<abstract new(...any: any[]) => T>;
  loadProvider: () => Promise<Provider<T>>;
  experiment?: Root.Runtime.ExperimentName;
}

export interface ContextMenuItemRegistration {
  location: ItemLocation;
  actionId: string;
  order?: number;
  experiment?: Root.Runtime.ExperimentName;
}

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

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../../core/common/common.js'; // eslint-disable-line no-unused-vars
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';

import {ActionRegistry} from './ActionRegistry.js';
import {ShortcutRegistry} from './ShortcutRegistry.js';
import type {SoftContextMenuDescriptor} from './SoftContextMenu.js';
import {SoftContextMenu} from './SoftContextMenu.js';  // eslint-disable-line no-unused-vars
import {deepElementFromEvent} from './UIUtils.js';

export class Item {
  _type: string;
  _label: string|undefined;
  _disabled: boolean|undefined;
  _checked: boolean|undefined;
  _contextMenu: ContextMenu|null;
  _id: number|undefined;
  _customElement?: Element;
  _shortcut?: string;

  constructor(contextMenu: ContextMenu|null, type: string, label?: string, disabled?: boolean, checked?: boolean) {
    this._type = type;
    this._label = label;
    this._disabled = disabled;
    this._checked = checked;
    this._contextMenu = contextMenu;
    this._id = undefined;
    if (type === 'item' || type === 'checkbox') {
      this._id = contextMenu ? contextMenu._nextId() : 0;
    }
  }

  id(): number {
    if (this._id === undefined) {
      throw new Error('Tried to access a ContextMenu Item ID but none was set.');
    }
    return this._id;
  }

  type(): string {
    return this._type;
  }

  isEnabled(): boolean {
    return !this._disabled;
  }

  setEnabled(enabled: boolean): void {
    this._disabled = !enabled;
  }

  _buildDescriptor(): SoftContextMenuDescriptor|Host.InspectorFrontendHostAPI.ContextMenuDescriptor {
    switch (this._type) {
      case 'item': {
        const result = {
          type: 'item',
          id: this._id,
          label: this._label,
          enabled: !this._disabled,
          checked: undefined,
          subItems: undefined,
        };
        if (this._customElement) {
          const resultAsSoftContextMenuItem = (result as SoftContextMenuDescriptor);
          resultAsSoftContextMenuItem.element = (this._customElement as Element);
        }
        if (this._shortcut) {
          const resultAsSoftContextMenuItem = (result as SoftContextMenuDescriptor);
          resultAsSoftContextMenuItem.shortcut = this._shortcut;
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
        return {
          type: 'checkbox',
          id: this._id,
          label: this._label,
          checked: Boolean(this._checked),
          enabled: !this._disabled,
          subItems: undefined,
        };
      }
    }
    throw new Error('Invalid item type:' + this._type);
  }

  setShortcut(shortcut: string): void {
    this._shortcut = shortcut;
  }
}

export class Section {
  _contextMenu: ContextMenu|null;
  _items: Item[];
  constructor(contextMenu: ContextMenu|null) {
    this._contextMenu = contextMenu;
    this._items = [];
  }

  appendItem(label: string, handler: () => void, disabled?: boolean): Item {
    const item = new Item(this._contextMenu, 'item', label, disabled);
    this._items.push(item);
    if (this._contextMenu) {
      this._contextMenu._setHandler(item.id(), handler);
    }
    return item;
  }

  appendCustomItem(element: Element): Item {
    const item = new Item(this._contextMenu, 'item', '<custom>');
    item._customElement = element;
    this._items.push(item);
    return item;
  }

  appendSeparator(): Item {
    const item = new Item(this._contextMenu, 'separator');
    this._items.push(item);
    return item;
  }

  appendAction(actionId: string, label?: string, optional?: boolean): void {
    const action = ActionRegistry.instance().action(actionId);
    if (!action) {
      if (!optional) {
        console.error(`Action ${actionId} was not defined`);
      }
      return;
    }
    if (!label) {
      label = action.title();
    }
    const result = this.appendItem(label, action.execute.bind(action));
    const shortcut = ShortcutRegistry.instance().shortcutTitleForAction(actionId);
    if (shortcut) {
      result.setShortcut(shortcut);
    }
  }

  appendSubMenuItem(label: string, disabled?: boolean): SubMenu {
    const item = new SubMenu(this._contextMenu, label, disabled);
    item._init();
    this._items.push(item);
    return item;
  }

  appendCheckboxItem(label: string, handler: () => void, checked?: boolean, disabled?: boolean): Item {
    const item = new Item(this._contextMenu, 'checkbox', label, disabled, checked);
    this._items.push(item);
    if (this._contextMenu) {
      this._contextMenu._setHandler(item.id(), handler);
    }
    return item;
  }
}

export class SubMenu extends Item {
  _sections: Map<string, Section>;
  _sectionList: Section[];

  constructor(contextMenu: ContextMenu|null, label?: string, disabled?: boolean) {
    super(contextMenu, 'subMenu', label, disabled);
    this._sections = new Map();
    this._sectionList = [];
  }

  _init(): void {
    ContextMenu._groupWeights.forEach(name => this.section(name));
  }

  section(name?: string): Section {
    let section: Section|(Section | null | undefined) = name ? this._sections.get(name) : null;
    if (!section) {
      section = new Section(this._contextMenu);
      if (name) {
        this._sections.set(name, section);
        this._sectionList.push(section);
      } else {
        this._sectionList.splice(ContextMenu._groupWeights.indexOf('default'), 0, section);
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

  saveSection(): Section {
    return this.section('save');
  }

  footerSection(): Section {
    return this.section('footer');
  }

  _buildDescriptor(): SoftContextMenuDescriptor|Host.InspectorFrontendHostAPI.ContextMenuDescriptor {
    const result: Host.InspectorFrontendHostAPI.ContextMenuDescriptor|SoftContextMenuDescriptor = {
      type: 'subMenu',
      label: this._label,
      enabled: !this._disabled,
      subItems: [],
      id: undefined,
      checked: undefined,
    };

    const nonEmptySections = this._sectionList.filter(section => Boolean(section._items.length));
    for (const section of nonEmptySections) {
      for (const item of section._items) {
        if (!result.subItems) {
          result.subItems = [];
        }
        result.subItems.push(item._buildDescriptor());
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

  static _uniqueSectionName: number = 0;
}

export class ContextMenu extends SubMenu {
  _contextMenu: this;
  _defaultSection: Section;
  _pendingPromises: Promise<Provider[]>[];
  _pendingTargets: Object[];
  _event: MouseEvent;
  _useSoftMenu: boolean;
  _x: number;
  _y: number;
  _handlers: Map<number, () => void>;
  _id: number;
  _softMenu?: SoftContextMenu;

  constructor(event: Event, useSoftMenu?: boolean, x?: number, y?: number) {
    super(null);
    const mouseEvent = (event as MouseEvent);
    this._contextMenu = this;
    super._init();
    this._defaultSection = this.defaultSection();
    this._pendingPromises = [];
    this._pendingTargets = [];
    this._event = mouseEvent;
    this._useSoftMenu = Boolean(useSoftMenu);
    this._x = x === undefined ? mouseEvent.x : x;
    this._y = y === undefined ? mouseEvent.y : y;
    this._handlers = new Map();
    this._id = 0;

    const target = deepElementFromEvent(event);
    if (target) {
      this.appendApplicableItems((target as Object));
    }
  }

  static initialize(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.SetUseSoftMenu, setUseSoftMenu);
    function setUseSoftMenu(event: Common.EventTarget.EventTargetEvent): void {
      ContextMenu._useSoftMenu = (event.data as boolean);
    }
  }

  static installHandler(doc: Document): void {
    doc.body.addEventListener('contextmenu', handler, false);

    function handler(event: Event): void {
      const contextMenu = new ContextMenu(event);
      contextMenu.show();
    }
  }

  _nextId(): number {
    return this._id++;
  }

  async show(): Promise<void> {
    ContextMenu._pendingMenu = this;
    this._event.consume(true);
    const loadedProviders: Provider[][] = await Promise.all(this._pendingPromises);

    // After loading all providers, the contextmenu might be hidden again, so bail out.
    if (ContextMenu._pendingMenu !== this) {
      return;
    }
    ContextMenu._pendingMenu = null;

    for (let i = 0; i < loadedProviders.length; ++i) {
      const providers = loadedProviders[i];
      const target = this._pendingTargets[i];

      for (const provider of providers) {
        provider.appendApplicableItems(this._event, this, target);
      }
    }

    this._pendingPromises = [];
    this._pendingTargets = [];

    this._innerShow();
  }

  discard(): void {
    if (this._softMenu) {
      this._softMenu.discard();
    }
  }

  _innerShow(): void {
    const menuObject = this._buildMenuDescriptors();
    const eventTarget = this._event.target;
    if (!eventTarget) {
      return;
    }
    const ownerDocument = (eventTarget as HTMLElement).ownerDocument;
    if (this._useSoftMenu || ContextMenu._useSoftMenu ||
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode()) {
      this._softMenu = new SoftContextMenu((menuObject as SoftContextMenuDescriptor[]), this._itemSelected.bind(this));
      this._softMenu.show((ownerDocument as Document), new AnchorBox(this._x, this._y, 0, 0));
    } else {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.showContextMenuAtPoint(
          this._x, this._y, menuObject, (ownerDocument as Document));

      function listenToEvents(this: ContextMenu): void {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
            Host.InspectorFrontendHostAPI.Events.ContextMenuCleared, this._menuCleared, this);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
            Host.InspectorFrontendHostAPI.Events.ContextMenuItemSelected, this._onItemSelected, this);
      }

      // showContextMenuAtPoint call above synchronously issues a clear event for previous context menu (if any),
      // so we skip it before subscribing to the clear event.
      queueMicrotask(listenToEvents.bind(this));
    }
  }

  setX(x: number): void {
    this._x = x;
  }

  setY(y: number): void {
    this._y = y;
  }

  _setHandler(id: number, handler: () => void): void {
    if (handler) {
      this._handlers.set(id, handler);
    }
  }

  _buildMenuDescriptors(): (SoftContextMenuDescriptor|Host.InspectorFrontendHostAPI.ContextMenuDescriptor)[] {
    return /** @type {!Array.<!Host.InspectorFrontendHostAPI.ContextMenuDescriptor|!SoftContextMenuDescriptor>} */ super
               ._buildDescriptor()
               .subItems as (SoftContextMenuDescriptor | Host.InspectorFrontendHostAPI.ContextMenuDescriptor)[];
  }

  _onItemSelected(event: Common.EventTarget.EventTargetEvent): void {
    this._itemSelected((event.data as number));
  }

  _itemSelected(id: number): void {
    const handler = this._handlers.get(id);
    if (handler) {
      handler.call(this);
    }
    this._menuCleared();
  }

  _menuCleared(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(
        Host.InspectorFrontendHostAPI.Events.ContextMenuCleared, this._menuCleared, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(
        Host.InspectorFrontendHostAPI.Events.ContextMenuItemSelected, this._onItemSelected, this);
  }

  containsTarget(target: Object): boolean {
    return this._pendingTargets.indexOf(target) >= 0;
  }

  appendApplicableItems(target: Object): void {
    this._pendingPromises.push(loadApplicableRegisteredProviders(target));
    this._pendingTargets.push(target);
  }

  static _pendingMenu: ContextMenu|null = null;
  static _useSoftMenu = false;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly _groupWeights =
      ['header', 'new', 'reveal', 'edit', 'clipboard', 'debug', 'view', 'default', 'save', 'footer'];
}

export interface Provider {
  appendApplicableItems(event: Event, contextMenu: ContextMenu, target: Object): void;
}

const registeredProviders: ProviderRegistration[] = [];

export function registerProvider(registration: ProviderRegistration): void {
  registeredProviders.push(registration);
}

async function loadApplicableRegisteredProviders(target: Object): Promise<Provider[]> {
  return Promise.all(
      registeredProviders.filter(isProviderApplicableToContextTypes).map(registration => registration.loadProvider()));

  function isProviderApplicableToContextTypes(providerRegistration: ProviderRegistration): boolean {
    if (!Root.Runtime.Runtime.isDescriptorEnabled(
            {experiment: providerRegistration.experiment, condition: undefined})) {
      return false;
    }
    if (!providerRegistration.contextTypes) {
      return true;
    }
    for (const contextType of providerRegistration.contextTypes()) {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // @ts-expect-error
      if (target instanceof contextType) {
        return true;
      }
    }
    return false;
  }
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

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum ItemLocation {
  DEVICE_MODE_MENU_SAVE = 'deviceModeMenu/save',
  MAIN_MENU = 'mainMenu',
  MAIN_MENU_DEFAULT = 'mainMenu/default',
  MAIN_MENU_FOOTER = 'mainMenu/footer',
  MAIN_MENU_HELP_DEFAULT = 'mainMenuHelp/default',
  NAVIGATOR_MENU_DEFAULT = 'navigatorMenu/default',
  TIMELINE_MENU_OPEN = 'timelineMenu/open',
}

export interface ProviderRegistration {
  contextTypes: () => unknown[];
  loadProvider: () => Promise<Provider>;
  experiment?: Root.Runtime.ExperimentName;
}

export interface ContextMenuItemRegistration {
  location: ItemLocation;
  actionId: string;
  order?: number;
  experiment?: Root.Runtime.ExperimentName;
}

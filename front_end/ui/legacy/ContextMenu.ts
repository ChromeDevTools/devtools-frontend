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

import {ActionRegistry} from './ActionRegistry.js';
import {ShortcutRegistry} from './ShortcutRegistry.js';

import {SoftContextMenu, type SoftContextMenuDescriptor} from './SoftContextMenu.js';
import {deepElementFromEvent} from './UIUtils.js';

export class Item {
  private readonly typeInternal: string;
  protected readonly label: string|undefined;
  protected disabled: boolean|undefined;
  private readonly checked: boolean|undefined;
  protected contextMenu: ContextMenu|null;
  protected idInternal: number|undefined;
  customElement?: Element;
  private shortcut?: string;
  #tooltip: Common.UIString.LocalizedString|undefined;

  constructor(
      contextMenu: ContextMenu|null, type: 'checkbox'|'item'|'separator'|'subMenu', label?: string, disabled?: boolean,
      checked?: boolean, tooltip?: Platform.UIString.LocalizedString) {
    this.typeInternal = type;
    this.label = label;
    this.disabled = disabled;
    this.checked = checked;
    this.contextMenu = contextMenu;
    this.idInternal = undefined;
    this.#tooltip = tooltip;
    if (type === 'item' || type === 'checkbox') {
      this.idInternal = contextMenu ? contextMenu.nextId() : 0;
    }
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
          enabled: !this.disabled,
          checked: undefined,
          subItems: undefined,
          tooltip: this.#tooltip,
        };
        if (this.customElement) {
          result.element = this.customElement;
        }
        if (this.shortcut) {
          result.shortcut = this.shortcut;
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
        };
        if (this.customElement) {
          result.element = this.customElement;
        }
        return result;
      }
    }
    throw new Error('Invalid item type:' + this.typeInternal);
  }

  setShortcut(shortcut: string): void {
    this.shortcut = shortcut;
  }
}

export class Section {
  private readonly contextMenu: ContextMenu|null;
  readonly items: Item[];
  constructor(contextMenu: ContextMenu|null) {
    this.contextMenu = contextMenu;
    this.items = [];
  }

  appendItem(
      label: string, handler: () => void, disabled?: boolean, additionalElement?: Element,
      tooltip?: Platform.UIString.LocalizedString): Item {
    const item = new Item(this.contextMenu, 'item', label, disabled, undefined, tooltip);
    if (additionalElement) {
      item.customElement = additionalElement;
    }
    this.items.push(item);
    if (this.contextMenu) {
      this.contextMenu.setHandler(item.id(), handler);
    }
    return item;
  }

  appendCustomItem(element: Element): Item {
    const item = new Item(this.contextMenu, 'item');
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
    const item = new SubMenu(this.contextMenu, label, disabled);
    item.init();
    this.items.push(item);
    return item;
  }

  appendCheckboxItem(
      label: string, handler: () => void, checked?: boolean, disabled?: boolean, additionalElement?: Element,
      tooltip?: Platform.UIString.LocalizedString): Item {
    const item = new Item(this.contextMenu, 'checkbox', label, disabled, checked, tooltip);
    this.items.push(item);
    if (this.contextMenu) {
      this.contextMenu.setHandler(item.id(), handler);
    }
    if (additionalElement) {
      item.customElement = additionalElement;
    }
    return item;
  }
}

export class SubMenu extends Item {
  private readonly sections: Map<string, Section>;
  private readonly sectionList: Section[];

  constructor(contextMenu: ContextMenu|null, label?: string, disabled?: boolean) {
    super(contextMenu, 'subMenu', label, disabled);
    this.sections = new Map();
    this.sectionList = [];
  }

  init(): void {
    ContextMenu.groupWeights.forEach(name => this.section(name));
  }

  section(name?: string): Section {
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
      enabled: !this.disabled,
      subItems: [],
      id: undefined,
      checked: undefined,
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
  private readonly defaultSectionInternal: Section;
  private pendingPromises: Promise<Provider[]>[];
  private pendingTargets: Object[];
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
  private hostedMenuOpened: boolean;
  private eventTarget: EventTarget|null;

  constructor(event: Event, options: ContextMenuOptions = {}) {
    super(null);
    const mouseEvent = (event as MouseEvent);
    this.contextMenu = this;
    super.init();
    this.defaultSectionInternal = this.defaultSection();
    this.pendingPromises = [];
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
    this.hostedMenuOpened = false;

    const target = deepElementFromEvent(event);
    if (target) {
      this.appendApplicableItems((target as Object));
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
    return this.hostedMenuOpened;
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
    const loadedProviders: Provider[][] = await Promise.all(this.pendingPromises);

    // After loading all providers, the contextmenu might be hidden again, so bail out.
    if (ContextMenu.pendingMenu !== this) {
      return;
    }
    ContextMenu.pendingMenu = null;

    for (let i = 0; i < loadedProviders.length; ++i) {
      const providers = loadedProviders[i];
      const target = this.pendingTargets[i];

      for (const provider of providers) {
        provider.appendApplicableItems(this.event, this, target);
      }
    }

    this.pendingPromises = [];
    this.pendingTargets = [];

    this.innerShow();
  }

  discard(): void {
    if (this.softMenu) {
      this.softMenu.discard();
    }
  }

  private innerShow(): void {
    const menuObject = this.buildMenuDescriptors();

    if (!this.eventTarget) {
      return;
    }
    const ownerDocument = (this.eventTarget as HTMLElement).ownerDocument;
    if (this.useSoftMenu || ContextMenu.useSoftMenu ||
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode()) {
      this.softMenu = new SoftContextMenu(
          (menuObject as SoftContextMenuDescriptor[]), this.itemSelected.bind(this), this.keepOpen, undefined,
          this.onSoftMenuClosed);
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
      this.hostedMenuOpened = true;
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

  private buildMenuDescriptors(): (SoftContextMenuDescriptor|Host.InspectorFrontendHostAPI.ContextMenuDescriptor)[] {
    return super.buildDescriptor().subItems as (
               SoftContextMenuDescriptor | Host.InspectorFrontendHostAPI.ContextMenuDescriptor)[];
  }

  private onItemSelected(event: Common.EventTarget.EventTargetEvent<number>): void {
    this.itemSelected(event.data);
  }

  private itemSelected(id: number): void {
    const handler = this.handlers.get(id);
    if (handler) {
      handler.call(this);
    }
    this.menuCleared();
  }

  private menuCleared(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(
        Host.InspectorFrontendHostAPI.Events.ContextMenuCleared, this.menuCleared, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(
        Host.InspectorFrontendHostAPI.Events.ContextMenuItemSelected, this.onItemSelected, this);
    this.hostedMenuOpened = false;
    this.onSoftMenuClosed?.();
  }

  containsTarget(target: Object): boolean {
    return this.pendingTargets.indexOf(target) >= 0;
  }

  appendApplicableItems(target: Object): void {
    this.pendingPromises.push(loadApplicableRegisteredProviders(target));
    this.pendingTargets.push(target);
  }

  markAsMenuItemCheckBox(): void {
    if (this.softMenu) {
      this.softMenu.markAsMenuItemCheckBox();
    }
  }

  private static pendingMenu: ContextMenu|null = null;
  private static useSoftMenu = false;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly groupWeights =
      ['header', 'new', 'reveal', 'edit', 'clipboard', 'debug', 'view', 'default', 'override', 'save', 'footer'];
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

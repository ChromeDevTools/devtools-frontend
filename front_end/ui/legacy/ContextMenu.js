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

import * as Common from '../../core/common/common.js';  // eslint-disable-line no-unused-vars
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';

import {ActionRegistry} from './ActionRegistry.js';
import {ShortcutRegistry} from './ShortcutRegistry.js';
import {SoftContextMenu, SoftContextMenuDescriptor} from './SoftContextMenu.js';  // eslint-disable-line no-unused-vars
import {deepElementFromEvent} from './UIUtils.js';

export class Item {
  /**
   * @param {?ContextMenu} contextMenu
   * @param {string} type
   * @param {string=} label
   * @param {boolean=} disabled
   * @param {boolean=} checked
   */
  constructor(contextMenu, type, label, disabled, checked) {
    this._type = type;
    this._label = label;
    this._disabled = disabled;
    this._checked = checked;
    this._contextMenu = contextMenu;
    this._id = undefined;
    if (type === 'item' || type === 'checkbox') {
      this._id = contextMenu ? contextMenu._nextId() : 0;
    }

    /** @type {*} */
    this._customElement;
  }

  /**
   * @return {number}
   */
  id() {
    if (this._id === undefined) {
      throw new Error('Tried to access a ContextMenu Item ID but none was set.');
    }
    return this._id;
  }

  /**
   * @return {string}
   */
  type() {
    return this._type;
  }

  /**
   * @return {boolean}
   */
  isEnabled() {
    return !this._disabled;
  }

  /**
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._disabled = !enabled;
  }

  /**
   * @return {!Host.InspectorFrontendHostAPI.ContextMenuDescriptor|!SoftContextMenuDescriptor}
   */
  _buildDescriptor() {
    switch (this._type) {
      case 'item': {
        const result = {
          type: 'item',
          id: this._id,
          label: this._label,
          enabled: !this._disabled,
          checked: undefined,
          subItems: undefined
        };
        if (this._customElement) {
          const resultAsSoftContextMenuItem = /** @type {!SoftContextMenuDescriptor} */ (result);
          resultAsSoftContextMenuItem.element = /** @type {!Element} */ (this._customElement);
        }
        if (this._shortcut) {
          const resultAsSoftContextMenuItem = /** @type {!SoftContextMenuDescriptor} */ (result);
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
          subItems: undefined
        };
      }
      case 'checkbox': {
        return {
          type: 'checkbox',
          id: this._id,
          label: this._label,
          checked: Boolean(this._checked),
          enabled: !this._disabled,
          subItems: undefined
        };
      }
    }
    throw new Error('Invalid item type:' + this._type);
  }

  /**
   * @param {string} shortcut
   */
  setShortcut(shortcut) {
    this._shortcut = shortcut;
  }
}


export class Section {
  /**
   * @param {?ContextMenu} contextMenu
   */
  constructor(contextMenu) {
    this._contextMenu = contextMenu;
    /** @type {!Array<!Item>} */
    this._items = [];
  }

  /**
   * @param {string} label
   * @param {function():*} handler
   * @param {boolean=} disabled
   * @return {!Item}
   */
  appendItem(label, handler, disabled) {
    const item = new Item(this._contextMenu, 'item', label, disabled);
    this._items.push(item);
    if (this._contextMenu) {
      this._contextMenu._setHandler(item.id(), handler);
    }
    return item;
  }

  /**
   * @param {!Element} element
   * @return {!Item}
   */
  appendCustomItem(element) {
    const item = new Item(this._contextMenu, 'item', '<custom>');
    item._customElement = element;
    this._items.push(item);
    return item;
  }

  /**
   * @return {!Item}
   */
  appendSeparator() {
    const item = new Item(this._contextMenu, 'separator');
    this._items.push(item);
    return item;
  }

  /**
   * @param {string} actionId
   * @param {string=} label
   * @param {boolean=} optional
   */
  appendAction(actionId, label, optional) {
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

  /**
   * @param {string} label
   * @param {boolean=} disabled
   * @return {!SubMenu}
   */
  appendSubMenuItem(label, disabled) {
    const item = new SubMenu(this._contextMenu, label, disabled);
    item._init();
    this._items.push(item);
    return item;
  }

  /**
   * @param {string} label
   * @param {function():*} handler
   * @param {boolean=} checked
   * @param {boolean=} disabled
   * @return {!Item}
   */
  appendCheckboxItem(label, handler, checked, disabled) {
    const item = new Item(this._contextMenu, 'checkbox', label, disabled, checked);
    this._items.push(item);
    if (this._contextMenu) {
      this._contextMenu._setHandler(item.id(), handler);
    }
    return item;
  }
}


export class SubMenu extends Item {
  /**
   * @param {?ContextMenu} contextMenu
   * @param {string=} label
   * @param {boolean=} disabled
   */
  constructor(contextMenu, label, disabled) {
    super(contextMenu, 'subMenu', label, disabled);
    /** @type {!Map<string, !Section>} */
    this._sections = new Map();
    /** @type {!Array<!Section>} */
    this._sectionList = [];
  }

  _init() {
    _groupWeights.forEach(name => this.section(name));
  }

  /**
   * @param {string=} name
   * @return {!Section}
   */
  section(name) {
    let section = name ? this._sections.get(name) : null;
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

  /**
   * @return {!Section}
   */
  headerSection() {
    return this.section('header');
  }

  /**
   * @return {!Section}
   */
  newSection() {
    return this.section('new');
  }

  /**
   * @return {!Section}
   */
  revealSection() {
    return this.section('reveal');
  }

  /**
   * @return {!Section}
   */
  clipboardSection() {
    return this.section('clipboard');
  }

  /**
   * @return {!Section}
   */
  editSection() {
    return this.section('edit');
  }

  /**
   * @return {!Section}
   */
  debugSection() {
    return this.section('debug');
  }

  /**
   * @return {!Section}
   */
  viewSection() {
    return this.section('view');
  }

  /**
   * @return {!Section}
   */
  defaultSection() {
    return this.section('default');
  }

  /**
   * @return {!Section}
   */
  saveSection() {
    return this.section('save');
  }

  /**
   * @return {!Section}
   */
  footerSection() {
    return this.section('footer');
  }

  /**
   * @override
   * @return {!Host.InspectorFrontendHostAPI.ContextMenuDescriptor|!SoftContextMenuDescriptor}
   */
  _buildDescriptor() {
    /** @type {!Host.InspectorFrontendHostAPI.ContextMenuDescriptor|!SoftContextMenuDescriptor} */
    const result = {
      type: 'subMenu',
      label: this._label,
      enabled: !this._disabled,
      subItems: [],
      id: undefined,
      checked: undefined
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
          label: undefined
        });
      }
    }
    return result;
  }

  /**
   * @param {string} location
   */
  appendItemsAtLocation(location) {
    /** @type {!Array<!ContextMenuItemRegistration>} */
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
}

Item._uniqueSectionName = 0;

export class ContextMenu extends SubMenu {
  /**
   * @param {!Event} event
   * @param {boolean=} useSoftMenu
   * @param {number=} x
   * @param {number=} y
   */
  constructor(event, useSoftMenu, x, y) {
    super(null);
    const mouseEvent = /** @type {!MouseEvent} */ (event);
    this._contextMenu = this;
    super._init();
    this._defaultSection = this.defaultSection();
    /** @type {!Array.<!Promise.<!Array.<!Provider>>>} */
    this._pendingPromises = [];
    /** @type {!Array<!Object>} */
    this._pendingTargets = [];
    /** @type {!MouseEvent} */
    this._event = mouseEvent;
    this._useSoftMenu = Boolean(useSoftMenu);
    this._x = x === undefined ? mouseEvent.x : x;
    this._y = y === undefined ? mouseEvent.y : y;
    /** @type {!Map<number, function():*>} */
    this._handlers = new Map();
    this._id = 0;

    const target = deepElementFromEvent(event);
    if (target) {
      this.appendApplicableItems(/** @type {!Object} */ (target));
    }
  }

  static initialize() {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.SetUseSoftMenu, setUseSoftMenu);
    /**
     * @param {!Common.EventTarget.EventTargetEvent} event
     */
    function setUseSoftMenu(event) {
      ContextMenu._useSoftMenu = /** @type {boolean} */ (event.data);
    }
  }

  /**
   * @param {!Document} doc
   */
  static installHandler(doc) {
    doc.body.addEventListener('contextmenu', handler, false);

    /**
     * @param {!Event} event
     */
    function handler(event) {
      const contextMenu = new ContextMenu(event);
      contextMenu.show();
    }
  }

  /**
   * @return {number}
   */
  _nextId() {
    return this._id++;
  }

  async show() {
    ContextMenu._pendingMenu = this;
    this._event.consume(true);
    /** @type {!Array<!Array<!Provider>>} */
    const loadedProviders = await Promise.all(this._pendingPromises);

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

  discard() {
    if (this._softMenu) {
      this._softMenu.discard();
    }
  }

  _innerShow() {
    const menuObject = this._buildMenuDescriptors();
    const eventTarget = this._event.target;
    if (!eventTarget) {
      return;
    }
    const ownerDocument = /** @type {!HTMLElement} */ (eventTarget).ownerDocument;
    if (this._useSoftMenu || ContextMenu._useSoftMenu ||
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode()) {
      this._softMenu = new SoftContextMenu(
          /** @type {!Array<!SoftContextMenuDescriptor>} */ (menuObject), this._itemSelected.bind(this));
      this._softMenu.show(/** @type {!Document} */ (ownerDocument), new AnchorBox(this._x, this._y, 0, 0));
    } else {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.showContextMenuAtPoint(
          this._x, this._y, menuObject, /** @type {!Document}*/ (ownerDocument));

      /**
       * @this {ContextMenu}
       */
      function listenToEvents() {
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

  /**
   * @param {number} x
   */
  setX(x) {
    this._x = x;
  }

  /**
   * @param {number} y
   */
  setY(y) {
    this._y = y;
  }

  /**
   * @param {number} id
   * @param {function():*} handler
   */
  _setHandler(id, handler) {
    if (handler) {
      this._handlers.set(id, handler);
    }
  }

  /**
   * @return {!Array.<!Host.InspectorFrontendHostAPI.ContextMenuDescriptor|!SoftContextMenuDescriptor>}
   */
  _buildMenuDescriptors() {
    return /** @type {!Array.<!Host.InspectorFrontendHostAPI.ContextMenuDescriptor|!SoftContextMenuDescriptor>} */ (
        super._buildDescriptor().subItems);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onItemSelected(event) {
    this._itemSelected(/** @type {number} */ (event.data));
  }

  /**
   * @param {number} id
   */
  _itemSelected(id) {
    const handler = this._handlers.get(id);
    if (handler) {
      handler.call(this);
    }
    this._menuCleared();
  }

  _menuCleared() {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(
        Host.InspectorFrontendHostAPI.Events.ContextMenuCleared, this._menuCleared, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(
        Host.InspectorFrontendHostAPI.Events.ContextMenuItemSelected, this._onItemSelected, this);
  }

  /**
   * @param {!Object} target
   * @return {boolean}
   */
  containsTarget(target) {
    return this._pendingTargets.indexOf(target) >= 0;
  }

  /**
   * @param {!Object} target
   */
  appendApplicableItems(target) {
    this._pendingPromises.push(loadApplicableRegisteredProviders(target));
    this._pendingTargets.push(target);
  }
}

ContextMenu._useSoftMenu = false;
/** @type {?ContextMenu} */
ContextMenu._pendingMenu = null;

export const _groupWeights =
    ['header', 'new', 'reveal', 'edit', 'clipboard', 'debug', 'view', 'default', 'save', 'footer'];

/**
 * @interface
 */
export class Provider {
  /**
   * @param {!Event} event
   * @param {!ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {
  }
}

/** @type {!Array<!ProviderRegistration>} */
const registeredProviders = [];

/**
 * @param {!ProviderRegistration} registration
 */
export function registerProvider(registration) {
  registeredProviders.push(registration);
}

/**
 * @param {!Object} target
 * @return {!Promise<Array<Provider>>}
 */
async function loadApplicableRegisteredProviders(target) {
  return Promise.all(
      registeredProviders.filter(isProviderApplicableToContextTypes).map(registration => registration.loadProvider()));

  /**
   * @param {!ProviderRegistration} providerRegistration
   * @return {boolean}
   */
  function isProviderApplicableToContextTypes(providerRegistration) {
    if (!Root.Runtime.Runtime.isDescriptorEnabled(
            {experiment: providerRegistration.experiment, condition: undefined})) {
      return false;
    }
    if (!providerRegistration.contextTypes) {
      return true;
    }
    for (const contextType of providerRegistration.contextTypes()) {
      if (target instanceof contextType) {
        return true;
      }
    }
    return false;
  }
}

/** @type {!Array<!ContextMenuItemRegistration>} */
const registeredItemsProviders = [];

/**
 * @param {!ContextMenuItemRegistration} registration
 */
export function registerItem(registration) {
  registeredItemsProviders.push(registration);
}

/**
 * @param {!ContextMenuItemRegistration} registration
 * @return {boolean}
 */
export function maybeRemoveItem(registration) {
  const itemIndex = registeredItemsProviders.findIndex(
      item => item.actionId === registration.actionId && item.location === registration.location);
  if (itemIndex < 0) {
    return false;
  }
  registeredItemsProviders.splice(itemIndex, 1);
  return true;
}

/**
 * @return {!Array<!ContextMenuItemRegistration>}
 */
function getRegisteredItems() {
  return registeredItemsProviders;
}

/** @enum {string} */
export const ItemLocation = {
  DEVICE_MODE_MENU_SAVE: 'deviceModeMenu/save',
  MAIN_MENU: 'mainMenu',
  MAIN_MENU_DEFAULT: 'mainMenu/default',
  MAIN_MENU_FOOTER: 'mainMenu/footer',
  MAIN_MENU_HELP_DEFAULT: 'mainMenuHelp/default',
  NAVIGATOR_MENU_DEFAULT: 'navigatorMenu/default',
  TIMELINE_MENU_OPEN: 'timelineMenu/open',
};

/**
 * @typedef {{
 *  contextTypes: function(): !Array<?>,
 *  loadProvider: function(): !Promise<!Provider>,
 *  experiment: (undefined|Root.Runtime.ExperimentName)
 * }} */
// @ts-ignore typedef
export let ProviderRegistration;

/**
 * @typedef {{
  *  location: !ItemLocation,
  *  actionId: string,
  *  order: (undefined|number),
  *  experiment?: Root.Runtime.ExperimentName,
  * }} */
// @ts-ignore typedef
export let ContextMenuItemRegistration;

ContextMenu._groupWeights = _groupWeights;

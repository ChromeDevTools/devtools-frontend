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

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as Host from '../host/host.js';

import {SoftContextMenu} from './SoftContextMenu.js';

/**
 * @unrestricted
 */
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
    if (type === 'item' || type === 'checkbox') {
      this._id = contextMenu ? contextMenu._nextId() : 0;
    }
  }

  /**
   * @return {number}
   */
  id() {
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
   * @return {!InspectorFrontendHostAPI.ContextMenuDescriptor}
   */
  _buildDescriptor() {
    switch (this._type) {
      case 'item': {
        const result = {type: 'item', id: this._id, label: this._label, enabled: !this._disabled};
        if (this._customElement) {
          result.element = this._customElement;
        }
        if (this._shortcut) {
          result.shortcut = this._shortcut;
        }
        return result;
      }
      case 'separator': {
        return {type: 'separator'};
      }
      case 'checkbox': {
        return {type: 'checkbox', id: this._id, label: this._label, checked: !!this._checked, enabled: !this._disabled};
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

/**
 * @unrestricted
 */
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
   * @param {function(?)} handler
   * @param {boolean=} disabled
   * @return {!Item}
   */
  appendItem(label, handler, disabled) {
    const item = new Item(this._contextMenu, 'item', label, disabled);
    this._items.push(item);
    this._contextMenu._setHandler(item.id(), handler);
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
    const action = self.UI.actionRegistry.action(actionId);
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
    const shortcut = self.UI.shortcutRegistry.shortcutTitleForAction(actionId);
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
   * @param {function()} handler
   * @param {boolean=} checked
   * @param {boolean=} disabled
   * @return {!Item}
   */
  appendCheckboxItem(label, handler, checked, disabled) {
    const item = new Item(this._contextMenu, 'checkbox', label, disabled, checked);
    this._items.push(item);
    this._contextMenu._setHandler(item.id(), handler);
    return item;
  }
}

/**
 * @unrestricted
 */
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
   * @return {!InspectorFrontendHostAPI.ContextMenuDescriptor}
   */
  _buildDescriptor() {
    /** @type {!InspectorFrontendHostAPI.ContextMenuDescriptor} */
    const result = {type: 'subMenu', label: this._label, enabled: !this._disabled, subItems: []};

    const nonEmptySections = this._sectionList.filter(section => !!section._items.length);
    for (const section of nonEmptySections) {
      for (const item of section._items) {
        result.subItems.push(item._buildDescriptor());
      }
      if (section !== nonEmptySections.peekLast()) {
        result.subItems.push({type: 'separator'});
      }
    }
    return result;
  }

  /**
   * @param {string} location
   */
  appendItemsAtLocation(location) {
    for (const extension of self.runtime.extensions('context-menu-item')) {
      const itemLocation = extension.descriptor()['location'] || '';
      if (!itemLocation.startsWith(location + '/')) {
        continue;
      }

      const section = itemLocation.substr(location.length + 1);
      if (!section || section.includes('/')) {
        continue;
      }

      this.section(section).appendAction(extension.descriptor()['actionId']);
    }
  }
}

Item._uniqueSectionName = 0;

/**
 * @unrestricted
 */
export class ContextMenu extends SubMenu {
  /**
   * @param {!Event} event
   * @param {boolean=} useSoftMenu
   * @param {number=} x
   * @param {number=} y
   */
  constructor(event, useSoftMenu, x, y) {
    super(null);
    this._contextMenu = this;
    super._init();
    this._defaultSection = this.defaultSection();
    /** @type {!Array.<!Promise.<!Array.<!Provider>>>} */
    this._pendingPromises = [];
    /** @type {!Array<!Object>} */
    this._pendingTargets = [];
    this._event = event;
    this._useSoftMenu = !!useSoftMenu;
    this._x = x === undefined ? event.x : x;
    this._y = y === undefined ? event.y : y;
    this._handlers = {};
    this._id = 0;

    const target = event.deepElementFromPoint();
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

  show() {
    Promise.all(this._pendingPromises).then(populate.bind(this)).then(this._innerShow.bind(this));
    ContextMenu._pendingMenu = this;

    /**
     * @param {!Array.<!Array.<!Provider>>} appendCallResults
     * @this {ContextMenu}
     */
    function populate(appendCallResults) {
      if (ContextMenu._pendingMenu !== this) {
        return;
      }
      delete ContextMenu._pendingMenu;

      for (let i = 0; i < appendCallResults.length; ++i) {
        const providers = appendCallResults[i];
        const target = this._pendingTargets[i];

        for (let j = 0; j < providers.length; ++j) {
          const provider = /** @type {!Provider} */ (providers[j]);
          provider.appendApplicableItems(this._event, this, target);
        }
      }

      this._pendingPromises = [];
      this._pendingTargets = [];
    }

    this._event.consume(true);
  }

  discard() {
    if (this._softMenu) {
      this._softMenu.discard();
    }
  }

  _innerShow() {
    const menuObject = this._buildMenuDescriptors();
    if (this._useSoftMenu || ContextMenu._useSoftMenu ||
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode()) {
      this._softMenu = new SoftContextMenu(menuObject, this._itemSelected.bind(this));
      this._softMenu.show(this._event.target.ownerDocument, new AnchorBox(this._x, this._y, 0, 0));
    } else {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.showContextMenuAtPoint(
          this._x, this._y, menuObject, this._event.target.ownerDocument);

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
      setImmediate(listenToEvents.bind(this));
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
   * @param {function(?)} handler
   */
  _setHandler(id, handler) {
    if (handler) {
      this._handlers[id] = handler;
    }
  }

  /**
   * @return {!Array.<!InspectorFrontendHostAPI.ContextMenuDescriptor>}
   */
  _buildMenuDescriptors() {
    return /** @type {!Array.<!InspectorFrontendHostAPI.ContextMenuDescriptor>} */ (super._buildDescriptor().subItems);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onItemSelected(event) {
    this._itemSelected(/** @type {string} */ (event.data));
  }

  /**
   * @param {string} id
   */
  _itemSelected(id) {
    if (this._handlers[id]) {
      this._handlers[id].call(this);
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
    this._pendingPromises.push(self.runtime.allInstances(Provider, target));
    this._pendingTargets.push(target);
  }
}

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
  appendApplicableItems(event, contextMenu, target) {}
}

ContextMenu._groupWeights = _groupWeights;

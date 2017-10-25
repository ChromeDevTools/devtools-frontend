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

/**
 * @unrestricted
 */
UI.ContextMenuItem = class {
  /**
   * @param {?UI.ContextMenu} contextMenu
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
    if (type === 'item' || type === 'checkbox')
      this._id = contextMenu ? contextMenu._nextId() : 0;
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
      case 'item':
        var result = {type: 'item', id: this._id, label: this._label, enabled: !this._disabled};
        if (this._customElement)
          result.element = this._customElement;
        if (this._shortcut)
          result.shortcut = this._shortcut;
        return result;
      case 'separator':
        return {type: 'separator'};
      case 'checkbox':
        return {type: 'checkbox', id: this._id, label: this._label, checked: !!this._checked, enabled: !this._disabled};
    }
    throw new Error('Invalid item type:' + this._type);
  }

  /**
   * @param {string} shortcut
   */
  setShortcut(shortcut) {
    this._shortcut = shortcut;
  }
};

/**
 * @unrestricted
 */
UI.ContextMenuSection = class extends UI.ContextMenuItem {
  /**
   * @param {?UI.ContextMenu} contextMenu
   * @param {boolean} isSubMenu
   * @param {string=} label
   * @param {boolean=} disabled
   */
  constructor(contextMenu, isSubMenu, label, disabled) {
    super(contextMenu, isSubMenu ? 'subMenu' : 'section', label, disabled);
    this._isSubMenu = isSubMenu;
    /** @type {!Array<!UI.ContextMenuItem>} */
    this._items = [];
    /** @type {!Map<string, !UI.ContextMenuSection>} */
    this._sections = new Map();
  }

  _init() {
    if (this._isSubMenu) {
      // Proactively order sections.
      UI.ContextMenu._groupWeights.forEach(name => this.section(name));
    }
  }

  /**
   * @param {string} label
   * @param {function(?)} handler
   * @param {boolean=} disabled
   * @return {!UI.ContextMenuItem}
   */
  appendItem(label, handler, disabled) {
    var item = new UI.ContextMenuItem(this._contextMenu, 'item', label, disabled);
    this._pushItem(item);
    this._contextMenu._setHandler(item.id(), handler);
    return item;
  }

  /**
   * @param {!Element} element
   * @return {!UI.ContextMenuItem}
   */
  appendCustomItem(element) {
    var item = new UI.ContextMenuItem(this._contextMenu, 'item', '<custom>');
    item._customElement = element;
    this._pushItem(item);
    return item;
  }

  /**
   * @param {string} actionId
   * @param {string=} label
   * @return {!UI.ContextMenuItem}
   */
  appendAction(actionId, label) {
    var action = UI.actionRegistry.action(actionId);
    if (!label)
      label = action.title();
    var result = this.appendItem(label, action.execute.bind(action));
    var shortcut = UI.shortcutRegistry.shortcutTitleForAction(actionId);
    if (shortcut)
      result.setShortcut(shortcut);
    return result;
  }

  /**
   * @param {string} label
   * @param {boolean=} disabled
   * @param {string=} subMenuId
   * @return {!UI.ContextMenuSection}
   */
  appendSubMenuItem(label, disabled, subMenuId) {
    var item = new UI.ContextMenuSection(this._contextMenu, true, label, disabled);
    item._init();
    if (subMenuId)
      this._contextMenu._namedSubMenus.set(subMenuId, item);
    this._pushItem(item);
    return item;
  }

  /**
   * @param {string=} name
   * @return {!UI.ContextMenuSection}
   */
  section(name) {
    if (!name)
      return this.section('default').section(String(++UI.ContextMenuItem._uniqueSectionName));
    var section = this._sections.get(name);
    if (!section) {
      section = new UI.ContextMenuSection(this._contextMenu, false, '', false);
      section._init();
      this._sections.set(name, section);
      this._pushItem(section);
    }
    return section;
  }

  /**
   * @return {!UI.ContextMenuSection}
   */
  newSection() {
    return this.section('new');
  }

  /**
   * @return {!UI.ContextMenuSection}
   */
  revealSection() {
    return this.section('reveal');
  }

  /**
   * @return {!UI.ContextMenuSection}
   */
  clipboardSection() {
    return this.section('clipboard');
  }

  /**
   * @return {!UI.ContextMenuSection}
   */
  editSection() {
    return this.section('edit');
  }

  /**
   * @return {!UI.ContextMenuSection}
   */
  debugSection() {
    return this.section('debug');
  }

  /**
   * @return {!UI.ContextMenuSection}
   */
  viewSection() {
    return this.section('view');
  }

  /**
   * @return {!UI.ContextMenuSection}
   */
  defaultSection() {
    return this.section('default');
  }

  /**
   * @return {!UI.ContextMenuSection}
   */
  saveSection() {
    return this.section('save');
  }

  /**
   * @param {string} label
   * @param {function()} handler
   * @param {boolean=} checked
   * @param {boolean=} disabled
   * @return {!UI.ContextMenuItem}
   */
  appendCheckboxItem(label, handler, checked, disabled) {
    var item = new UI.ContextMenuItem(this._contextMenu, 'checkbox', label, disabled, checked);
    this._pushItem(item);
    this._contextMenu._setHandler(item.id(), handler);
    return item;
  }

  appendSeparator() {
    this._items.push(new UI.ContextMenuItem(this._contextMenu, 'separator'));
  }

  /**
   * @param {!UI.ContextMenuItem} item
   */
  _pushItem(item) {
    this._items.push(item);
  }

  /**
   * @return {boolean}
   */
  isEmpty() {
    return !this._items.length;
  }

  /**
   * @override
   * @return {!InspectorFrontendHostAPI.ContextMenuDescriptor}
   */
  _buildDescriptor() {
    /** @type {!InspectorFrontendHostAPI.ContextMenuDescriptor} */
    var result = {type: 'subMenu', label: this._label, enabled: !this._disabled, subItems: []};
    /** @type {!Array<!InspectorFrontendHostAPI.ContextMenuDescriptor>} */
    var allItems = [];
    for (var item of this._items) {
      if (item instanceof UI.ContextMenuSection && !item._isSubMenu) {
        allItems.push({type: 'separator'});
        allItems.push(.../** @type {!Array<!InspectorFrontendHostAPI.ContextMenuDescriptor>} */ (
            item._buildDescriptor().subItems));
        allItems.push({type: 'separator'});
      } else {
        allItems.push(item._buildDescriptor());
      }
    }
    var pendingSeparator = false;
    var hadItems = false;
    for (var item of allItems) {
      if (item.type === 'separator') {
        pendingSeparator = hadItems;
        continue;
      }
      if (pendingSeparator)
        result.subItems.push({type: 'separator'});
      hadItems = true;
      pendingSeparator = false;
      result.subItems.push(item);
    }
    return result;
  }

  /**
   * @param {string} location
   */
  appendItemsAtLocation(location) {
    for (var extension of self.runtime.extensions('context-menu-item')) {
      var itemLocation = extension.descriptor()['location'] || '';
      if (!itemLocation.startsWith(location + '/'))
        continue;

      var section = itemLocation.substr(location.length + 1);
      if (!section || section.includes('/'))
        continue;

      var subMenuId = extension.descriptor()['subMenuId'];
      if (subMenuId) {
        var subMenuItem = this.section(section).appendSubMenuItem(extension.title(), false, subMenuId);
        subMenuItem.appendItemsAtLocation(subMenuId);
      } else {
        this.section(section).appendAction(extension.descriptor()['actionId']);
      }
    }
    this.appendSeparator();
  }
};

UI.ContextMenuItem._uniqueSectionName = 0;

/**
 * @unrestricted
 */
UI.ContextMenu = class extends UI.ContextMenuSection {
  /**
   * @param {!Event} event
   * @param {boolean=} useSoftMenu
   * @param {number=} x
   * @param {number=} y
   */
  constructor(event, useSoftMenu, x, y) {
    super(null, true, '');
    this._contextMenu = this;
    super._init();
    this._defaultSection = this.defaultSection();
    /** @type {!Array.<!Promise.<!Array.<!UI.ContextMenu.Provider>>>} */
    this._pendingPromises = [];
    /** @type {!Array<!Object>} */
    this._pendingTargets = [];
    this._event = event;
    this._useSoftMenu = !!useSoftMenu;
    this._x = x === undefined ? event.x : x;
    this._y = y === undefined ? event.y : y;
    this._handlers = {};
    this._id = 0;
    /** @type {!Map<string, !UI.ContextMenuSection>} */
    this._namedSubMenus = new Map();

    var target = event.deepElementFromPoint();
    if (target)
      this.appendApplicableItems(/** @type {!Object} */ (target));
  }

  static initialize() {
    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.SetUseSoftMenu, setUseSoftMenu);
    /**
     * @param {!Common.Event} event
     */
    function setUseSoftMenu(event) {
      UI.ContextMenu._useSoftMenu = /** @type {boolean} */ (event.data);
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
      var contextMenu = new UI.ContextMenu(event);
      contextMenu.show();
    }
  }

  /**
   * @return {number}
   */
  _nextId() {
    return this._id++;
  }

  /**
   * @param {function()} callback
   */
  beforeShow(callback) {
    this._beforeShow = callback;
  }

  show() {
    Promise.all(this._pendingPromises).then(populate.bind(this)).then(this._innerShow.bind(this));
    UI.ContextMenu._pendingMenu = this;

    /**
     * @param {!Array.<!Array.<!UI.ContextMenu.Provider>>} appendCallResults
     * @this {UI.ContextMenu}
     */
    function populate(appendCallResults) {
      if (UI.ContextMenu._pendingMenu !== this)
        return;
      delete UI.ContextMenu._pendingMenu;

      for (var i = 0; i < appendCallResults.length; ++i) {
        var providers = appendCallResults[i];
        var target = this._pendingTargets[i];

        for (var j = 0; j < providers.length; ++j) {
          var provider = /** @type {!UI.ContextMenu.Provider} */ (providers[j]);
          this.appendSeparator();
          provider.appendApplicableItems(this._event, this, target);
          this.appendSeparator();
        }
      }

      this._pendingPromises = [];
      this._pendingTargets = [];
    }

    this._event.consume(true);
  }

  discard() {
    if (this._softMenu)
      this._softMenu.discard();
  }

  _innerShow() {
    if (typeof this._beforeShow === 'function') {
      this._beforeShow();
      delete this._beforeShow;
    }

    var menuObject = this._buildMenuDescriptors();
    if (this._useSoftMenu || UI.ContextMenu._useSoftMenu || InspectorFrontendHost.isHostedMode()) {
      this._softMenu = new UI.SoftContextMenu(menuObject, this._itemSelected.bind(this));
      this._softMenu.show(this._event.target.ownerDocument, new AnchorBox(this._x, this._y, 0, 0));
    } else {
      InspectorFrontendHost.showContextMenuAtPoint(this._x, this._y, menuObject, this._event.target.ownerDocument);

      /**
       * @this {UI.ContextMenu}
       */
      function listenToEvents() {
        InspectorFrontendHost.events.addEventListener(
            InspectorFrontendHostAPI.Events.ContextMenuCleared, this._menuCleared, this);
        InspectorFrontendHost.events.addEventListener(
            InspectorFrontendHostAPI.Events.ContextMenuItemSelected, this._onItemSelected, this);
      }

      // showContextMenuAtPoint call above synchronously issues a clear event for previous context menu (if any),
      // so we skip it before subscribing to the clear event.
      setImmediate(listenToEvents.bind(this));
    }
  }

  /**
   * @param {number} id
   * @param {function(?)} handler
   */
  _setHandler(id, handler) {
    if (handler)
      this._handlers[id] = handler;
  }

  /**
   * @return {!Array.<!InspectorFrontendHostAPI.ContextMenuDescriptor>}
   */
  _buildMenuDescriptors() {
    return /** @type {!Array.<!InspectorFrontendHostAPI.ContextMenuDescriptor>} */ (super._buildDescriptor().subItems);
  }

  /**
   * @param {!Common.Event} event
   */
  _onItemSelected(event) {
    this._itemSelected(/** @type {string} */ (event.data));
  }

  /**
   * @param {string} id
   */
  _itemSelected(id) {
    if (this._handlers[id])
      this._handlers[id].call(this);
    this._menuCleared();
  }

  _menuCleared() {
    InspectorFrontendHost.events.removeEventListener(
        InspectorFrontendHostAPI.Events.ContextMenuCleared, this._menuCleared, this);
    InspectorFrontendHost.events.removeEventListener(
        InspectorFrontendHostAPI.Events.ContextMenuItemSelected, this._onItemSelected, this);
  }

  /**
   * @param {!Object} target
   */
  appendApplicableItems(target) {
    this._pendingPromises.push(self.runtime.allInstances(UI.ContextMenu.Provider, target));
    this._pendingTargets.push(target);
  }

  /**
   * @param {string} name
   * @return {?UI.ContextMenuSection}
   */
  namedSubMenu(name) {
    return this._namedSubMenus.get(name) || null;
  }

  /**
   * @override
   * @param {string} label
   * @param {function(?)} handler
   * @param {boolean=} disabled
   * @return {!UI.ContextMenuItem}
   */
  appendItem(label, handler, disabled) {
    return this._defaultSection.appendItem(label, handler, disabled);
  }

  /**
   * @override
   * @param {!Element} element
   * @return {!UI.ContextMenuItem}
   */
  appendCustomItem(element) {
    return this._defaultSection.appendCustomItem(element);
  }

  /**
   * @override
   * @param {string} actionId
   * @param {string=} label
   * @return {!UI.ContextMenuItem}
   */
  appendAction(actionId, label) {
    return this._defaultSection.appendAction(actionId, label);
  }

  /**
   * @override
   * @param {string} label
   * @param {boolean=} disabled
   * @param {string=} subMenuId
   * @return {!UI.ContextMenuSection}
   */
  appendSubMenuItem(label, disabled, subMenuId) {
    return this._defaultSection.appendSubMenuItem(label, disabled, subMenuId);
  }

  /**
   * @override
   * @param {string} label
   * @param {function()} handler
   * @param {boolean=} checked
   * @param {boolean=} disabled
   * @return {!UI.ContextMenuItem}
   */
  appendCheckboxItem(label, handler, checked, disabled) {
    return this._defaultSection.appendCheckboxItem(label, handler, checked, disabled);
  }

  /**
   * @override
   */
  appendSeparator() {
    return this._defaultSection.appendSeparator();
  }

  /**
   * @override
   * @return {boolean}
   */
  isEmpty() {
    for (var section of this._sections.values()) {
      if (!section.isEmpty())
        return false;
    }
    return true;
  }

  /**
   * @override
   * @param {string} location
   */
  appendItemsAtLocation(location) {
    return this.section('default').appendItemsAtLocation(location);
  }
};

UI.ContextMenu._groupWeights = ['new', 'reveal', 'edit', 'clipboard', 'debug', 'view', 'default', 'save', 'footer'];

/**
 * @interface
 */
UI.ContextMenu.Provider = function() {};

UI.ContextMenu.Provider.prototype = {
  /**
   * @param {!Event} event
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {}
};

// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Sources.EventListenerBreakpointsSidebarPane = class extends UI.VBox {
  constructor() {
    super(true);
    this._categoriesTreeOutline = new UI.TreeOutlineInShadow();
    this._categoriesTreeOutline.element.tabIndex = 0;
    this._categoriesTreeOutline.registerRequiredCSS('sources/eventListenerBreakpoints.css');
    this.contentElement.appendChild(this._categoriesTreeOutline.element);

    /** @type {!Map<string, !Sources.EventListenerBreakpointsSidebarPane.Item>} */
    this._categories = new Map();
    var categories = SDK.domDebuggerManager.eventListenerBreakpoints().map(breakpoint => breakpoint.category());
    categories.sort();
    for (var category of categories) {
      if (!this._categories.has(category))
        this._createCategory(category);
    }

    /** @type {!Map<!SDK.DOMDebuggerModel.EventListenerBreakpoint, !Sources.EventListenerBreakpointsSidebarPane.Item>} */
    this._breakpoints = new Map();
    for (var breakpoint of SDK.domDebuggerManager.eventListenerBreakpoints())
      this._createBreakpoint(breakpoint);

    SDK.targetManager.addModelListener(SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this._update, this);
    SDK.targetManager.addModelListener(SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed, this._update, this);
    UI.context.addFlavorChangeListener(SDK.Target, this._update, this);
  }

  /**
   * @param {string} name
   */
  _createCategory(name) {
    var labelNode = UI.CheckboxLabel.create(name);
    labelNode.checkboxElement.addEventListener('click', this._categoryCheckboxClicked.bind(this, name), true);

    var treeElement = new UI.TreeElement(labelNode);
    treeElement.selectable = false;
    this._categoriesTreeOutline.appendChild(treeElement);

    this._categories.set(name, {element: treeElement, checkbox: labelNode.checkboxElement});
  }

  /**
   * @param {!SDK.DOMDebuggerModel.EventListenerBreakpoint} breakpoint
   */
  _createBreakpoint(breakpoint) {
    var labelNode = UI.CheckboxLabel.create(breakpoint.title());
    labelNode.classList.add('source-code');
    labelNode.checkboxElement.addEventListener('click', this._breakpointCheckboxClicked.bind(this, breakpoint), true);

    var treeElement = new UI.TreeElement(labelNode);
    treeElement.listItemElement.createChild('div', 'breakpoint-hit-marker');
    treeElement.selectable = false;
    this._categories.get(breakpoint.category()).element.appendChild(treeElement);

    this._breakpoints.set(breakpoint, {element: treeElement, checkbox: labelNode.checkboxElement});
  }

  _update() {
    var target = UI.context.flavor(SDK.Target);
    var debuggerModel = target ? target.model(SDK.DebuggerModel) : null;
    var details = debuggerModel ? debuggerModel.debuggerPausedDetails() : null;

    if (!details || details.reason !== SDK.DebuggerModel.BreakReason.EventListener || !details.auxData) {
      if (this._highlightedElement) {
        this._highlightedElement.classList.remove('breakpoint-hit');
        delete this._highlightedElement;
      }
      return;
    }

    var breakpoint = SDK.domDebuggerManager.resolveEventListenerBreakpoint(/** @type {!Object} */ (details.auxData));
    if (!breakpoint)
      return;

    UI.viewManager.showView('sources.eventListenerBreakpoints');
    this._categories.get(breakpoint.category()).element.expand();
    this._highlightedElement = this._breakpoints.get(breakpoint).element.listItemElement;
    this._highlightedElement.classList.add('breakpoint-hit');
  }

  /**
   * @param {string} category
   */
  _categoryCheckboxClicked(category) {
    var item = this._categories.get(category);
    var enabled = item.checkbox.checked;
    for (var breakpoint of this._breakpoints.keys()) {
      if (breakpoint.category() === category) {
        breakpoint.setEnabled(enabled);
        this._breakpoints.get(breakpoint).checkbox.checked = enabled;
      }
    }
  }

  /**
   * @param {!SDK.DOMDebuggerModel.EventListenerBreakpoint} breakpoint
   */
  _breakpointCheckboxClicked(breakpoint) {
    var item = this._breakpoints.get(breakpoint);
    breakpoint.setEnabled(item.checkbox.checked);

    var hasEnabled = false;
    var hasDisabled = false;
    for (var other of this._breakpoints.keys()) {
      if (other.category() === breakpoint.category()) {
        if (other.enabled())
          hasEnabled = true;
        else
          hasDisabled = true;
      }
    }

    var checkbox = this._categories.get(breakpoint.category()).checkbox;
    checkbox.checked = hasEnabled;
    checkbox.indeterminate = hasEnabled && hasDisabled;
  }
};

/** @typedef {!{element: !UI.TreeElement, checkbox: !Element}} */
Sources.EventListenerBreakpointsSidebarPane.Item;

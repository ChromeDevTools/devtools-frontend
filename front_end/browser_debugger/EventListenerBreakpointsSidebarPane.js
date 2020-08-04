// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/**
 * @unrestricted
 */
export class EventListenerBreakpointsSidebarPane extends UI.Widget.VBox {
  constructor() {
    super(true);
    this._categoriesTreeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    this._categoriesTreeOutline.registerRequiredCSS('browser_debugger/eventListenerBreakpoints.css');
    this._categoriesTreeOutline.setShowSelectionOnKeyboardFocus(/* show */ true);
    this.contentElement.appendChild(this._categoriesTreeOutline.element);

    /** @type {!Map<string, !Item>} */
    this._categories = new Map();
    const categories = self.SDK.domDebuggerManager.eventListenerBreakpoints().map(breakpoint => breakpoint.category());
    categories.sort();
    for (const category of categories) {
      if (!this._categories.has(category)) {
        this._createCategory(category);
      }
    }
    if (categories.length > 0) {
      const firstCategory = this._categories.get(categories[0]);
      firstCategory.element.select();
    }

    /** @type {!Map<!SDK.DOMDebuggerModel.EventListenerBreakpoint, !Item>} */
    this._breakpoints = new Map();
    for (const breakpoint of self.SDK.domDebuggerManager.eventListenerBreakpoints()) {
      this._createBreakpoint(breakpoint);
    }

    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this._update, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed, this._update, this);
    self.UI.context.addFlavorChangeListener(SDK.SDKModel.Target, this._update, this);
  }

  /**
   * @override
   */
  focus() {
    this._categoriesTreeOutline.forceSelect();
  }

  /**
   * @param {string} name
   */
  _createCategory(name) {
    const labelNode = UI.UIUtils.CheckboxLabel.create(name);
    labelNode.checkboxElement.addEventListener('click', this._categoryCheckboxClicked.bind(this, name), true);
    labelNode.checkboxElement.tabIndex = -1;

    const treeElement = new UI.TreeOutline.TreeElement(labelNode);
    treeElement.listItemElement.addEventListener('keydown', event => {
      if (event.key === ' ') {
        this._categories.get(name).checkbox.click();
        event.consume(true);
      }
    });
    labelNode.checkboxElement.addEventListener('focus', () => treeElement.listItemElement.focus());
    UI.ARIAUtils.setChecked(treeElement.listItemElement, false);
    this._categoriesTreeOutline.appendChild(treeElement);

    this._categories.set(name, {element: treeElement, checkbox: labelNode.checkboxElement});
  }

  /**
   * @param {!SDK.DOMDebuggerModel.EventListenerBreakpoint} breakpoint
   */
  _createBreakpoint(breakpoint) {
    const labelNode = UI.UIUtils.CheckboxLabel.create(breakpoint.title());
    labelNode.classList.add('source-code');
    labelNode.checkboxElement.addEventListener('click', this._breakpointCheckboxClicked.bind(this, breakpoint), true);
    labelNode.checkboxElement.tabIndex = -1;

    const treeElement = new UI.TreeOutline.TreeElement(labelNode);
    treeElement.listItemElement.addEventListener('keydown', event => {
      if (event.key === ' ') {
        this._breakpoints.get(breakpoint).checkbox.click();
        event.consume(true);
      }
    });
    labelNode.checkboxElement.addEventListener('focus', () => treeElement.listItemElement.focus());
    UI.ARIAUtils.setChecked(treeElement.listItemElement, false);
    treeElement.listItemElement.createChild('div', 'breakpoint-hit-marker');
    this._categories.get(breakpoint.category()).element.appendChild(treeElement);

    this._breakpoints.set(breakpoint, {element: treeElement, checkbox: labelNode.checkboxElement});
  }

  _update() {
    const target = self.UI.context.flavor(SDK.SDKModel.Target);
    const debuggerModel = target ? target.model(SDK.DebuggerModel.DebuggerModel) : null;
    const details = debuggerModel ? debuggerModel.debuggerPausedDetails() : null;

    if (!details || details.reason !== SDK.DebuggerModel.BreakReason.EventListener || !details.auxData) {
      if (this._highlightedElement) {
        UI.ARIAUtils.setDescription(this._highlightedElement, '');
        this._highlightedElement.classList.remove('breakpoint-hit');
        delete this._highlightedElement;
      }
      return;
    }

    const breakpoint =
        self.SDK.domDebuggerManager.resolveEventListenerBreakpoint(/** @type {!Object} */ (details.auxData));
    if (!breakpoint) {
      return;
    }

    UI.ViewManager.ViewManager.instance().showView('sources.eventListenerBreakpoints');
    this._categories.get(breakpoint.category()).element.expand();
    this._highlightedElement = this._breakpoints.get(breakpoint).element.listItemElement;
    UI.ARIAUtils.setDescription(this._highlightedElement, ls`breakpoint hit`);
    this._highlightedElement.classList.add('breakpoint-hit');
  }

  /**
   * @param {string} category
   */
  _categoryCheckboxClicked(category) {
    const item = this._categories.get(category);
    const enabled = item.checkbox.checked;
    UI.ARIAUtils.setChecked(item.element.listItemElement, enabled);

    for (const breakpoint of this._breakpoints.keys()) {
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
    const item = this._breakpoints.get(breakpoint);
    breakpoint.setEnabled(item.checkbox.checked);
    UI.ARIAUtils.setChecked(item.element.listItemElement, item.checkbox.checked);

    let hasEnabled = false;
    let hasDisabled = false;
    for (const other of this._breakpoints.keys()) {
      if (other.category() === breakpoint.category()) {
        if (other.enabled()) {
          hasEnabled = true;
        } else {
          hasDisabled = true;
        }
      }
    }

    const category = this._categories.get(breakpoint.category());
    category.checkbox.checked = hasEnabled;
    category.checkbox.indeterminate = hasEnabled && hasDisabled;
    if (category.checkbox.indeterminate) {
      UI.ARIAUtils.setCheckboxAsIndeterminate(category.element.listItemElement);
    } else {
      UI.ARIAUtils.setChecked(category.element.listItemElement, hasEnabled);
    }
  }
}

/** @typedef {!{element: !UI.TreeOutline.TreeElement, checkbox: !Element}} */
export let Item;

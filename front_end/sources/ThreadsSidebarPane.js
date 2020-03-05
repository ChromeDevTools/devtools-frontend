// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/**
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.DebuggerModel.DebuggerModel>}
 * @implements {UI.ListControl.ListDelegate<!SDK.DebuggerModel.DebuggerModel>}
 */
export class ThreadsSidebarPane extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('sources/threadsSidebarPane.css');

    /** @type {!UI.ListModel.ListModel<!SDK.DebuggerModel.DebuggerModel>} */
    this._items = new UI.ListModel.ListModel();
    /** @type {!UI.ListControl.ListControl<!SDK.DebuggerModel.DebuggerModel>} */
    this._list = new UI.ListControl.ListControl(this._items, this, UI.ListControl.ListMode.NonViewport);
    const currentTarget = self.UI.context.flavor(SDK.SDKModel.Target);
    this._selectedModel = !!currentTarget ? currentTarget.model(SDK.DebuggerModel.DebuggerModel) : null;
    this.contentElement.appendChild(this._list.element);

    self.UI.context.addFlavorChangeListener(SDK.SDKModel.Target, this._targetFlavorChanged, this);
    SDK.SDKModel.TargetManager.instance().observeModels(SDK.DebuggerModel.DebuggerModel, this);
  }

  /**
   * @return {boolean}
   */
  static shouldBeShown() {
    return SDK.SDKModel.TargetManager.instance().models(SDK.DebuggerModel.DebuggerModel).length >= 2;
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   * @return {!Element}
   */
  createElementForItem(debuggerModel) {
    const element = createElementWithClass('div', 'thread-item');
    const title = element.createChild('div', 'thread-item-title');
    const pausedState = element.createChild('div', 'thread-item-paused-state');
    element.appendChild(UI.Icon.Icon.create('smallicon-thick-right-arrow', 'selected-thread-icon'));
    element.tabIndex = -1;
    self.onInvokeElement(element, event => {
      self.UI.context.setFlavor(SDK.SDKModel.Target, debuggerModel.target());
      event.consume(true);
    });
    const isSelected = self.UI.context.flavor(SDK.SDKModel.Target) === debuggerModel.target();
    element.classList.toggle('selected', isSelected);
    UI.ARIAUtils.setSelected(element, isSelected);

    function updateTitle() {
      const executionContext = debuggerModel.runtimeModel().defaultExecutionContext();
      title.textContent =
          executionContext && executionContext.label() ? executionContext.label() : debuggerModel.target().name();
    }

    function updatePausedState() {
      pausedState.textContent = debuggerModel.isPaused() ? ls`paused` : '';
    }

    /**
     * @param {!Common.EventTarget.EventTargetEvent} event
     */
    function targetNameChanged(event) {
      const target = /** @type {!SDK.SDKModel.Target} */ (event.data);
      if (target === debuggerModel.target()) {
        updateTitle();
      }
    }

    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerPaused, updatePausedState);
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerResumed, updatePausedState);
    debuggerModel.runtimeModel().addEventListener(SDK.RuntimeModel.Events.ExecutionContextChanged, updateTitle);
    SDK.SDKModel.TargetManager.instance().addEventListener(SDK.SDKModel.Events.NameChanged, targetNameChanged);

    updatePausedState();
    updateTitle();
    return element;
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   * @return {number}
   */
  heightForItem(debuggerModel) {
    console.assert(false);  // Should not be called.
    return 0;
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   * @return {boolean}
   */
  isItemSelectable(debuggerModel) {
    return true;
  }

  /**
   * @override
   * @param {?SDK.DebuggerModel.DebuggerModel} from
   * @param {?SDK.DebuggerModel.DebuggerModel} to
   * @param {?Element} fromElement
   * @param {?Element} toElement
   */
  selectedItemChanged(from, to, fromElement, toElement) {
    if (fromElement) {
      fromElement.tabIndex = -1;
    }
    if (toElement) {
      this.setDefaultFocusedElement(toElement);
      toElement.tabIndex = 0;
      if (this.hasFocus()) {
        toElement.focus();
      }
    }
  }

  /**
   * @override
   * @param {?Element} fromElement
   * @param {?Element} toElement
   * @return {boolean}
   */
  updateSelectedItemARIA(fromElement, toElement) {
    return false;
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   */
  modelAdded(debuggerModel) {
    this._items.insert(this._items.length, debuggerModel);
    const currentTarget = self.UI.context.flavor(SDK.SDKModel.Target);
    if (currentTarget === debuggerModel.target()) {
      this._list.selectItem(debuggerModel);
    }
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   */
  modelRemoved(debuggerModel) {
    this._items.remove(this._items.indexOf(debuggerModel));
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _targetFlavorChanged(event) {
    const hadFocus = this.hasFocus();
    const target = /** @type {!SDK.SDKModel.Target} */ (event.data);
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    if (debuggerModel) {
      this._list.refreshItem(debuggerModel);
    }
    if (!!this._selectedModel) {
      this._list.refreshItem(this._selectedModel);
    }
    this._selectedModel = debuggerModel;
    if (hadFocus) {
      this.focus();
    }
  }
}

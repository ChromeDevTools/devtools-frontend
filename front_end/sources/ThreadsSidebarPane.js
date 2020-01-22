// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {SDK.SDKModelObserver<!SDK.DebuggerModel>}
 * @implements {UI.ListDelegate<!SDK.DebuggerModel>}
 */
export class ThreadsSidebarPane extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('sources/threadsSidebarPane.css');

    /** @type {!UI.ListModel<!SDK.DebuggerModel>} */
    this._items = new UI.ListModel();
    /** @type {!UI.ListControl<!SDK.DebuggerModel>} */
    this._list = new UI.ListControl(this._items, this, UI.ListMode.NonViewport);
    const currentTarget = UI.context.flavor(SDK.Target);
    this._selectedModel = !!currentTarget ? currentTarget.model(SDK.DebuggerModel) : null;
    this.contentElement.appendChild(this._list.element);

    UI.context.addFlavorChangeListener(SDK.Target, this._targetFlavorChanged, this);
    SDK.targetManager.observeModels(SDK.DebuggerModel, this);
  }

  /**
   * @return {boolean}
   */
  static shouldBeShown() {
    return SDK.targetManager.models(SDK.DebuggerModel).length >= 2;
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel} debuggerModel
   * @return {!Element}
   */
  createElementForItem(debuggerModel) {
    const element = createElementWithClass('div', 'thread-item');
    const title = element.createChild('div', 'thread-item-title');
    const pausedState = element.createChild('div', 'thread-item-paused-state');
    element.appendChild(UI.Icon.create('smallicon-thick-right-arrow', 'selected-thread-icon'));
    element.tabIndex = -1;
    self.onInvokeElement(element, event => {
      UI.context.setFlavor(SDK.Target, debuggerModel.target());
      event.consume(true);
    });
    const isSelected = UI.context.flavor(SDK.Target) === debuggerModel.target();
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
     * @param {!Common.Event} event
     */
    function targetNameChanged(event) {
      const target = /** @type {!SDK.Target} */ (event.data);
      if (target === debuggerModel.target()) {
        updateTitle();
      }
    }

    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerPaused, updatePausedState);
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerResumed, updatePausedState);
    debuggerModel.runtimeModel().addEventListener(SDK.RuntimeModel.Events.ExecutionContextChanged, updateTitle);
    SDK.targetManager.addEventListener(SDK.TargetManager.Events.NameChanged, targetNameChanged);

    updatePausedState();
    updateTitle();
    return element;
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel} debuggerModel
   * @return {number}
   */
  heightForItem(debuggerModel) {
    console.assert(false);  // Should not be called.
    return 0;
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel} debuggerModel
   * @return {boolean}
   */
  isItemSelectable(debuggerModel) {
    return true;
  }

  /**
   * @override
   * @param {?SDK.DebuggerModel} from
   * @param {?SDK.DebuggerModel} to
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
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  modelAdded(debuggerModel) {
    this._items.insert(this._items.length, debuggerModel);
    const currentTarget = UI.context.flavor(SDK.Target);
    if (currentTarget === debuggerModel.target()) {
      this._list.selectItem(debuggerModel);
    }
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  modelRemoved(debuggerModel) {
    this._items.remove(this._items.indexOf(debuggerModel));
  }

  /**
   * @param {!Common.Event} event
   */
  _targetFlavorChanged(event) {
    const hadFocus = this.hasFocus();
    const target = /** @type {!SDK.Target} */ (event.data);
    const debuggerModel = target.model(SDK.DebuggerModel);
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

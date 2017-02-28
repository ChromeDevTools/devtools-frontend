// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {SDK.SDKModelObserver<!SDK.DebuggerModel>}
 * @implements {UI.ListDelegate<!SDK.DebuggerModel>}
 */
Sources.ThreadsSidebarPane = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('sources/threadsSidebarPane.css');

    /** @type {!UI.ListControl<!SDK.DebuggerModel>} */
    this._list = new UI.ListControl(this, UI.ListMode.NonViewport);
    this.contentElement.appendChild(this._list.element);

    this._availableNodeTargetsElement = this.contentElement.createChild('div', 'hidden available-node-targets');

    UI.context.addFlavorChangeListener(SDK.Target, this._targetFlavorChanged, this);

    SDK.targetManager.addEventListener(
        SDK.TargetManager.Events.AvailableNodeTargetsChanged, this._availableNodeTargetsChanged, this);
    this._availableNodeTargetsChanged();

    SDK.targetManager.observeModels(SDK.DebuggerModel, this);
  }

  /**
   * @return {boolean}
   */
  static shouldBeShown() {
    var minJSTargets = Runtime.queryParam('nodeFrontend') ? 1 : 2;
    if (SDK.targetManager.models(SDK.DebuggerModel).length >= minJSTargets)
      return true;
    return !!SDK.targetManager.availableNodeTargetsCount();
  }

  _availableNodeTargetsChanged() {
    var count = SDK.targetManager.availableNodeTargetsCount();
    if (!count) {
      this._availableNodeTargetsElement.classList.add('hidden');
      return;
    }
    this._availableNodeTargetsElement.removeChildren();
    this._availableNodeTargetsElement.createTextChild(
        count === 1 ? Common.UIString('Node instance available.') :
                      Common.UIString('%d Node instances available.', count));
    var link = this._availableNodeTargetsElement.createChild('span', 'link');
    link.textContent = Common.UIString('Connect');
    link.addEventListener('click', () => {
      InspectorFrontendHost.openNodeFrontend();
    }, false);
    this._availableNodeTargetsElement.classList.remove('hidden');
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel} debuggerModel
   * @return {!Element}
   */
  createElementForItem(debuggerModel) {
    var element = createElementWithClass('div', 'thread-item');
    var title = element.createChild('div', 'thread-item-title');
    var pausedState = element.createChild('div', 'thread-item-paused-state');
    element.appendChild(UI.Icon.create('smallicon-thick-right-arrow', 'selected-thread-icon'));

    function updateTitle() {
      var executionContext = debuggerModel.target().runtimeModel.defaultExecutionContext();
      title.textContent =
          executionContext && executionContext.label() ? executionContext.label() : debuggerModel.target().name();
    }

    function updatePausedState() {
      pausedState.textContent = Common.UIString(debuggerModel.isPaused() ? 'paused' : '');
    }

    /**
     * @param {!Common.Event} event
     */
    function targetNameChanged(event) {
      var target = /** @type {!SDK.Target} */ (event.data);
      if (target === debuggerModel.target())
        updateTitle();
    }

    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerPaused, updatePausedState);
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerResumed, updatePausedState);
    debuggerModel.target().runtimeModel.addEventListener(SDK.RuntimeModel.Events.ExecutionContextChanged, updateTitle);
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
    if (fromElement)
      fromElement.classList.remove('selected');
    if (toElement)
      toElement.classList.add('selected');
    if (to)
      UI.context.setFlavor(SDK.Target, to.target());
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  modelAdded(debuggerModel) {
    this._list.pushItem(debuggerModel);
    var currentTarget = UI.context.flavor(SDK.Target);
    if (currentTarget === debuggerModel.target())
      this._list.selectItem(debuggerModel);
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  modelRemoved(debuggerModel) {
    this._list.removeItem(debuggerModel);
  }

  /**
   * @param {!Common.Event} event
   */
  _targetFlavorChanged(event) {
    var target = /** @type {!SDK.Target} */ (event.data);
    var debuggerModel = target.model(SDK.DebuggerModel);
    if (debuggerModel)
      this._list.selectItem(debuggerModel);
  }
};

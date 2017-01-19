// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Sources.ThreadsSidebarPane = class extends UI.VBox {
  constructor() {
    super();

    /** @type {?Sources.UIList.Item} */
    this._selectedListItem = null;
    /** @type {!Map<!SDK.Target, !Sources.UIList.Item>} */
    this._targetToListItem = new Map();

    this.threadList = new Sources.UIList();
    this.threadList.show(this.element);

    this._availableNodeTargetsElement = this.element.createChild('div', 'hidden available-node-targets');

    SDK.targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this._onDebuggerStateChanged, this);
    SDK.targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed, this._onDebuggerStateChanged, this);
    SDK.targetManager.addModelListener(
        SDK.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextChanged, this._onExecutionContextChanged, this);
    UI.context.addFlavorChangeListener(SDK.Target, this._targetChanged, this);
    SDK.targetManager.addEventListener(SDK.TargetManager.Events.NameChanged, this._targetNameChanged, this);
    SDK.targetManager.addModelListener(
        SDK.SubTargetsManager, SDK.SubTargetsManager.Events.AvailableNodeTargetsChanged,
        this._availableNodeTargetsChanged, this);
    SDK.targetManager.observeTargets(this, SDK.Target.Capability.JS);
    this._availableNodeTargetsChanged();
  }

  /**
   * @return {boolean}
   */
  static shouldBeShown() {
    var minJSTargets = Runtime.queryParam('nodeFrontend') ? 1 : 2;
    if (SDK.targetManager.targets(SDK.Target.Capability.JS).length >= minJSTargets)
      return true;
    if (Sources.ThreadsSidebarPane.availableNodeTargetsCount())
      return true;
    return false;
  }

  /**
   * @return {number}
   */
  static availableNodeTargetsCount() {
    var count = 0;
    for (var target of SDK.targetManager.targets(SDK.Target.Capability.Target))
      count += SDK.SubTargetsManager.fromTarget(target).availableNodeTargetsCount();

    return count;
  }

  _availableNodeTargetsChanged() {
    var count = Sources.ThreadsSidebarPane.availableNodeTargetsCount();
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
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    var listItem = new Sources.UIList.Item('', '', false);
    listItem.element.addEventListener('click', this._onListItemClick.bind(this, listItem, target), false);
    this._targetToListItem.set(target, listItem);
    this.threadList.addItem(listItem);
    listItem.setTitle(this._titleForTarget(target));
    this._updateDebuggerState(target);

    var currentTarget = UI.context.flavor(SDK.Target);
    if (currentTarget === target)
      this._selectListItem(listItem);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    var item = this._targetToListItem.get(target);
    if (!item)
      return;
    this.threadList.removeItem(item);
    this._targetToListItem.delete(target);
  }

  /**
   * @param {!Common.Event} event
   */
  _targetNameChanged(event) {
    var target = /** @type {!SDK.Target} */ (event.data);
    var listItem = this._targetToListItem.get(target);
    if (listItem)
      listItem.setTitle(this._titleForTarget(target));
  }

  /**
   * @param {!Common.Event} event
   */
  _targetChanged(event) {
    var listItem = this._targetToListItem.get(/** @type {!SDK.Target} */ (event.data));
    if (listItem)
      this._selectListItem(listItem);
  }

  /**
   * @param {!SDK.Target} target
   * @return {string}
   */
  _titleForTarget(target) {
    var executionContext = target.runtimeModel.defaultExecutionContext();
    return executionContext && executionContext.label() ? executionContext.label() : target.name();
  }

  /**
   * @param {!Common.Event} event
   */
  _onDebuggerStateChanged(event) {
    var debuggerModel = /** @type {!SDK.DebuggerModel} */ (event.data);
    this._updateDebuggerState(debuggerModel.target());
  }

  /**
   * @param {!Common.Event} event
   */
  _onExecutionContextChanged(event) {
    var executionContext = /** @type {!SDK.ExecutionContext} */ (event.data);
    var target = executionContext.target();
    var listItem = this._targetToListItem.get(target);
    if (listItem)
      listItem.setTitle(this._titleForTarget(target));
  }

  /**
   * @param {!SDK.Target} target
   */
  _updateDebuggerState(target) {
    var listItem = this._targetToListItem.get(target);
    var debuggerModel = SDK.DebuggerModel.fromTarget(target);
    console.assert(debuggerModel);
    listItem.setSubtitle(Common.UIString(debuggerModel.isPaused() ? 'paused' : ''));
  }

  /**
   * @param {!Sources.UIList.Item} listItem
   */
  _selectListItem(listItem) {
    if (listItem === this._selectedListItem)
      return;

    if (this._selectedListItem)
      this._selectedListItem.setSelected(false);

    this._selectedListItem = listItem;
    listItem.setSelected(true);
  }

  /**
   * @param {!Sources.UIList.Item} listItem
   * @param {!SDK.Target} target
   */
  _onListItemClick(listItem, target) {
    UI.context.setFlavor(SDK.Target, target);
    listItem.element.scrollIntoViewIfNeeded();
  }
};

Sources.ThreadsSidebarPane._targetSymbol = Symbol('_targetSymbol');

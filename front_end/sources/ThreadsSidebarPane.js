// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {WebInspector.TargetManager.Observer}
 * @unrestricted
 */
WebInspector.ThreadsSidebarPane = class extends WebInspector.VBox {
  constructor() {
    super();

    /** @type {?WebInspector.UIList.Item} */
    this._selectedListItem = null;
    /** @type {!Map<!WebInspector.PendingTarget, !WebInspector.UIList.Item>} */
    this._pendingToListItem = new Map();
    /** @type {!Map<!WebInspector.Target, !WebInspector.PendingTarget>} */
    this._targetToPending = new Map();
    /** @type {?WebInspector.PendingTarget} */
    this._mainTargetPending = null;
    this.threadList = new WebInspector.UIList();
    this.threadList.show(this.element);
    WebInspector.targetManager.addModelListener(
        WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.DebuggerPaused, this._onDebuggerStateChanged,
        this);
    WebInspector.targetManager.addModelListener(
        WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.DebuggerResumed, this._onDebuggerStateChanged,
        this);
    WebInspector.targetManager.addModelListener(
        WebInspector.RuntimeModel, WebInspector.RuntimeModel.Events.ExecutionContextChanged,
        this._onExecutionContextChanged, this);
    WebInspector.context.addFlavorChangeListener(WebInspector.Target, this._targetChanged, this);
    WebInspector.targetManager.addEventListener(
        WebInspector.TargetManager.Events.NameChanged, this._targetNameChanged, this);
    WebInspector.targetManager.addModelListener(WebInspector.SubTargetsManager, WebInspector.SubTargetsManager.Events.PendingTargetAdded, this._addTargetItem, this);
    WebInspector.targetManager.addModelListener(WebInspector.SubTargetsManager, WebInspector.SubTargetsManager.Events.PendingTargetRemoved, this._pendingTargetRemoved, this);
    WebInspector.targetManager.addModelListener(WebInspector.SubTargetsManager, WebInspector.SubTargetsManager.Events.PendingTargetAttached, this._addTargetItem, this);
    WebInspector.targetManager.addModelListener(WebInspector.SubTargetsManager, WebInspector.SubTargetsManager.Events.PendingTargetDetached, this._targetDetached, this);
    WebInspector.targetManager.observeTargets(this);

    var pendingTargets = [];
    for (var target of WebInspector.targetManager.targets(WebInspector.Target.Capability.Target))
      pendingTargets = pendingTargets.concat(WebInspector.SubTargetsManager.fromTarget(target).pendingTargets());

    pendingTargets
        .sort(WebInspector.ThreadsSidebarPane._pendingTargetsComparator)
        .forEach(pendingTarget => this._addListItem(pendingTarget));
  }

  /**
   * @return {boolean}
   */
  static shouldBeShown() {
    if (WebInspector.targetManager.targets(WebInspector.Target.Capability.JS).length > 1)
      return true;
    for (var target of WebInspector.targetManager.targets(WebInspector.Target.Capability.Target)) {
      var pendingTargets = WebInspector.SubTargetsManager.fromTarget(target).pendingTargets();
      if (pendingTargets.some(pendingTarget => pendingTarget.canConnect()))
        return true;
    }
    return false;
  }

  /**
   * Sorts show tha connected targets appear first, followed by pending subtargets.
   *
   * @param {!WebInspector.PendingTarget} c1
   * @param {!WebInspector.PendingTarget} c2
   * @return {number}
   */
  static _pendingTargetsComparator(c1, c2)
  {
    var t1 = c1.target();
    var t2 = c2.target();
    var name1 = t1 ? t1.name() : c1.name();
    var name2 = t2 ? t2.name() : c2.name();
    if (!!t1 === !!t2) { // Either both are connected or disconnected
      return name1.toLowerCase().localeCompare(name2.toLowerCase());
    } else if (t1) {
      return -1;
    }
    return 1;
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _addTargetItem(event) {
    this._addListItem(/** @type {!WebInspector.PendingTarget} */ (event.data));
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _pendingTargetRemoved(event) {
    this._removeListItem(/** @type {!WebInspector.PendingTarget} */ (event.data));
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _targetDetached(event) {
    this._targetRemoved(/** @type {!WebInspector.PendingTarget} */ (event.data));
  }

  /**
   * @param {!WebInspector.PendingTarget} pendingTarget
   */
  _addListItem(pendingTarget) {
    var target = pendingTarget.target();
    if (!pendingTarget.canConnect() && !(target && target.hasJSCapability()))
      return;

    var listItem = this._pendingToListItem.get(pendingTarget);
    if (!listItem) {
      listItem = new WebInspector.UIList.Item('', '', false);
      listItem[WebInspector.ThreadsSidebarPane._pendingTargetSymbol] = pendingTarget;
      listItem[WebInspector.ThreadsSidebarPane._targetSymbol] = target;
      this._pendingToListItem.set(pendingTarget, listItem);
      this.threadList.addItem(listItem);
      listItem.element.addEventListener('click', this._onListItemClick.bind(this, listItem), false);
    }
    this._updateListItem(listItem, pendingTarget);
    this._updateDebuggerState(pendingTarget);
    var currentTarget = WebInspector.context.flavor(WebInspector.Target);
    if (currentTarget === target)
      this._selectListItem(listItem);
    if (target)
      this._targetToPending.set(target, pendingTarget);
  }

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetAdded(target) {
    if (target !== WebInspector.targetManager.mainTarget())
      return;
    console.assert(!this._mainTargetPending);
    this._mainTargetPending = new WebInspector.ThreadsSidebarPane.MainTargetConnection(target);
    this._addListItem(this._mainTargetPending);
  }

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetRemoved(target) {
    var subtargetManager = WebInspector.SubTargetsManager.fromTarget(target);
    var pendingTargets = subtargetManager ? subtargetManager.pendingTargets() : [];
    for (var pendingTarget of pendingTargets) {
      if (pendingTarget.target())
        this._targetRemoved(pendingTarget);
    }
    if (target === WebInspector.targetManager.mainTarget() && this._mainTargetPending) {
      this._targetRemoved(this._mainTargetPending);
      this._mainTargetPending = null;
    }
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _targetNameChanged(event) {
    var target = /** @type {!WebInspector.Target} */ (event.data);
    var listItem = this._listItemForTarget(target);
    if (listItem)
      listItem.setTitle(this._titleForPending(this._targetToPending.get(target)));
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _targetChanged(event) {
    var listItem = this._listItemForTarget(/** @type {!WebInspector.Target} */ (event.data));
    if (listItem)
      this._selectListItem(listItem);
  }

  /**
   * @param {!WebInspector.Target} target
   * @return {?WebInspector.UIList.Item}
   */
  _listItemForTarget(target) {
    var pendingTarget = this._targetToPending.get(target);
    return this._pendingToListItem.get(pendingTarget) || null;
  }

  /**
   * @param {!WebInspector.PendingTarget} pendingTarget
   * @return {string}
   */
  _titleForPending(pendingTarget) {
    var target = pendingTarget.target();
    if (!target)
      return pendingTarget.name();
    var executionContext = target.runtimeModel.defaultExecutionContext();
    return executionContext && executionContext.label() ? executionContext.label() : target.name();
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onDebuggerStateChanged(event) {
    var debuggerModel = /** @type {!WebInspector.DebuggerModel} */ (event.target);
    var pendingTarget = this._targetToPending.get(debuggerModel.target());
    this._updateDebuggerState(pendingTarget);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onExecutionContextChanged(event) {
    var executionContext = /** @type {!WebInspector.ExecutionContext} */ (event.data);
    if (!executionContext.isDefault)
      return;
    var pendingTarget = this._targetToPending.get(executionContext.target());
    var listItem = this._pendingToListItem.get(pendingTarget);
    if (listItem && executionContext.label())
      listItem.setTitle(executionContext.label());
  }

  /**
   * @param {!WebInspector.PendingTarget} pendingTarget
   */
  _updateDebuggerState(pendingTarget) {
    var listItem = this._pendingToListItem.get(pendingTarget);
    var target = pendingTarget.target();
    var debuggerModel = target && WebInspector.DebuggerModel.fromTarget(target);
    var isPaused = !!debuggerModel && debuggerModel.isPaused();
    listItem.setSubtitle(WebInspector.UIString(isPaused ? 'paused' : ''));
  }

  /**
   * @param {!WebInspector.UIList.Item} listItem
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
   * @param {!WebInspector.UIList.Item} listItem
   */
  _onListItemClick(listItem) {
    var pendingTarget = listItem[WebInspector.ThreadsSidebarPane._pendingTargetSymbol];
    var target = pendingTarget.target();
    if (!target)
      return;
    WebInspector.context.setFlavor(WebInspector.Target, target);
    listItem.element.scrollIntoViewIfNeeded();
  }

  /**
   * @param {!WebInspector.UIList.Item} item
   * @param {!WebInspector.PendingTarget} pendingTarget
   */
  _updateListItem(item, pendingTarget) {
    item.setTitle(this._titleForPending(pendingTarget));
    item.setSubtitle('');
    var target = pendingTarget.target();
    var action = null;
    var actionLabel = null;
    if (pendingTarget.canConnect()) {
      actionLabel = target ? 'Disconnect' : 'Connect';
      action = this._toggleConnection.bind(this, pendingTarget);
    }
    item.setAction(actionLabel, action);
    item.setDimmed(!target);
  }

  /**
   * @param {!WebInspector.Target} target
   */
  _selectNewlyAddedTarget(target) {
    setTimeout(() => WebInspector.context.setFlavor(WebInspector.Target, target));
  }

  /**
   * @param {!WebInspector.PendingTarget} pendingTarget
   * @return {!Promise}
   */
  _toggleConnection(pendingTarget) {
    var target = pendingTarget.target();
    if (target)
      return pendingTarget.detach();
    else
      return pendingTarget.attach().then(target => this._selectNewlyAddedTarget(target));
  }

  /**
   * @param {!WebInspector.PendingTarget} pendingTarget
   */
  _targetRemoved(pendingTarget) {
    var item = this._pendingToListItem.get(pendingTarget);
    if (!item) // Not all targets are represented in the UI.
      return;
    var target = item[WebInspector.ThreadsSidebarPane._targetSymbol];
    item[WebInspector.ThreadsSidebarPane._targetSymbol] = null;
    this._targetToPending.remove(target);
    if (pendingTarget.canConnect())
      this._updateListItem(item, pendingTarget);
    else
      this._removeListItem(pendingTarget);
  }

  /**
   * @param {!WebInspector.PendingTarget} pendingTarget
   */
  _removeListItem(pendingTarget) {
    var item = this._pendingToListItem.get(pendingTarget);
    if (!item)
      return;
    this.threadList.removeItem(item);
    this._pendingToListItem.delete(pendingTarget);
  }
};

WebInspector.ThreadsSidebarPane._pendingTargetSymbol = Symbol('_subtargetSymbol');
WebInspector.ThreadsSidebarPane._targetSymbol = Symbol('_targetSymbol');

/**
 * @unrestricted
 */
WebInspector.ThreadsSidebarPane.MainTargetConnection = class extends WebInspector.PendingTarget {
  /**
   * @param {!WebInspector.Target} target
   */
  constructor(target) {
    super('main-target-list-node-' + target.id(), target.title, false, null);
    this._target = target;
  }

  /**
   * @override
   * @return {!WebInspector.Target}
   */
  target() {
    return this._target;
  }

  /**
   * @override
   * @return {string}
   */
  name() {
    return this._target.name();
  }
};

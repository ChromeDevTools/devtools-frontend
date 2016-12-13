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
    /** @type {!Map<!SDK.PendingTarget, !Sources.UIList.Item>} */
    this._pendingToListItem = new Map();
    /** @type {!Map<!SDK.Target, !SDK.PendingTarget>} */
    this._targetToPending = new Map();
    /** @type {?SDK.PendingTarget} */
    this._mainTargetPending = null;
    this.threadList = new Sources.UIList();
    this.threadList.show(this.element);
    SDK.targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this._onDebuggerStateChanged, this);
    SDK.targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed, this._onDebuggerStateChanged, this);
    SDK.targetManager.addModelListener(
        SDK.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextChanged, this._onExecutionContextChanged, this);
    UI.context.addFlavorChangeListener(SDK.Target, this._targetChanged, this);
    SDK.targetManager.addEventListener(SDK.TargetManager.Events.NameChanged, this._targetNameChanged, this);
    SDK.targetManager.addModelListener(
        SDK.SubTargetsManager, SDK.SubTargetsManager.Events.PendingTargetAdded, this._addTargetItem, this);
    SDK.targetManager.addModelListener(
        SDK.SubTargetsManager, SDK.SubTargetsManager.Events.PendingTargetRemoved, this._pendingTargetRemoved, this);
    SDK.targetManager.addModelListener(
        SDK.SubTargetsManager, SDK.SubTargetsManager.Events.PendingTargetAttached, this._addTargetItem, this);
    SDK.targetManager.addModelListener(
        SDK.SubTargetsManager, SDK.SubTargetsManager.Events.PendingTargetDetached, this._targetDetached, this);
    SDK.targetManager.observeTargets(this);

    var pendingTargets = [];
    for (var target of SDK.targetManager.targets(SDK.Target.Capability.Target))
      pendingTargets = pendingTargets.concat(SDK.SubTargetsManager.fromTarget(target).pendingTargets());

    pendingTargets.sort(Sources.ThreadsSidebarPane._pendingTargetsComparator)
        .forEach(pendingTarget => this._addListItem(pendingTarget));
  }

  /**
   * @return {boolean}
   */
  static shouldBeShown() {
    if (SDK.targetManager.targets(SDK.Target.Capability.JS).length > 1)
      return true;
    for (var target of SDK.targetManager.targets(SDK.Target.Capability.Target)) {
      var pendingTargets = SDK.SubTargetsManager.fromTarget(target).pendingTargets();
      if (pendingTargets.some(pendingTarget => pendingTarget.canConnect()))
        return true;
    }
    return false;
  }

  /**
   * Sorts show tha connected targets appear first, followed by pending subtargets.
   *
   * @param {!SDK.PendingTarget} c1
   * @param {!SDK.PendingTarget} c2
   * @return {number}
   */
  static _pendingTargetsComparator(c1, c2) {
    var t1 = c1.target();
    var t2 = c2.target();
    var name1 = t1 ? t1.name() : c1.name();
    var name2 = t2 ? t2.name() : c2.name();
    if (!!t1 === !!t2) {  // Either both are connected or disconnected
      return name1.toLowerCase().localeCompare(name2.toLowerCase());
    } else if (t1) {
      return -1;
    }
    return 1;
  }

  /**
   * @param {!Common.Event} event
   */
  _addTargetItem(event) {
    this._addListItem(/** @type {!SDK.PendingTarget} */ (event.data));
  }

  /**
   * @param {!Common.Event} event
   */
  _pendingTargetRemoved(event) {
    this._removeListItem(/** @type {!SDK.PendingTarget} */ (event.data));
  }

  /**
   * @param {!Common.Event} event
   */
  _targetDetached(event) {
    this._targetRemoved(/** @type {!SDK.PendingTarget} */ (event.data));
  }

  /**
   * @param {!SDK.PendingTarget} pendingTarget
   */
  _addListItem(pendingTarget) {
    var target = pendingTarget.target();
    if (!pendingTarget.canConnect() && !(target && target.hasJSCapability()))
      return;

    var listItem = this._pendingToListItem.get(pendingTarget);
    if (!listItem) {
      listItem = new Sources.UIList.Item('', '', false);
      listItem[Sources.ThreadsSidebarPane._pendingTargetSymbol] = pendingTarget;
      listItem[Sources.ThreadsSidebarPane._targetSymbol] = target;
      this._pendingToListItem.set(pendingTarget, listItem);
      this.threadList.addItem(listItem);
      listItem.element.addEventListener('click', this._onListItemClick.bind(this, listItem), false);
    }
    this._updateListItem(listItem, pendingTarget);
    this._updateDebuggerState(pendingTarget);
    var currentTarget = UI.context.flavor(SDK.Target);
    if (currentTarget === target)
      this._selectListItem(listItem);
    if (target)
      this._targetToPending.set(target, pendingTarget);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    if (target !== SDK.targetManager.mainTarget())
      return;
    console.assert(!this._mainTargetPending);
    this._mainTargetPending = new Sources.ThreadsSidebarPane.MainTargetConnection(target);
    this._addListItem(this._mainTargetPending);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    var subtargetManager = SDK.SubTargetsManager.fromTarget(target);
    var pendingTargets = subtargetManager ? subtargetManager.pendingTargets() : [];
    for (var pendingTarget of pendingTargets) {
      if (pendingTarget.target())
        this._targetRemoved(pendingTarget);
    }
    if (target === SDK.targetManager.mainTarget() && this._mainTargetPending) {
      this._targetRemoved(this._mainTargetPending);
      this._mainTargetPending = null;
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _targetNameChanged(event) {
    var target = /** @type {!SDK.Target} */ (event.data);
    var listItem = this._listItemForTarget(target);
    if (listItem)
      listItem.setTitle(this._titleForPending(this._targetToPending.get(target)));
  }

  /**
   * @param {!Common.Event} event
   */
  _targetChanged(event) {
    var listItem = this._listItemForTarget(/** @type {!SDK.Target} */ (event.data));
    if (listItem)
      this._selectListItem(listItem);
  }

  /**
   * @param {!SDK.Target} target
   * @return {?Sources.UIList.Item}
   */
  _listItemForTarget(target) {
    var pendingTarget = this._targetToPending.get(target);
    return this._pendingToListItem.get(pendingTarget) || null;
  }

  /**
   * @param {!SDK.PendingTarget} pendingTarget
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
   * @param {!Common.Event} event
   */
  _onDebuggerStateChanged(event) {
    var debuggerModel = /** @type {!SDK.DebuggerModel} */ (event.data);
    var pendingTarget = this._targetToPending.get(debuggerModel.target());
    this._updateDebuggerState(pendingTarget);
  }

  /**
   * @param {!Common.Event} event
   */
  _onExecutionContextChanged(event) {
    var executionContext = /** @type {!SDK.ExecutionContext} */ (event.data);
    if (!executionContext.isDefault)
      return;
    var pendingTarget = this._targetToPending.get(executionContext.target());
    var listItem = this._pendingToListItem.get(pendingTarget);
    if (listItem && executionContext.label())
      listItem.setTitle(executionContext.label());
  }

  /**
   * @param {!SDK.PendingTarget} pendingTarget
   */
  _updateDebuggerState(pendingTarget) {
    var listItem = this._pendingToListItem.get(pendingTarget);
    var target = pendingTarget.target();
    var debuggerModel = target && SDK.DebuggerModel.fromTarget(target);
    var isPaused = !!debuggerModel && debuggerModel.isPaused();
    listItem.setSubtitle(Common.UIString(isPaused ? 'paused' : ''));
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
   */
  _onListItemClick(listItem) {
    var pendingTarget = listItem[Sources.ThreadsSidebarPane._pendingTargetSymbol];
    var target = pendingTarget.target();
    if (!target)
      return;
    UI.context.setFlavor(SDK.Target, target);
    listItem.element.scrollIntoViewIfNeeded();
  }

  /**
   * @param {!Sources.UIList.Item} item
   * @param {!SDK.PendingTarget} pendingTarget
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
   * @param {!SDK.Target} target
   */
  _selectNewlyAddedTarget(target) {
    setTimeout(() => UI.context.setFlavor(SDK.Target, target));
  }

  /**
   * @param {!SDK.PendingTarget} pendingTarget
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
   * @param {!SDK.PendingTarget} pendingTarget
   */
  _targetRemoved(pendingTarget) {
    var item = this._pendingToListItem.get(pendingTarget);
    if (!item)  // Not all targets are represented in the UI.
      return;
    var target = item[Sources.ThreadsSidebarPane._targetSymbol];
    item[Sources.ThreadsSidebarPane._targetSymbol] = null;
    this._targetToPending.remove(target);
    if (pendingTarget.canConnect())
      this._updateListItem(item, pendingTarget);
    else
      this._removeListItem(pendingTarget);
  }

  /**
   * @param {!SDK.PendingTarget} pendingTarget
   */
  _removeListItem(pendingTarget) {
    var item = this._pendingToListItem.get(pendingTarget);
    if (!item)
      return;
    this.threadList.removeItem(item);
    this._pendingToListItem.delete(pendingTarget);
  }
};

Sources.ThreadsSidebarPane._pendingTargetSymbol = Symbol('_subtargetSymbol');
Sources.ThreadsSidebarPane._targetSymbol = Symbol('_targetSymbol');

/**
 * @unrestricted
 */
Sources.ThreadsSidebarPane.MainTargetConnection = class extends SDK.PendingTarget {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super('main-target-list-node-' + target.id(), target.title, false, null);
    this._target = target;
  }

  /**
   * @override
   * @return {!SDK.Target}
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

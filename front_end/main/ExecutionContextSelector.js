// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Main.ExecutionContextSelector = class {
  /**
   * @param {!SDK.TargetManager} targetManager
   * @param {!UI.Context} context
   */
  constructor(targetManager, context) {
    targetManager.observeTargets(this, SDK.Target.Capability.JS);
    context.addFlavorChangeListener(SDK.ExecutionContext, this._executionContextChanged, this);
    context.addFlavorChangeListener(SDK.Target, this._targetChanged, this);

    targetManager.addModelListener(
        SDK.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextCreated, this._onExecutionContextCreated, this);
    targetManager.addModelListener(
        SDK.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextDestroyed, this._onExecutionContextDestroyed, this);
    targetManager.addModelListener(
        SDK.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextOrderChanged, this._onExecutionContextOrderChanged,
        this);
    this._targetManager = targetManager;
    this._context = context;
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    // Defer selecting default target since we need all clients to get their
    // targetAdded notifications first.
    setImmediate(deferred.bind(this));

    /**
     * @this {Main.ExecutionContextSelector}
     */
    function deferred() {
      // We always want the second context for the service worker targets.
      if (!this._context.flavor(SDK.Target))
        this._context.setFlavor(SDK.Target, target);
    }
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    var currentExecutionContext = this._context.flavor(SDK.ExecutionContext);
    if (currentExecutionContext && currentExecutionContext.target() === target)
      this._currentExecutionContextGone();

    var targets = this._targetManager.targets(SDK.Target.Capability.JS);
    if (this._context.flavor(SDK.Target) === target && targets.length)
      this._context.setFlavor(SDK.Target, targets[0]);
  }

  /**
   * @param {!Common.Event} event
   */
  _executionContextChanged(event) {
    var newContext = /** @type {?SDK.ExecutionContext} */ (event.data);
    if (newContext) {
      this._context.setFlavor(SDK.Target, newContext.target());
      if (!this._ignoreContextChanged)
        this._lastSelectedContextId = this._contextPersistentId(newContext);
    }
  }

  /**
   * @param {!SDK.ExecutionContext} executionContext
   * @return {string}
   */
  _contextPersistentId(executionContext) {
    return executionContext.isDefault ? executionContext.target().name() + ':' + executionContext.frameId : '';
  }

  /**
   * @param {!Common.Event} event
   */
  _targetChanged(event) {
    var newTarget = /** @type {?SDK.Target} */ (event.data);
    var currentContext = this._context.flavor(SDK.ExecutionContext);

    if (!newTarget || (currentContext && currentContext.target() === newTarget))
      return;

    var executionContexts = newTarget.runtimeModel.executionContexts();
    if (!executionContexts.length)
      return;

    var newContext = null;
    for (var i = 0; i < executionContexts.length && !newContext; ++i) {
      if (this._shouldSwitchToContext(executionContexts[i]))
        newContext = executionContexts[i];
    }
    for (var i = 0; i < executionContexts.length && !newContext; ++i) {
      if (this._isDefaultContext(executionContexts[i]))
        newContext = executionContexts[i];
    }
    this._ignoreContextChanged = true;
    this._context.setFlavor(SDK.ExecutionContext, newContext || executionContexts[0]);
    this._ignoreContextChanged = false;
  }

  /**
   * @param {!SDK.ExecutionContext} executionContext
   * @return {boolean}
   */
  _shouldSwitchToContext(executionContext) {
    if (this._lastSelectedContextId && this._lastSelectedContextId === this._contextPersistentId(executionContext))
      return true;
    if (!this._lastSelectedContextId && this._isDefaultContext(executionContext))
      return true;
    return false;
  }

  /**
   * @param {!SDK.ExecutionContext} executionContext
   * @return {boolean}
   */
  _isDefaultContext(executionContext) {
    if (!executionContext.isDefault || !executionContext.frameId)
      return false;
    if (executionContext.target().parentTarget())
      return false;
    var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(executionContext.target());
    var frame = resourceTreeModel && resourceTreeModel.frameForId(executionContext.frameId);
    if (frame && frame.isMainFrame())
      return true;
    return false;
  }

  /**
   * @param {!Common.Event} event
   */
  _onExecutionContextCreated(event) {
    this._switchContextIfNecessary(/** @type {!SDK.ExecutionContext} */ (event.data));
  }

  /**
   * @param {!Common.Event} event
   */
  _onExecutionContextDestroyed(event) {
    var executionContext = /** @type {!SDK.ExecutionContext}*/ (event.data);
    if (this._context.flavor(SDK.ExecutionContext) === executionContext)
      this._currentExecutionContextGone();
  }

  /**
   * @param {!Common.Event} event
   */
  _onExecutionContextOrderChanged(event) {
    var runtimeModel = /** @type {!SDK.RuntimeModel} */ (event.data);
    var executionContexts = runtimeModel.executionContexts();
    for (var i = 0; i < executionContexts.length; i++) {
      if (this._switchContextIfNecessary(executionContexts[i]))
        break;
    }
  }

  /**
   * @param {!SDK.ExecutionContext} executionContext
   * @return {boolean}
   */
  _switchContextIfNecessary(executionContext) {
    if (!this._context.flavor(SDK.ExecutionContext) || this._shouldSwitchToContext(executionContext)) {
      this._ignoreContextChanged = true;
      this._context.setFlavor(SDK.ExecutionContext, executionContext);
      this._ignoreContextChanged = false;
      return true;
    }
    return false;
  }

  _currentExecutionContextGone() {
    var targets = this._targetManager.targets(SDK.Target.Capability.JS);
    var newContext = null;
    for (var i = 0; i < targets.length && !newContext; ++i) {
      var executionContexts = targets[i].runtimeModel.executionContexts();
      for (var executionContext of executionContexts) {
        if (this._isDefaultContext(executionContext)) {
          newContext = executionContext;
          break;
        }
      }
    }
    if (!newContext) {
      for (var i = 0; i < targets.length && !newContext; ++i) {
        var executionContexts = targets[i].runtimeModel.executionContexts();
        if (executionContexts.length) {
          newContext = executionContexts[0];
          break;
        }
      }
    }
    this._ignoreContextChanged = true;
    this._context.setFlavor(SDK.ExecutionContext, newContext);
    this._ignoreContextChanged = false;
  }
};

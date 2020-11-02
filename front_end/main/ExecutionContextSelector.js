// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.RuntimeModel.RuntimeModel>}
 * @unrestricted
 */
export class ExecutionContextSelector {
  /**
   * @param {!SDK.SDKModel.TargetManager} targetManager
   * @param {!UI.Context.Context} context
   */
  constructor(targetManager, context) {
    context.addFlavorChangeListener(SDK.RuntimeModel.ExecutionContext, this._executionContextChanged, this);
    context.addFlavorChangeListener(SDK.SDKModel.Target, this._targetChanged, this);

    targetManager.addModelListener(
        SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextCreated, this._onExecutionContextCreated,
        this);
    targetManager.addModelListener(
        SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextDestroyed,
        this._onExecutionContextDestroyed, this);
    targetManager.addModelListener(
        SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextOrderChanged,
        this._onExecutionContextOrderChanged, this);
    this._targetManager = targetManager;
    this._context = context;
    targetManager.observeModels(SDK.RuntimeModel.RuntimeModel, this);
  }

  /**
   * @override
   * @param {!SDK.RuntimeModel.RuntimeModel} runtimeModel
   */
  modelAdded(runtimeModel) {
    // Defer selecting default target since we need all clients to get their
    // targetAdded notifications first.
    setImmediate(deferred.bind(this));

    /**
     * @this {ExecutionContextSelector}
     */
    function deferred() {
      // We always want the second context for the service worker targets.
      if (!this._context.flavor(SDK.SDKModel.Target)) {
        this._context.setFlavor(SDK.SDKModel.Target, runtimeModel.target());
      }
    }
  }

  /**
   * @override
   * @param {!SDK.RuntimeModel.RuntimeModel} runtimeModel
   */
  modelRemoved(runtimeModel) {
    const currentExecutionContext = this._context.flavor(SDK.RuntimeModel.ExecutionContext);
    if (currentExecutionContext && currentExecutionContext.runtimeModel === runtimeModel) {
      this._currentExecutionContextGone();
    }

    const models = this._targetManager.models(SDK.RuntimeModel.RuntimeModel);
    if (this._context.flavor(SDK.SDKModel.Target) === runtimeModel.target() && models.length) {
      this._context.setFlavor(SDK.SDKModel.Target, models[0].target());
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _executionContextChanged(event) {
    const newContext = /** @type {?SDK.RuntimeModel.ExecutionContext} */ (event.data);
    if (newContext) {
      this._context.setFlavor(SDK.SDKModel.Target, newContext.target());
      if (!this._ignoreContextChanged) {
        this._lastSelectedContextId = this._contextPersistentId(newContext);
      }
    }
  }

  /**
   * @param {!SDK.RuntimeModel.ExecutionContext} executionContext
   * @return {string}
   */
  _contextPersistentId(executionContext) {
    return executionContext.isDefault ? executionContext.target().name() + ':' + executionContext.frameId : '';
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _targetChanged(event) {
    const newTarget = /** @type {?SDK.SDKModel.Target} */ (event.data);
    const currentContext = this._context.flavor(SDK.RuntimeModel.ExecutionContext);

    if (!newTarget || (currentContext && currentContext.target() === newTarget)) {
      return;
    }

    const runtimeModel = newTarget.model(SDK.RuntimeModel.RuntimeModel);
    const executionContexts = runtimeModel ? runtimeModel.executionContexts() : [];
    if (!executionContexts.length) {
      return;
    }

    let newContext = null;
    for (let i = 0; i < executionContexts.length && !newContext; ++i) {
      if (this._shouldSwitchToContext(executionContexts[i])) {
        newContext = executionContexts[i];
      }
    }
    for (let i = 0; i < executionContexts.length && !newContext; ++i) {
      if (this._isDefaultContext(executionContexts[i])) {
        newContext = executionContexts[i];
      }
    }
    this._ignoreContextChanged = true;
    this._context.setFlavor(SDK.RuntimeModel.ExecutionContext, newContext || executionContexts[0]);
    this._ignoreContextChanged = false;
  }

  /**
   * @param {!SDK.RuntimeModel.ExecutionContext} executionContext
   * @return {boolean}
   */
  _shouldSwitchToContext(executionContext) {
    if (this._lastSelectedContextId && this._lastSelectedContextId === this._contextPersistentId(executionContext)) {
      return true;
    }
    if (!this._lastSelectedContextId && this._isDefaultContext(executionContext)) {
      return true;
    }
    return false;
  }

  /**
   * @param {!SDK.RuntimeModel.ExecutionContext} executionContext
   * @return {boolean}
   */
  _isDefaultContext(executionContext) {
    if (!executionContext.isDefault || !executionContext.frameId) {
      return false;
    }
    if (executionContext.target().parentTarget()) {
      return false;
    }
    const resourceTreeModel = executionContext.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
    const frame = resourceTreeModel && resourceTreeModel.frameForId(executionContext.frameId);
    if (frame && frame.isTopFrame()) {
      return true;
    }
    return false;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onExecutionContextCreated(event) {
    this._switchContextIfNecessary(/** @type {!SDK.RuntimeModel.ExecutionContext} */ (event.data));
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onExecutionContextDestroyed(event) {
    const executionContext = /** @type {!SDK.RuntimeModel.ExecutionContext}*/ (event.data);
    if (this._context.flavor(SDK.RuntimeModel.ExecutionContext) === executionContext) {
      this._currentExecutionContextGone();
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onExecutionContextOrderChanged(event) {
    const runtimeModel = /** @type {!SDK.RuntimeModel.RuntimeModel} */ (event.data);
    const executionContexts = runtimeModel.executionContexts();
    for (let i = 0; i < executionContexts.length; i++) {
      if (this._switchContextIfNecessary(executionContexts[i])) {
        break;
      }
    }
  }

  /**
   * @param {!SDK.RuntimeModel.ExecutionContext} executionContext
   * @return {boolean}
   */
  _switchContextIfNecessary(executionContext) {
    if (!this._context.flavor(SDK.RuntimeModel.ExecutionContext) || this._shouldSwitchToContext(executionContext)) {
      this._ignoreContextChanged = true;
      this._context.setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);
      this._ignoreContextChanged = false;
      return true;
    }
    return false;
  }

  _currentExecutionContextGone() {
    const runtimeModels = this._targetManager.models(SDK.RuntimeModel.RuntimeModel);
    let newContext = null;
    for (let i = 0; i < runtimeModels.length && !newContext; ++i) {
      const executionContexts = runtimeModels[i].executionContexts();
      for (const executionContext of executionContexts) {
        if (this._isDefaultContext(executionContext)) {
          newContext = executionContext;
          break;
        }
      }
    }
    if (!newContext) {
      for (let i = 0; i < runtimeModels.length && !newContext; ++i) {
        const executionContexts = runtimeModels[i].executionContexts();
        if (executionContexts.length) {
          newContext = executionContexts[0];
          break;
        }
      }
    }
    this._ignoreContextChanged = true;
    this._context.setFlavor(SDK.RuntimeModel.ExecutionContext, newContext);
    this._ignoreContextChanged = false;
  }
}

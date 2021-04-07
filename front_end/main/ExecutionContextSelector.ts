// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../core/common/common.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../core/sdk/sdk.js';
import * as UI from '../ui/legacy/legacy.js';  // eslint-disable-line no-unused-vars

export class ExecutionContextSelector implements SDK.SDKModel.SDKModelObserver<SDK.RuntimeModel.RuntimeModel> {
  _targetManager: SDK.SDKModel.TargetManager;
  _context: UI.Context.Context;
  _lastSelectedContextId?: string;
  _ignoreContextChanged?: boolean;

  constructor(targetManager: SDK.SDKModel.TargetManager, context: UI.Context.Context) {
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

  modelAdded(runtimeModel: SDK.RuntimeModel.RuntimeModel): void {
    // Defer selecting default target since we need all clients to get their
    // targetAdded notifications first.
    queueMicrotask(deferred.bind(this));

    function deferred(this: ExecutionContextSelector): void {
      // We always want the second context for the service worker targets.
      if (!this._context.flavor(SDK.SDKModel.Target)) {
        this._context.setFlavor(SDK.SDKModel.Target, runtimeModel.target());
      }
    }
  }

  modelRemoved(runtimeModel: SDK.RuntimeModel.RuntimeModel): void {
    const currentExecutionContext = this._context.flavor(SDK.RuntimeModel.ExecutionContext);
    if (currentExecutionContext && currentExecutionContext.runtimeModel === runtimeModel) {
      this._currentExecutionContextGone();
    }

    const models = this._targetManager.models(SDK.RuntimeModel.RuntimeModel);
    if (this._context.flavor(SDK.SDKModel.Target) === runtimeModel.target() && models.length) {
      this._context.setFlavor(SDK.SDKModel.Target, models[0].target());
    }
  }

  _executionContextChanged(event: Common.EventTarget.EventTargetEvent): void {
    const newContext = (event.data as SDK.RuntimeModel.ExecutionContext | null);
    if (newContext) {
      this._context.setFlavor(SDK.SDKModel.Target, newContext.target());
      if (!this._ignoreContextChanged) {
        this._lastSelectedContextId = this._contextPersistentId(newContext);
      }
    }
  }

  _contextPersistentId(executionContext: SDK.RuntimeModel.ExecutionContext): string {
    return executionContext.isDefault ? executionContext.target().name() + ':' + executionContext.frameId : '';
  }

  _targetChanged(event: Common.EventTarget.EventTargetEvent): void {
    const newTarget = (event.data as SDK.SDKModel.Target | null);
    const currentContext = this._context.flavor(SDK.RuntimeModel.ExecutionContext);

    if (!newTarget || (currentContext && currentContext.target() === newTarget)) {
      return;
    }

    const runtimeModel = newTarget.model(SDK.RuntimeModel.RuntimeModel);
    const executionContexts = runtimeModel ? runtimeModel.executionContexts() : [];
    if (!executionContexts.length) {
      return;
    }

    let newContext: SDK.RuntimeModel.ExecutionContext|null = null;
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

  _shouldSwitchToContext(executionContext: SDK.RuntimeModel.ExecutionContext): boolean {
    if (this._lastSelectedContextId && this._lastSelectedContextId === this._contextPersistentId(executionContext)) {
      return true;
    }
    if (!this._lastSelectedContextId && this._isDefaultContext(executionContext)) {
      return true;
    }
    return false;
  }

  _isDefaultContext(executionContext: SDK.RuntimeModel.ExecutionContext): boolean {
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

  _onExecutionContextCreated(event: Common.EventTarget.EventTargetEvent): void {
    this._switchContextIfNecessary((event.data as SDK.RuntimeModel.ExecutionContext));
  }

  _onExecutionContextDestroyed(event: Common.EventTarget.EventTargetEvent): void {
    const executionContext = (event.data as SDK.RuntimeModel.ExecutionContext);
    if (this._context.flavor(SDK.RuntimeModel.ExecutionContext) === executionContext) {
      this._currentExecutionContextGone();
    }
  }

  _onExecutionContextOrderChanged(event: Common.EventTarget.EventTargetEvent): void {
    const runtimeModel = (event.data as SDK.RuntimeModel.RuntimeModel);
    const executionContexts = runtimeModel.executionContexts();
    for (let i = 0; i < executionContexts.length; i++) {
      if (this._switchContextIfNecessary(executionContexts[i])) {
        break;
      }
    }
  }

  _switchContextIfNecessary(executionContext: SDK.RuntimeModel.ExecutionContext): boolean {
    if (!this._context.flavor(SDK.RuntimeModel.ExecutionContext) || this._shouldSwitchToContext(executionContext)) {
      this._ignoreContextChanged = true;
      this._context.setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);
      this._ignoreContextChanged = false;
      return true;
    }
    return false;
  }

  _currentExecutionContextGone(): void {
    const runtimeModels = this._targetManager.models(SDK.RuntimeModel.RuntimeModel);
    let newContext: SDK.RuntimeModel.ExecutionContext|null = null;
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

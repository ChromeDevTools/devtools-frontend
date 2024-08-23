// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Common from '../../core/common/common.js';
import type * as UI from '../../ui/legacy/legacy.js';

export class ExecutionContextSelector implements SDK.TargetManager.SDKModelObserver<SDK.RuntimeModel.RuntimeModel> {
  #targetManager: SDK.TargetManager.TargetManager;
  #context: UI.Context.Context;
  #lastSelectedContextId?: string;
  #ignoreContextChanged?: boolean;

  constructor(targetManager: SDK.TargetManager.TargetManager, context: UI.Context.Context) {
    context.addFlavorChangeListener(SDK.RuntimeModel.ExecutionContext, this.#executionContextChanged, this);
    context.addFlavorChangeListener(SDK.Target.Target, this.#targetChanged, this);

    targetManager.addModelListener(
        SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextCreated, this.#onExecutionContextCreated,
        this);
    targetManager.addModelListener(
        SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextDestroyed,
        this.#onExecutionContextDestroyed, this);
    targetManager.addModelListener(
        SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextOrderChanged,
        this.#onExecutionContextOrderChanged, this);
    this.#targetManager = targetManager;
    this.#context = context;
    targetManager.observeModels(SDK.RuntimeModel.RuntimeModel, this);
  }

  modelAdded(runtimeModel: SDK.RuntimeModel.RuntimeModel): void {
    // Defer selecting default target since we need all clients to get their
    // targetAdded notifications first.
    queueMicrotask(deferred.bind(this));

    function deferred(this: ExecutionContextSelector): void {
      // We always want the second context for the service worker targets.
      if (!this.#context.flavor(SDK.Target.Target)) {
        this.#context.setFlavor(SDK.Target.Target, runtimeModel.target());
      }
    }
  }

  modelRemoved(runtimeModel: SDK.RuntimeModel.RuntimeModel): void {
    const currentExecutionContext = this.#context.flavor(SDK.RuntimeModel.ExecutionContext);
    if (currentExecutionContext && currentExecutionContext.runtimeModel === runtimeModel) {
      this.#currentExecutionContextGone();
    }

    const models = this.#targetManager.models(SDK.RuntimeModel.RuntimeModel);
    if (this.#context.flavor(SDK.Target.Target) === runtimeModel.target() && models.length) {
      this.#context.setFlavor(SDK.Target.Target, models[0].target());
    }
  }

  #executionContextChanged({
    data: newContext,
  }: Common.EventTarget.EventTargetEvent<SDK.RuntimeModel.ExecutionContext|null>): void {
    if (newContext) {
      this.#context.setFlavor(SDK.Target.Target, newContext.target());
      if (!this.#ignoreContextChanged) {
        this.#lastSelectedContextId = this.#contextPersistentId(newContext);
      }
    }
  }

  #contextPersistentId(executionContext: SDK.RuntimeModel.ExecutionContext): string {
    return executionContext.isDefault ? executionContext.target().name() + ':' + executionContext.frameId : '';
  }

  #targetChanged({data: newTarget}: Common.EventTarget.EventTargetEvent<SDK.Target.Target|null>): void {
    const currentContext = this.#context.flavor(SDK.RuntimeModel.ExecutionContext);

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
      if (this.#shouldSwitchToContext(executionContexts[i])) {
        newContext = executionContexts[i];
      }
    }
    for (let i = 0; i < executionContexts.length && !newContext; ++i) {
      if (this.#isDefaultContext(executionContexts[i])) {
        newContext = executionContexts[i];
      }
    }
    this.#ignoreContextChanged = true;
    this.#context.setFlavor(SDK.RuntimeModel.ExecutionContext, newContext || executionContexts[0]);
    this.#ignoreContextChanged = false;
  }

  #shouldSwitchToContext(executionContext: SDK.RuntimeModel.ExecutionContext): boolean {
    if (executionContext.target().targetInfo()?.subtype) {
      return false;
    }
    if (this.#lastSelectedContextId && this.#lastSelectedContextId === this.#contextPersistentId(executionContext)) {
      return true;
    }
    return !this.#lastSelectedContextId && this.#isDefaultContext(executionContext);
  }

  #isDefaultContext(executionContext: SDK.RuntimeModel.ExecutionContext): boolean {
    if (!executionContext.isDefault || !executionContext.frameId) {
      return false;
    }
    if (executionContext.target().parentTarget()?.type() === SDK.Target.Type.FRAME) {
      return false;
    }
    const resourceTreeModel = executionContext.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
    const frame = resourceTreeModel && resourceTreeModel.frameForId(executionContext.frameId);
    return Boolean(frame?.isOutermostFrame());
  }

  #onExecutionContextCreated(event: Common.EventTarget.EventTargetEvent<SDK.RuntimeModel.ExecutionContext>): void {
    this.#switchContextIfNecessary(event.data);
  }

  #onExecutionContextDestroyed(event: Common.EventTarget.EventTargetEvent<SDK.RuntimeModel.ExecutionContext>): void {
    const executionContext = event.data;
    if (this.#context.flavor(SDK.RuntimeModel.ExecutionContext) === executionContext) {
      this.#currentExecutionContextGone();
    }
  }

  #onExecutionContextOrderChanged(event: Common.EventTarget.EventTargetEvent<SDK.RuntimeModel.RuntimeModel>): void {
    const runtimeModel = event.data;
    const executionContexts = runtimeModel.executionContexts();
    for (let i = 0; i < executionContexts.length; i++) {
      if (this.#switchContextIfNecessary(executionContexts[i])) {
        break;
      }
    }
  }

  #switchContextIfNecessary(executionContext: SDK.RuntimeModel.ExecutionContext): boolean {
    if (!this.#context.flavor(SDK.RuntimeModel.ExecutionContext) || this.#shouldSwitchToContext(executionContext)) {
      this.#ignoreContextChanged = true;
      this.#context.setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);
      this.#ignoreContextChanged = false;
      return true;
    }
    return false;
  }

  #currentExecutionContextGone(): void {
    const runtimeModels = this.#targetManager.models(SDK.RuntimeModel.RuntimeModel);
    let newContext: SDK.RuntimeModel.ExecutionContext|null = null;
    for (let i = 0; i < runtimeModels.length && !newContext; ++i) {
      const executionContexts = runtimeModels[i].executionContexts();
      for (const executionContext of executionContexts) {
        if (this.#isDefaultContext(executionContext)) {
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
    this.#ignoreContextChanged = true;
    this.#context.setFlavor(SDK.RuntimeModel.ExecutionContext, newContext);
    this.#ignoreContextChanged = false;
  }
}

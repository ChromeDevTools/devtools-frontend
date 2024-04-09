// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Common from '../../core/common/common.js';

type JSONValue = null | string | number | boolean | {[key: string]: JSONValue} | JSONValue[];
type DomainName = 'react-devtools';
type DomainMessageListener = (message: JSONValue) => void;
type BindingCalledEventTargetEvent = Common.EventTarget.EventTargetEvent<SDK.RuntimeModel.EventTypes[SDK.RuntimeModel.Events.BindingCalled]>;

const RUNTIME_GLOBAL = '__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__';

export class ReactDevToolsBindingsModel extends SDK.SDKModel.SDKModel {
  private readonly domainToListeners: Map<DomainName, Set<DomainMessageListener>> = new Map();

  constructor(target: SDK.Target.Target) {
    super(target);

    this.initialize(target);
  }

  private initialize(target: SDK.Target.Target): void {
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      return;
    }

    runtimeModel.addEventListener(SDK.RuntimeModel.Events.BindingCalled, this.bindingCalled, this);
    void this.enable(target);
  }

  private bindingCalled(event: BindingCalledEventTargetEvent): void {
    const serializedMessage = event.data.payload;

    try {
      const {domain, message} = JSON.parse(serializedMessage);
      this.dispatchMessageToDomainEventListeners(domain, message);
    } catch (err) {
      throw new Error('Failed to parse bindingCalled event payload:', err);
    }
  }

  subscribeToDomainMessages(domainName: DomainName, listener: DomainMessageListener): void {
    let listeners = this.domainToListeners.get(domainName);
    if (!listeners) {
        listeners = new Set();
        this.domainToListeners.set(domainName, listeners);
    }

    listeners.add(listener);
  }

  unsubscribeFromDomainMessages(domainName: DomainName, listener: DomainMessageListener): void {
    const listeners = this.domainToListeners.get(domainName);
    if (!listeners) {
      return;
    }

    listeners.delete(listener);
  }

  private dispatchMessageToDomainEventListeners(domainName: DomainName, message: JSONValue): void {
    const listeners = this.domainToListeners.get(domainName);
    if (!listeners) {
      // No subscriptions, no need to throw, just don't notify.
      return;
    }

    const errors = [];
    for (const listener of listeners) {
      try {
        listener(message);
      } catch (e) {
        errors.push(e);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `[ReactDevToolsBindingsModel] Error occurred when calling event listeners for domain: ${domainName}`,
      );
    }
  }

  async initializeDomain(domainName: DomainName): Promise<void> {
    const runtimeModel = this.target().model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      throw new Error(`[ReactDevToolsBindingsModel] Failed to initialize domain ${domainName}: runtime model is not available`);
    }

    await runtimeModel.agent.invoke_evaluate({expression: `void ${RUNTIME_GLOBAL}.initializeDomain('${domainName}')`});
  }

  async sendMessage(domainName: DomainName, message: JSONValue): Promise<void> {
    const runtimeModel = this.target().model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      throw new Error(`[ReactDevToolsBindingsModel] Failed to send message for domain ${domainName}: runtime model is not available`);
    }

    const serializedMessage = JSON.stringify(message);

    await runtimeModel.agent.invoke_evaluate({expression: `${RUNTIME_GLOBAL}.sendMessage('${domainName}', '${serializedMessage}')`});
  }

  async enable(target: SDK.Target.Target): Promise<void> {
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      throw new Error('[ReactDevToolsBindingsModel] Failed to enable model: runtime model is not available');
    }

    await runtimeModel.agent.invoke_evaluate({expression: `${RUNTIME_GLOBAL}.BINDING_NAME`})
      .then(response => response.result.value)
      .then(bindingName => runtimeModel.agent.invoke_addBinding({name: bindingName}));
  }
}

SDK.SDKModel.SDKModel.register(ReactDevToolsBindingsModel, {capabilities: SDK.Target.Capability.JS, autostart: false});

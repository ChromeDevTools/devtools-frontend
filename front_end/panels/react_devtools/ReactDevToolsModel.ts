// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as ReactNativeModels from '../../models/react_native/react_native.js';

type JSONValue = null | string | number | boolean | {[key: string]: JSONValue} | JSONValue[];

export const enum Events {
  Initialized = 'Initialized',
  MessageReceived = 'MessageReceived',
}

export type EventTypes = {
  [Events.Initialized]: void,
  [Events.MessageReceived]: JSONValue,
};

export class ReactDevToolsModel extends SDK.SDKModel.SDKModel<EventTypes> {
  private static readonly FUSEBOX_BINDING_NAMESPACE = 'react-devtools';
  private readonly rdtModel: ReactNativeModels.ReactDevToolsBindingsModel.ReactDevToolsBindingsModel | null;

  constructor(target: SDK.Target.Target) {
    super(target);

    const model = target.model(ReactNativeModels.ReactDevToolsBindingsModel.ReactDevToolsBindingsModel);
    if (!model) {
      throw new Error('Failed to construct ReactDevToolsModel: ReactDevToolsBindingsModel was null');
    }

    this.rdtModel = model;
    model.addEventListener(ReactNativeModels.ReactDevToolsBindingsModel.Events.Initialized, this.initialize, this);
  }

  private initialize(): void {
    const rdtModel = this.rdtModel;
    if (!rdtModel) {
      throw new Error('Failed to initialize ReactDevToolsModel: ReactDevToolsBindingsModel was null');
    }

    rdtModel.subscribeToDomainMessages(
      ReactDevToolsModel.FUSEBOX_BINDING_NAMESPACE,
        message => this.onMessage(message),
    );
    void rdtModel.initializeDomain(ReactDevToolsModel.FUSEBOX_BINDING_NAMESPACE).then(() => this.onInitialization());
  }

  private onInitialization(): void {
    this.dispatchEventToListeners(Events.Initialized);
  }

  async sendMessage(message: JSONValue): Promise<void> {
    const rdtModel = this.rdtModel;
    if (!rdtModel) {
      throw new Error('Failed to send message from ReactDevToolsModel: ReactDevToolsBindingsModel was null');
    }

    await rdtModel.sendMessage(ReactDevToolsModel.FUSEBOX_BINDING_NAMESPACE, message);
  }

  onMessage(message: JSONValue): void {
    this.dispatchEventToListeners(Events.MessageReceived, message);
  }
}

SDK.SDKModel.SDKModel.register(ReactDevToolsModel, {capabilities: SDK.Target.Capability.JS, autostart: false});

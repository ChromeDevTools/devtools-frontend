// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as ReactDevTools from '../../third_party/react-devtools/react-devtools.js';

import type * as ReactDevToolsTypes from '../../third_party/react-devtools/react-devtools.js';
import type * as Common from '../../core/common/common.js';

import {Events as ReactDevToolsModelEvents, ReactDevToolsModel, type EventTypes as ReactDevToolsModelEventTypes} from './ReactDevToolsModel.js';

const UIStrings = {
  /**
   *@description Title of the React DevTools view
   */
  title: 'React DevTools',
};
const str_ = i18n.i18n.registerUIStrings('panels/react_devtools/ReactDevToolsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

type ReactDevToolsMessageReceivedEvent = Common.EventTarget.EventTargetEvent<ReactDevToolsModelEventTypes[ReactDevToolsModelEvents.MessageReceived]>;
type ContextDestroyedEvent = Common.EventTarget.EventTargetEvent<SDK.RuntimeModel.EventTypes[SDK.RuntimeModel.Events.ExecutionContextDestroyed]>;
type ContextCreatedEvent = Common.EventTarget.EventTargetEvent<SDK.RuntimeModel.EventTypes[SDK.RuntimeModel.Events.ExecutionContextCreated]>;

// Hermes doesn't support Workers API yet, so there is a single execution context at the moment
// This will be used for an extra-check to future-proof this logic
// See https://github.com/facebook/react-native/blob/40b54ee671e593d125630391119b880aebc8393d/packages/react-native/ReactCommon/jsinspector-modern/InstanceTarget.cpp#L61
const MAIN_EXECUTION_CONTEXT_NAME = 'main';

export class ReactDevToolsViewImpl extends UI.View.SimpleView {
  private readonly wall: ReactDevToolsTypes.Wall;
  private bridge: ReactDevToolsTypes.Bridge;
  private store: ReactDevToolsTypes.Store;
  private readonly listeners: Set<ReactDevToolsTypes.WallListener> = new Set();

  constructor() {
    super(i18nString(UIStrings.title));

    this.wall = {
      listen: (listener): Function => {
        this.listeners.add(listener);

        return (): void => {
          this.listeners.delete(listener);
        };
      },
      send: (event, payload): void => this.sendMessage(event, payload),
    };

    // To use the custom Wall we've created, we need to also create our own "Bridge" and "Store" objects.
    this.bridge = ReactDevTools.createBridge(this.wall);
    this.store = ReactDevTools.createStore(this.bridge);

    // Notify backend if Chrome DevTools was closed, marking frontend as disconnected
    window.addEventListener('beforeunload', () => this.bridge.shutdown());

    SDK.TargetManager.TargetManager.instance().addModelListener(
      ReactDevToolsModel,
      ReactDevToolsModelEvents.MessageReceived,
      this.onMessage,
      this,
    );
    SDK.TargetManager.TargetManager.instance().addModelListener(
      ReactDevToolsModel,
      ReactDevToolsModelEvents.Initialized,
      this.initialize,
      this,
    );
    SDK.TargetManager.TargetManager.instance().addModelListener(
      SDK.RuntimeModel.RuntimeModel,
      SDK.RuntimeModel.Events.ExecutionContextDestroyed,
      this.onExecutionContextDestroyed,
      this,
    );
    SDK.TargetManager.TargetManager.instance().addModelListener(
      SDK.RuntimeModel.RuntimeModel,
      SDK.RuntimeModel.Events.ExecutionContextCreated,
      this.onExecutionContextCreated,
      this,
    );

    this.renderLoader();
  }

  private renderLoader(): void {
    const loaderContainer = document.createElement('div');
    loaderContainer.setAttribute('style', 'display: flex; flex: 1; justify-content: center; align-items: center');

    const loader = document.createElement('span');
    loader.classList.add('spinner');

    loaderContainer.appendChild(loader);
    this.contentElement.appendChild(loaderContainer);
  }

  private clearLoader(): void {
    this.contentElement.removeChildren();
  }

  private initialize(): void {
    this.clearLoader();

    const usingDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    ReactDevTools.initialize(this.contentElement, {
      bridge: this.bridge,
      store: this.store,
      theme: usingDarkTheme ? 'dark' : 'light',
    });
  }

  override wasShown(): void {
    super.wasShown();

    // This has to be here, because initialize() can be called when user is on the other panel and view is unmounted
    this.registerCSSFiles([ReactDevTools.CSS]);
  }

  private onMessage(event: ReactDevToolsMessageReceivedEvent): void {
    if (!event.data) {
      return;
    }

    for (const listener of this.listeners) {
      listener(event.data);
    }
  }

  private sendMessage(event: string, payload?: ReactDevToolsTypes.MessagePayload): void {
    for (const model of SDK.TargetManager.TargetManager.instance().models(ReactDevToolsModel, {scoped: true})) {
      void model.sendMessage({event, payload});
    }
  }

  private onExecutionContextDestroyed(event: ContextDestroyedEvent): void {
    if (event.data.name !== MAIN_EXECUTION_CONTEXT_NAME) {
      return;
    }

    // Unmount React DevTools view
    this.contentElement.removeChildren();

    this.bridge.shutdown();
    this.listeners.clear();

    this.renderLoader();
  }

  private onExecutionContextCreated(event: ContextCreatedEvent): void {
    if (event.data.name !== MAIN_EXECUTION_CONTEXT_NAME) {
      return;
    }

    // Recreate bridge, because previous one was shutdown
    this.bridge = ReactDevTools.createBridge(this.wall);
    this.store = ReactDevTools.createStore(this.bridge);

    this.initialize();
  }
}

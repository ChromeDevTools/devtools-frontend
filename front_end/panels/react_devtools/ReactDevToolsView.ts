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

import {Events, ReactDevToolsModel, type EventTypes} from './ReactDevToolsModel.js';

const UIStrings = {
  /**
   *@description Title of the React DevTools view
   */
  title: 'React DevTools',
};
const str_ = i18n.i18n.registerUIStrings('panels/react_devtools/ReactDevToolsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ReactDevToolsViewImpl extends UI.View.SimpleView {
  private readonly wall: ReactDevToolsTypes.Wall;
  private readonly bridge: ReactDevToolsTypes.Bridge;
  private readonly store: ReactDevToolsTypes.Store;
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

    SDK.TargetManager.TargetManager.instance().addModelListener(
      ReactDevToolsModel,
      Events.MessageReceived,
      this.onMessage,
      this,
    );

    SDK.TargetManager.TargetManager.instance().addModelListener(
      ReactDevToolsModel,
      Events.Initialized,
      this.initialize,
      this,
    );

    const loaderContainer = document.createElement('div');
    loaderContainer.setAttribute('style', 'display: flex; flex: 1; justify-content: center; align-items: center');

    const loader = document.createElement('span');
    loader.classList.add('spinner');

    loaderContainer.appendChild(loader);
    this.contentElement.appendChild(loaderContainer);
  }

  private initialize(): void {
    // Remove loader
    this.contentElement.removeChildren();

    const usingDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;

    this.registerCSSFiles([ReactDevTools.CSS]);
    ReactDevTools.initialize(this.contentElement, {
      bridge: this.bridge,
      store: this.store,
      theme: usingDarkTheme ? 'dark' : 'light',
    });
  }

  private onMessage(event: Common.EventTarget.EventTargetEvent<EventTypes[Events.MessageReceived]>): void {
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
}

// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as EventListeners from '../event_listeners/event_listeners.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/**
 * @implements {UI.Toolbar.ItemsProvider}
 * @unrestricted
 */
export class ObjectEventListenersSidebarPane extends UI.Widget.VBox {
  constructor() {
    super();
    this._refreshButton = new UI.Toolbar.ToolbarButton(ls`Refresh global listeners`, 'largeicon-refresh');
    this._refreshButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._refreshClick, this);
    this._refreshButton.setEnabled(false);

    this._eventListenersView = new EventListeners.EventListenersView.EventListenersView(this.update.bind(this));
    this._eventListenersView.show(this.element);
    this.setDefaultFocusedChild(this._eventListenersView);
  }

  /**
   * @override
   * @return {!Array<!UI.Toolbar.ToolbarItem>}
   */
  toolbarItems() {
    return [this._refreshButton];
  }

  update() {
    if (this._lastRequestedContext) {
      this._lastRequestedContext.runtimeModel.releaseObjectGroup(objectGroupName);
      delete this._lastRequestedContext;
    }
    const executionContext = self.UI.context.flavor(SDK.RuntimeModel.ExecutionContext);
    if (!executionContext) {
      this._eventListenersView.reset();
      this._eventListenersView.addEmptyHolderIfNeeded();
      return;
    }
    this._lastRequestedContext = executionContext;
    Promise.all([this._windowObjectInContext(executionContext)])
        .then(this._eventListenersView.addObjects.bind(this._eventListenersView));
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    self.UI.context.addFlavorChangeListener(SDK.RuntimeModel.ExecutionContext, this.update, this);
    this._refreshButton.setEnabled(true);
    this.update();
  }

  /**
   * @override
   */
  willHide() {
    super.willHide();
    self.UI.context.removeFlavorChangeListener(SDK.RuntimeModel.ExecutionContext, this.update, this);
    this._refreshButton.setEnabled(false);
  }

  /**
   * @param {!SDK.RuntimeModel.ExecutionContext} executionContext
   * @return {!Promise<?SDK.RemoteObject.RemoteObject>} object
   */
  _windowObjectInContext(executionContext) {
    return executionContext
        .evaluate(
            {
              expression: 'self',
              objectGroup: objectGroupName,
              includeCommandLineAPI: false,
              silent: true,
              returnByValue: false,
              generatePreview: false
            },
            /* userGesture */ false,
            /* awaitPromise */ false)
        .then(result => result.object && !result.exceptionDetails ? result.object : null);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _refreshClick(event) {
    event.data.consume();
    this.update();
  }
}

export const objectGroupName = 'object-event-listeners-sidebar-pane';

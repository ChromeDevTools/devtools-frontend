// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../common/common.js';
import * as EventListeners from '../event_listeners/event_listeners.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Label for a button in the sources panel that refreshes the list of global event listeners.
  */
  refreshGlobalListeners: 'Refresh global listeners',
};
const str_ = i18n.i18n.registerUIStrings('browser_debugger/ObjectEventListenersSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let objectEventListenersSidebarPaneInstance: ObjectEventListenersSidebarPane;

export class ObjectEventListenersSidebarPane extends UI.Widget.VBox implements UI.Toolbar.ItemsProvider {
  _refreshButton: UI.Toolbar.ToolbarButton;
  _eventListenersView: EventListeners.EventListenersView.EventListenersView;
  _lastRequestedContext?: SDK.RuntimeModel.ExecutionContext;
  private constructor() {
    super();
    this._refreshButton =
        new UI.Toolbar.ToolbarButton(i18nString(UIStrings.refreshGlobalListeners), 'largeicon-refresh');
    this._refreshButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._refreshClick, this);
    this._refreshButton.setEnabled(false);

    this._eventListenersView = new EventListeners.EventListenersView.EventListenersView(
        this.update.bind(this), /* enableDefaultTreeFocus */ true);
    this._eventListenersView.show(this.element);
    this.setDefaultFocusedChild(this._eventListenersView);
  }

  static instance(): ObjectEventListenersSidebarPane {
    if (!objectEventListenersSidebarPaneInstance) {
      objectEventListenersSidebarPaneInstance = new ObjectEventListenersSidebarPane();
    }
    return objectEventListenersSidebarPaneInstance;
  }

  toolbarItems(): UI.Toolbar.ToolbarItem[] {
    return [this._refreshButton];
  }

  update(): void {
    if (this._lastRequestedContext) {
      this._lastRequestedContext.runtimeModel.releaseObjectGroup(objectGroupName);
      delete this._lastRequestedContext;
    }
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    if (!executionContext) {
      this._eventListenersView.reset();
      this._eventListenersView.addEmptyHolderIfNeeded();
      return;
    }
    this._lastRequestedContext = executionContext;
    Promise.all([this._windowObjectInContext(executionContext)])
        .then(this._eventListenersView.addObjects.bind(this._eventListenersView));
  }

  wasShown(): void {
    super.wasShown();
    UI.Context.Context.instance().addFlavorChangeListener(SDK.RuntimeModel.ExecutionContext, this.update, this);
    this._refreshButton.setEnabled(true);
    this.update();
  }

  willHide(): void {
    super.willHide();
    UI.Context.Context.instance().removeFlavorChangeListener(SDK.RuntimeModel.ExecutionContext, this.update, this);
    this._refreshButton.setEnabled(false);
  }

  _windowObjectInContext(executionContext: SDK.RuntimeModel.ExecutionContext):
      Promise<SDK.RemoteObject.RemoteObject|null> {
    return executionContext
        .evaluate(
            {
              expression: 'self',
              objectGroup: objectGroupName,
              includeCommandLineAPI: false,
              silent: true,
              returnByValue: false,
              generatePreview: false,
              timeout: undefined,
              throwOnSideEffect: undefined,
              disableBreaks: undefined,
              replMode: undefined,
              allowUnsafeEvalBlockedByCSP: undefined,
            },
            /* userGesture */ false,
            /* awaitPromise */ false)
        .then(result => {
          if ('error' in result || result.exceptionDetails) {
            return null;
          }
          return result.object;
        });
  }

  _refreshClick(event: Common.EventTarget.EventTargetEvent): void {
    event.data.consume();
    this.update();
  }
}

export const objectGroupName = 'object-event-listeners-sidebar-pane';

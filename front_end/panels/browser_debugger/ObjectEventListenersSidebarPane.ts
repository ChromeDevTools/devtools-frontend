// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as EventListeners from '../event_listeners/event_listeners.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

const UIStrings = {
  /**
   *@description Label for a button in the sources panel that refreshes the list of global event listeners.
   */
  refreshGlobalListeners: 'Refresh global listeners',
};
const str_ = i18n.i18n.registerUIStrings('panels/browser_debugger/ObjectEventListenersSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let objectEventListenersSidebarPaneInstance: ObjectEventListenersSidebarPane;

export class ObjectEventListenersSidebarPane extends UI.Widget.VBox implements UI.Toolbar.ItemsProvider {
  readonly #refreshButton: UI.Toolbar.ToolbarButton;
  readonly #eventListenersView: EventListeners.EventListenersView.EventListenersView;
  #lastRequestedContext?: SDK.RuntimeModel.ExecutionContext;
  private constructor() {
    super();
    this.#refreshButton =
        new UI.Toolbar.ToolbarButton(i18nString(UIStrings.refreshGlobalListeners), 'largeicon-refresh');
    this.#refreshButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.refreshClick, this);
    this.#refreshButton.setEnabled(false);

    this.#eventListenersView = new EventListeners.EventListenersView.EventListenersView(
        this.update.bind(this), /* enableDefaultTreeFocus */ true);
    this.#eventListenersView.show(this.element);
    this.setDefaultFocusedChild(this.#eventListenersView);
  }

  static instance(): ObjectEventListenersSidebarPane {
    if (!objectEventListenersSidebarPaneInstance) {
      objectEventListenersSidebarPaneInstance = new ObjectEventListenersSidebarPane();
    }
    return objectEventListenersSidebarPaneInstance;
  }

  get eventListenersView(): EventListeners.EventListenersView.EventListenersView {
    return this.#eventListenersView;
  }

  toolbarItems(): UI.Toolbar.ToolbarItem[] {
    return [this.#refreshButton];
  }

  update(): void {
    if (this.#lastRequestedContext) {
      this.#lastRequestedContext.runtimeModel.releaseObjectGroup(objectGroupName);
      this.#lastRequestedContext = undefined;
    }
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    if (!executionContext) {
      this.#eventListenersView.reset();
      this.#eventListenersView.addEmptyHolderIfNeeded();
      return;
    }
    this.#lastRequestedContext = executionContext;
    void Promise.all([this.windowObjectInContext(executionContext)])
        .then(this.#eventListenersView.addObjects.bind(this.#eventListenersView));
  }

  wasShown(): void {
    super.wasShown();
    UI.Context.Context.instance().addFlavorChangeListener(SDK.RuntimeModel.ExecutionContext, this.update, this);
    this.#refreshButton.setEnabled(true);
    this.update();
  }

  willHide(): void {
    super.willHide();
    UI.Context.Context.instance().removeFlavorChangeListener(SDK.RuntimeModel.ExecutionContext, this.update, this);
    this.#refreshButton.setEnabled(false);
  }

  private windowObjectInContext(executionContext: SDK.RuntimeModel.ExecutionContext):
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

  private refreshClick(event: Common.EventTarget.EventTargetEvent<Event>): void {
    event.data.consume();
    this.update();
  }
}

export const objectGroupName = 'object-event-listeners-sidebar-pane';

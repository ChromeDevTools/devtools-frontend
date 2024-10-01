// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as EventListeners from '../event_listeners/event_listeners.js';

export class ObjectEventListenersSidebarPane extends UI.ThrottledWidget.ThrottledWidget implements
    UI.Toolbar.ItemsProvider {
  #lastRequestedContext?: SDK.RuntimeModel.ExecutionContext;

  // TODO(bmeurer): This is only public for web tests.
  readonly eventListenersView: EventListeners.EventListenersView.EventListenersView;

  constructor() {
    super();
    this.contentElement.setAttribute('jslog', `${VisualLogging.section('sources.global-listeners')}`);

    this.eventListenersView = new EventListeners.EventListenersView.EventListenersView(
        this.update.bind(this), /* enableDefaultTreeFocus */ true);
    this.eventListenersView.show(this.element);
    this.setDefaultFocusedChild(this.eventListenersView);
    this.update();
  }

  toolbarItems(): UI.Toolbar.ToolbarItem[] {
    const refreshButton = UI.Toolbar.Toolbar.createActionButtonForId('browser-debugger.refresh-global-event-listeners');
    refreshButton.setSize(Buttons.Button.Size.SMALL);
    return [refreshButton];
  }

  protected override async doUpdate(): Promise<void> {
    if (this.#lastRequestedContext) {
      this.#lastRequestedContext.runtimeModel.releaseObjectGroup(objectGroupName);
      this.#lastRequestedContext = undefined;
    }

    const windowObjects: Array<SDK.RemoteObject.RemoteObject> = [];
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    if (executionContext) {
      this.#lastRequestedContext = executionContext;
      const result = await executionContext.evaluate(
          {
            expression: 'self',
            objectGroup: objectGroupName,
            includeCommandLineAPI: false,
            silent: true,
            returnByValue: false,
            generatePreview: false,
          },
          /* userGesture */ false,
          /* awaitPromise */ false);
      if (!('error' in result) && !result.exceptionDetails) {
        windowObjects.push(result.object);
      }
    }
    await this.eventListenersView.addObjects(windowObjects);
  }

  override wasShown(): void {
    super.wasShown();
    UI.Context.Context.instance().addFlavorChangeListener(SDK.RuntimeModel.ExecutionContext, this.update, this);
    UI.Context.Context.instance().setFlavor(ObjectEventListenersSidebarPane, this);
  }

  override willHide(): void {
    UI.Context.Context.instance().setFlavor(ObjectEventListenersSidebarPane, null);
    UI.Context.Context.instance().removeFlavorChangeListener(SDK.RuntimeModel.ExecutionContext, this.update, this);
    super.willHide();
    if (this.#lastRequestedContext) {
      this.#lastRequestedContext.runtimeModel.releaseObjectGroup(objectGroupName);
      this.#lastRequestedContext = undefined;
    }
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'browser-debugger.refresh-global-event-listeners': {
        const eventListenersSidebarPane = context.flavor(ObjectEventListenersSidebarPane);
        if (eventListenersSidebarPane) {
          eventListenersSidebarPane.update();
          return true;
        }
        return false;
      }
    }
    return false;
  }
}

export const objectGroupName = 'object-event-listeners-sidebar-pane';

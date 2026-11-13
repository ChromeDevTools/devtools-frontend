// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as EventListeners from '../event_listeners/event_listeners.js';

const {bindToAction} = UI.UIUtils;
const {html} = Lit;

export class ObjectEventListenersSidebarPane extends EventListeners.EventListenersView.EventListenersView implements
    UI.Toolbar.ItemsProvider {
  protected override readonly jslog: string = `${VisualLogging.section('sources.global-listeners')}`;
  #lastRequestedContext?: SDK.RuntimeModel.ExecutionContext;

  toolbarItems(): Lit.TemplateResult {
    // clang-format off
    return html`
      <devtools-button
        ${bindToAction('browser-debugger.refresh-global-event-listeners')}
        .size=${Buttons.Button.Size.SMALL}
      ></devtools-button>
    `;
    // clang-format on
  }

  override async performUpdate(): Promise<void> {
    if (this.#lastRequestedContext) {
      this.#lastRequestedContext.runtimeModel.releaseObjectGroup(objectGroupName);
      this.#lastRequestedContext = undefined;
    }

    const windowObjects: SDK.RemoteObject.RemoteObject[] = [];
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    if (executionContext) {
      this.#lastRequestedContext = executionContext;
      const result = await executionContext.evaluateWithSelectedFrameFallback({
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
    this.setObjects(windowObjects);
    await super.performUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    UI.Context.Context.instance().addFlavorChangeListener(SDK.RuntimeModel.ExecutionContext, this.requestUpdate, this);
    UI.Context.Context.instance().setFlavor(ObjectEventListenersSidebarPane, this);
    this.requestUpdate();
  }

  override willHide(): void {
    UI.Context.Context.instance().setFlavor(ObjectEventListenersSidebarPane, null);
    UI.Context.Context.instance().removeFlavorChangeListener(
        SDK.RuntimeModel.ExecutionContext, this.requestUpdate, this);
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
          eventListenersSidebarPane.requestUpdate();
          return true;
        }
        return false;
      }
    }
    return false;
  }
}

export const objectGroupName = 'object-event-listeners-sidebar-pane';

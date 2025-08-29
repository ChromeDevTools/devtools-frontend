// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2007 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as EventListeners from '../event_listeners/event_listeners.js';

const {bindToSetting} = UI.SettingsUI;
const {bindToAction} = UI.UIUtils;

const UIStrings = {
  /**
   * @description Title of show framework listeners setting in event listeners widget of the elements panel
   */
  frameworkListeners: 'Resolve `Framework` listeners',
  /**
   * @description Tooltip text that appears on the setting when hovering over it in Event Listeners Widget of the Elements panel
   */
  showListenersOnTheAncestors: 'Show listeners on the ancestors',
  /**
   * @description Alternative title text of a setting in Event Listeners Widget of the Elements panel
   */
  ancestors: 'Ancestors',
  /**
   * @description Title of dispatch filter in event listeners widget of the elements panel
   */
  eventListenersCategory: 'Event listeners category',
  /**
   * @description Text for everything
   */
  all: 'All',
  /**
   * @description Text in Event Listeners Widget of the Elements panel
   */
  passive: 'Passive',
  /**
   * @description Text in Event Listeners Widget of the Elements panel
   */
  blocking: 'Blocking',
  /**
   * @description Tooltip text that appears on the setting when hovering over it in Event Listeners Widget of the Elements panel
   */
  resolveEventListenersBoundWith: 'Resolve event listeners bound with framework',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/elements/EventListenersWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let eventListenersWidgetInstance: EventListenersWidget;

interface ViewInput {
  refreshEventListenersActionName: string;
  showForAncestorsSetting: Common.Settings.Setting<boolean>;
  dispatchFilterBySetting: Common.Settings.Setting<string>;
  showFrameworkListenersSetting: Common.Settings.Setting<boolean>;
  onDispatchFilterTypeChange: (value: string) => void;
  onEventListenersViewChange: () => void;
  dispatchFilters: Array<{name: string, value: string}>;
  selectedDispatchFilter: string;
  eventListenerObjects: Array<SDK.RemoteObject.RemoteObject|null>;
  filter: {
    showFramework: boolean,
    showPassive: boolean,
    showBlocking: boolean,
  };
}

type View = (input: ViewInput, output: object, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <div jslog=${VisualLogging.pane('elements.event-listeners').track({ resize: true })}>
      <devtools-toolbar class="event-listener-toolbar" role="presentation">
        <devtools-button ${bindToAction(input.refreshEventListenersActionName)}></devtools-button>
        <devtools-checkbox title=${i18nString(UIStrings.showListenersOnTheAncestors)}
          ${bindToSetting(input.showForAncestorsSetting)}
          jslog=${VisualLogging.toggle('show-event-listeners-for-ancestors').track({ change: true })}>
          ${i18nString(UIStrings.ancestors)}
        </devtools-checkbox>
        <select class="dispatch-filter"
          title=${i18nString(UIStrings.eventListenersCategory)}
          aria-label=${i18nString(UIStrings.eventListenersCategory)}
          jslog=${VisualLogging.filterDropdown().track({ change: true })}
          @change=${(e: Event) => input.onDispatchFilterTypeChange((e.target as HTMLSelectElement).value)}>
          ${input.dispatchFilters.map(filter => html`
            <option value=${filter.value} ?selected=${filter.value === input.selectedDispatchFilter}>
              ${filter.name}
            </option>`)}
        </select>
        <devtools-checkbox title=${i18nString(UIStrings.resolveEventListenersBoundWith)}
          ${bindToSetting(input.showFrameworkListenersSetting)}
          jslog=${VisualLogging.toggle('show-frameowkr-listeners').track({ change: true })}>
          ${i18nString(UIStrings.frameworkListeners)}
        </devtools-checkbox>
      </devtools-toolbar>
      <devtools-widget .widgetConfig=${UI.Widget.widgetConfig(EventListeners.EventListenersView.EventListenersView, {
        changeCallback: input.onEventListenersViewChange,
        objects: input.eventListenerObjects,
        filter: input.filter,
      })}></devtools-widget>
    </div>`, target);
  // clang-format on
};

export class EventListenersWidget extends UI.ThrottledWidget.ThrottledWidget {
  private showForAncestorsSetting: Common.Settings.Setting<boolean>;
  private readonly dispatchFilterBySetting: Common.Settings.Setting<string>;
  private readonly showFrameworkListenersSetting: Common.Settings.Setting<boolean>;
  private lastRequestedNode?: SDK.DOMModel.DOMNode;
  readonly #view: View;

  constructor(view: View = DEFAULT_VIEW) {
    super();
    this.#view = view;
    this.showForAncestorsSetting =
        Common.Settings.Settings.instance().moduleSetting('show-event-listeners-for-ancestors');
    this.showForAncestorsSetting.addChangeListener(this.update.bind(this));

    this.dispatchFilterBySetting =
        Common.Settings.Settings.instance().createSetting('event-listener-dispatch-filter-type', DispatchFilterBy.All);
    this.dispatchFilterBySetting.addChangeListener(this.update.bind(this));

    this.showFrameworkListenersSetting =
        Common.Settings.Settings.instance().createSetting('show-frameowkr-listeners', true);
    this.showFrameworkListenersSetting.setTitle(i18nString(UIStrings.frameworkListeners));
    this.showFrameworkListenersSetting.addChangeListener(this.update.bind(this));

    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.update, this);
    this.update();
  }

  static instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): EventListenersWidget {
    const {forceNew} = opts;
    if (!eventListenersWidgetInstance || forceNew) {
      eventListenersWidgetInstance = new EventListenersWidget();
    }

    return eventListenersWidgetInstance;
  }

  override async doUpdate(): Promise<void> {
    const dispatchFilter = this.dispatchFilterBySetting.get();
    const showPassive = dispatchFilter === DispatchFilterBy.All || dispatchFilter === DispatchFilterBy.Passive;
    const showBlocking = dispatchFilter === DispatchFilterBy.All || dispatchFilter === DispatchFilterBy.Blocking;

    const input = {
      refreshEventListenersActionName: 'elements.refresh-event-listeners',
      showForAncestorsSetting: this.showForAncestorsSetting,
      dispatchFilterBySetting: this.dispatchFilterBySetting,
      showFrameworkListenersSetting: this.showFrameworkListenersSetting,
      onDispatchFilterTypeChange: (value: string) => {
        this.dispatchFilterBySetting.set(value);
      },
      onEventListenersViewChange: this.update.bind(this),
      dispatchFilters: [
        {name: i18nString(UIStrings.all), value: DispatchFilterBy.All},
        {name: i18nString(UIStrings.passive), value: DispatchFilterBy.Passive},
        {name: i18nString(UIStrings.blocking), value: DispatchFilterBy.Blocking},
      ],
      selectedDispatchFilter: dispatchFilter,
      eventListenerObjects: [] as Array<SDK.RemoteObject.RemoteObject|null>,
      filter: {showFramework: this.showFrameworkListenersSetting.get(), showPassive, showBlocking},
    };

    if (this.lastRequestedNode) {
      this.lastRequestedNode.domModel().runtimeModel().releaseObjectGroup(objectGroupName);
      delete this.lastRequestedNode;
    }
    const node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (node) {
      this.lastRequestedNode = node;
      const selectedNodeOnly = !this.showForAncestorsSetting.get();
      const promises = [];
      promises.push(node.resolveToObject(objectGroupName));
      if (!selectedNodeOnly) {
        let currentNode: (SDK.DOMModel.DOMNode|null) = node.parentNode;
        while (currentNode) {
          promises.push(currentNode.resolveToObject(objectGroupName));
          currentNode = currentNode.parentNode;
        }
        promises.push(this.windowObjectInNodeContext(node));
      }
      input.eventListenerObjects = await Promise.all(promises);
    }

    this.#view(input, {}, this.contentElement);
  }

  override wasShown(): void {
    UI.Context.Context.instance().setFlavor(EventListenersWidget, this);
    super.wasShown();
  }

  override willHide(): void {
    super.willHide();
    UI.Context.Context.instance().setFlavor(EventListenersWidget, null);
  }

  private windowObjectInNodeContext(node: SDK.DOMModel.DOMNode): Promise<SDK.RemoteObject.RemoteObject|null> {
    const executionContexts = node.domModel().runtimeModel().executionContexts();
    let context: SDK.RuntimeModel.ExecutionContext = executionContexts[0];
    if (node.frameId()) {
      for (let i = 0; i < executionContexts.length; ++i) {
        const executionContext = executionContexts[i];
        if (executionContext.frameId === node.frameId() && executionContext.isDefault) {
          context = executionContext;
        }
      }
    }

    return context
        .evaluate(
            {
              expression: 'self',
              objectGroup: objectGroupName,
              includeCommandLineAPI: false,
              silent: true,
              returnByValue: false,
              generatePreview: false,
            },
            /* userGesture */ false,
            /* awaitPromise */ false)
        .then(result => {
          if ('object' in result) {
            return result.object;
          }
          return null;
        });
  }

  eventListenersArrivedForTest(): void {
  }
}

export const DispatchFilterBy = {
  All: 'All',
  Blocking: 'Blocking',
  Passive: 'Passive',
};

const objectGroupName = 'event-listeners-panel';

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'elements.refresh-event-listeners': {
        EventListenersWidget.instance().update();
        return true;
      }
    }
    return false;
  }
}

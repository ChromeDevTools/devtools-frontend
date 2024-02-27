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
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as EventListeners from '../event_listeners/event_listeners.js';

const UIStrings = {
  /**
   *@description Title of show framework listeners setting in event listeners widget of the elements panel
   */
  frameworkListeners: '`Framework` listeners',
  /**
   *@description Tooltip text that appears on the setting when hovering over it in Event Listeners Widget of the Elements panel
   */
  showListenersOnTheAncestors: 'Show listeners on the ancestors',
  /**
   *@description Alternative title text of a setting in Event Listeners Widget of the Elements panel
   */
  ancestors: 'Ancestors',
  /**
   *@description Title of dispatch filter in event listeners widget of the elements panel
   */
  eventListenersCategory: 'Event listeners category',
  /**
   *@description Text for everything
   */
  all: 'All',
  /**
   *@description Text in Event Listeners Widget of the Elements panel
   */
  passive: 'Passive',
  /**
   *@description Text in Event Listeners Widget of the Elements panel
   */
  blocking: 'Blocking',
  /**
   *@description Tooltip text that appears on the setting when hovering over it in Event Listeners Widget of the Elements panel
   */
  resolveEventListenersBoundWith: 'Resolve event listeners bound with framework',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/EventListenersWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let eventListenersWidgetInstance: EventListenersWidget;

export class EventListenersWidget extends UI.ThrottledWidget.ThrottledWidget implements UI.Toolbar.ItemsProvider {
  private readonly toolbarItemsInternal: (UI.Toolbar.ToolbarButton|UI.Toolbar.ToolbarSettingCheckbox|
                                          UI.Toolbar.ToolbarComboBox)[];
  private showForAncestorsSetting: Common.Settings.Setting<boolean>;
  private readonly dispatchFilterBySetting: Common.Settings.Setting<string>;
  private readonly showFrameworkListenersSetting: Common.Settings.Setting<boolean>;
  private readonly eventListenersView: EventListeners.EventListenersView.EventListenersView;
  private lastRequestedNode?: SDK.DOMModel.DOMNode;

  constructor() {
    super();
    this.toolbarItemsInternal = [];

    this.showForAncestorsSetting =
        Common.Settings.Settings.instance().moduleSetting('show-event-listeners-for-ancestors');
    this.showForAncestorsSetting.addChangeListener(this.update.bind(this));

    this.dispatchFilterBySetting =
        Common.Settings.Settings.instance().createSetting('event-listener-dispatch-filter-type', DispatchFilterBy.All);
    this.dispatchFilterBySetting.addChangeListener(this.update.bind(this));

    this.showFrameworkListenersSetting =
        Common.Settings.Settings.instance().createSetting('show-frameowkr-listeners', true);
    this.showFrameworkListenersSetting.setTitle(i18nString(UIStrings.frameworkListeners));
    this.showFrameworkListenersSetting.addChangeListener(this.showFrameworkListenersChanged.bind(this));
    this.eventListenersView = new EventListeners.EventListenersView.EventListenersView(this.update.bind(this));
    this.eventListenersView.show(this.element);
    this.element.setAttribute('jslog', `${VisualLogging.pane('elements.event-listeners').track({resize: true})}`);

    this.toolbarItemsInternal.push(UI.Toolbar.Toolbar.createActionButtonForId('elements.refresh-event-listeners'));
    this.toolbarItemsInternal.push(new UI.Toolbar.ToolbarSettingCheckbox(
        this.showForAncestorsSetting, i18nString(UIStrings.showListenersOnTheAncestors),
        i18nString(UIStrings.ancestors)));
    const dispatchFilter = new UI.Toolbar.ToolbarComboBox(
        this.onDispatchFilterTypeChanged.bind(this), i18nString(UIStrings.eventListenersCategory));
    dispatchFilter.element.setAttribute('jslog', `${VisualLogging.filterDropdown().track({change: true})}`);

    function addDispatchFilterOption(this: EventListenersWidget, name: string, value: string): void {
      const option = dispatchFilter.createOption(name, value);
      if (value === this.dispatchFilterBySetting.get()) {
        dispatchFilter.select(option);
      }
    }
    addDispatchFilterOption.call(this, i18nString(UIStrings.all), DispatchFilterBy.All);
    addDispatchFilterOption.call(this, i18nString(UIStrings.passive), DispatchFilterBy.Passive);
    addDispatchFilterOption.call(this, i18nString(UIStrings.blocking), DispatchFilterBy.Blocking);
    dispatchFilter.setMaxWidth(200);
    this.toolbarItemsInternal.push(dispatchFilter);
    this.toolbarItemsInternal.push(new UI.Toolbar.ToolbarSettingCheckbox(
        this.showFrameworkListenersSetting, i18nString(UIStrings.resolveEventListenersBoundWith)));

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

  override doUpdate(): Promise<void> {
    if (this.lastRequestedNode) {
      this.lastRequestedNode.domModel().runtimeModel().releaseObjectGroup(objectGroupName);
      delete this.lastRequestedNode;
    }
    const node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (!node) {
      this.eventListenersView.reset();
      this.eventListenersView.addEmptyHolderIfNeeded();
      return Promise.resolve();
    }
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
    return Promise.all(promises)
        .then(this.eventListenersView.addObjects.bind(this.eventListenersView))
        .then(this.showFrameworkListenersChanged.bind(this));
  }

  override wasShown(): void {
    UI.Context.Context.instance().setFlavor(EventListenersWidget, this);
    super.wasShown();
  }

  override willHide(): void {
    super.willHide();
    UI.Context.Context.instance().setFlavor(EventListenersWidget, null);
  }

  toolbarItems(): UI.Toolbar.ToolbarItem[] {
    return this.toolbarItemsInternal;
  }

  private onDispatchFilterTypeChanged(event: Event): void {
    const filter = (event.target as HTMLInputElement);
    this.dispatchFilterBySetting.set(filter.value);
  }

  private showFrameworkListenersChanged(): void {
    const dispatchFilter = this.dispatchFilterBySetting.get();
    const showPassive = dispatchFilter === DispatchFilterBy.All || dispatchFilter === DispatchFilterBy.Passive;
    const showBlocking = dispatchFilter === DispatchFilterBy.All || dispatchFilter === DispatchFilterBy.Blocking;
    this.eventListenersView.showFrameworkListeners(this.showFrameworkListenersSetting.get(), showPassive, showBlocking);
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

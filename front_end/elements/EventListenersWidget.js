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

import * as Common from '../common/common.js';
import * as EventListeners from '../event_listeners/event_listeners.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Title of show framework listeners setting in event listeners widget of the elements panel
  */
  frameworkListeners: '`Framework` listeners',
  /**
  *@description Text to refresh the page
  */
  refresh: 'Refresh',
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
const str_ = i18n.i18n.registerUIStrings('elements/EventListenersWidget.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/** @type {!EventListenersWidget} */
let eventListenersWidgetInstance;

/**
 * @implements {UI.Toolbar.ItemsProvider}
 */
export class EventListenersWidget extends UI.ThrottledWidget.ThrottledWidget {
  constructor() {
    super();
    this._toolbarItems = [];

    this._showForAncestorsSetting = Common.Settings.Settings.instance().moduleSetting('showEventListenersForAncestors');
    this._showForAncestorsSetting.addChangeListener(this.update.bind(this));

    this._dispatchFilterBySetting =
        Common.Settings.Settings.instance().createSetting('eventListenerDispatchFilterType', DispatchFilterBy.All);
    this._dispatchFilterBySetting.addChangeListener(this.update.bind(this));

    this._showFrameworkListenersSetting =
        Common.Settings.Settings.instance().createSetting('showFrameowkrListeners', true);
    this._showFrameworkListenersSetting.setTitle(i18nString(UIStrings.frameworkListeners));
    this._showFrameworkListenersSetting.addChangeListener(this._showFrameworkListenersChanged.bind(this));
    this._eventListenersView = new EventListeners.EventListenersView.EventListenersView(this.update.bind(this));
    this._eventListenersView.show(this.element);

    const refreshButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.refresh), 'largeicon-refresh');
    refreshButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.update.bind(this));
    this._toolbarItems.push(refreshButton);
    this._toolbarItems.push(new UI.Toolbar.ToolbarSettingCheckbox(
        this._showForAncestorsSetting, i18nString(UIStrings.showListenersOnTheAncestors),
        i18nString(UIStrings.ancestors)));
    const dispatchFilter = new UI.Toolbar.ToolbarComboBox(
        this._onDispatchFilterTypeChanged.bind(this), i18nString(UIStrings.eventListenersCategory));

    /**
     * @param {string} name
     * @param {string} value
     * @this {EventListenersWidget}
     */
    function addDispatchFilterOption(name, value) {
      const option = dispatchFilter.createOption(name, value);
      if (value === this._dispatchFilterBySetting.get()) {
        dispatchFilter.select(option);
      }
    }
    addDispatchFilterOption.call(this, i18nString(UIStrings.all), DispatchFilterBy.All);
    addDispatchFilterOption.call(this, i18nString(UIStrings.passive), DispatchFilterBy.Passive);
    addDispatchFilterOption.call(this, i18nString(UIStrings.blocking), DispatchFilterBy.Blocking);
    dispatchFilter.setMaxWidth(200);
    this._toolbarItems.push(dispatchFilter);
    this._toolbarItems.push(new UI.Toolbar.ToolbarSettingCheckbox(
        this._showFrameworkListenersSetting, i18nString(UIStrings.resolveEventListenersBoundWith)));

    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.update, this);
    this.update();
  }

  /**
   * @param {{forceNew: ?boolean}=} opts
   * @return {!EventListenersWidget}
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!eventListenersWidgetInstance || forceNew) {
      eventListenersWidgetInstance = new EventListenersWidget();
    }

    return eventListenersWidgetInstance;
  }

  /**
   * @override
   * @protected
   * @return {!Promise.<?>}
   */
  doUpdate() {
    if (this._lastRequestedNode) {
      this._lastRequestedNode.domModel().runtimeModel().releaseObjectGroup(_objectGroupName);
      delete this._lastRequestedNode;
    }
    const node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (!node) {
      this._eventListenersView.reset();
      this._eventListenersView.addEmptyHolderIfNeeded();
      return Promise.resolve();
    }
    this._lastRequestedNode = node;
    const selectedNodeOnly = !this._showForAncestorsSetting.get();
    const promises = [];
    promises.push(node.resolveToObject(_objectGroupName));
    if (!selectedNodeOnly) {
      let currentNode = node.parentNode;
      while (currentNode) {
        promises.push(currentNode.resolveToObject(_objectGroupName));
        currentNode = currentNode.parentNode;
      }
      promises.push(this._windowObjectInNodeContext(node));
    }
    return Promise.all(promises)
        .then(this._eventListenersView.addObjects.bind(this._eventListenersView))
        .then(this._showFrameworkListenersChanged.bind(this));
  }

  /**
   * @override
   * @return {!Array<!UI.Toolbar.ToolbarItem>}
   */
  toolbarItems() {
    return this._toolbarItems;
  }

  /**
   * @param {!Event} event
   */
  _onDispatchFilterTypeChanged(event) {
    const filter = /** @type {!HTMLInputElement} */ (event.target);
    this._dispatchFilterBySetting.set(filter.value);
  }

  _showFrameworkListenersChanged() {
    const dispatchFilter = this._dispatchFilterBySetting.get();
    const showPassive = dispatchFilter === DispatchFilterBy.All || dispatchFilter === DispatchFilterBy.Passive;
    const showBlocking = dispatchFilter === DispatchFilterBy.All || dispatchFilter === DispatchFilterBy.Blocking;
    this._eventListenersView.showFrameworkListeners(
        this._showFrameworkListenersSetting.get(), showPassive, showBlocking);
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {!Promise<?SDK.RemoteObject.RemoteObject>}
   */
  _windowObjectInNodeContext(node) {
    const executionContexts = node.domModel().runtimeModel().executionContexts();
    let context = executionContexts[0];
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
              objectGroup: _objectGroupName,
              includeCommandLineAPI: false,
              silent: true,
              returnByValue: false,
              generatePreview: false,
              throwOnSideEffect: undefined,
              timeout: undefined,
              disableBreaks: undefined,
              replMode: undefined,
              allowUnsafeEvalBlockedByCSP: undefined,
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

  _eventListenersArrivedForTest() {
  }
}

export const DispatchFilterBy = {
  All: 'All',
  Blocking: 'Blocking',
  Passive: 'Passive'
};

export const _objectGroupName = 'event-listeners-panel';

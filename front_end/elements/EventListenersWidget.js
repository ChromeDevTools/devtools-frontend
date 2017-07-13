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
/**
 * @implements {UI.ToolbarItem.ItemsProvider}
 * @unrestricted
 */
Elements.EventListenersWidget = class extends UI.ThrottledWidget {
  constructor() {
    super();
    this._toolbarItems = [];

    this._showForAncestorsSetting = Common.settings.moduleSetting('showEventListenersForAncestors');
    this._showForAncestorsSetting.addChangeListener(this.update.bind(this));

    this._dispatchFilterBySetting = Common.settings.createSetting(
        'eventListenerDispatchFilterType', Elements.EventListenersWidget.DispatchFilterBy.All);
    this._dispatchFilterBySetting.addChangeListener(this.update.bind(this));

    this._showFrameworkListenersSetting = Common.settings.createSetting('showFrameowkrListeners', true);
    this._showFrameworkListenersSetting.setTitle(Common.UIString('Framework listeners'));
    this._showFrameworkListenersSetting.addChangeListener(this._showFrameworkListenersChanged.bind(this));
    this._eventListenersView = new EventListeners.EventListenersView(this.update.bind(this));
    this._eventListenersView.show(this.element);

    var refreshButton = new UI.ToolbarButton(Common.UIString('Refresh'), 'largeicon-refresh');
    refreshButton.addEventListener(UI.ToolbarButton.Events.Click, this.update.bind(this));
    this._toolbarItems.push(refreshButton);
    this._toolbarItems.push(new UI.ToolbarSettingCheckbox(
        this._showForAncestorsSetting, Common.UIString('Show listeners on the ancestors'),
        Common.UIString('Ancestors')));
    var dispatchFilter = new UI.ToolbarComboBox(this._onDispatchFilterTypeChanged.bind(this));

    /**
     * @param {string} name
     * @param {string} value
     * @this {Elements.EventListenersWidget}
     */
    function addDispatchFilterOption(name, value) {
      var option = dispatchFilter.createOption(name, '', value);
      if (value === this._dispatchFilterBySetting.get())
        dispatchFilter.select(option);
    }
    addDispatchFilterOption.call(this, Common.UIString('All'), Elements.EventListenersWidget.DispatchFilterBy.All);
    addDispatchFilterOption.call(
        this, Common.UIString('Passive'), Elements.EventListenersWidget.DispatchFilterBy.Passive);
    addDispatchFilterOption.call(
        this, Common.UIString('Blocking'), Elements.EventListenersWidget.DispatchFilterBy.Blocking);
    dispatchFilter.setMaxWidth(200);
    this._toolbarItems.push(dispatchFilter);
    this._toolbarItems.push(new UI.ToolbarSettingCheckbox(
        this._showFrameworkListenersSetting, Common.UIString('Resolve event listeners bound with framework')));

    UI.context.addFlavorChangeListener(SDK.DOMNode, this.update, this);
    this.update();
  }

  /**
   * @override
   * @protected
   * @return {!Promise.<?>}
   */
  doUpdate() {
    if (this._lastRequestedNode) {
      this._lastRequestedNode.domModel().runtimeModel().releaseObjectGroup(
          Elements.EventListenersWidget._objectGroupName);
      delete this._lastRequestedNode;
    }
    var node = UI.context.flavor(SDK.DOMNode);
    if (!node) {
      this._eventListenersView.reset();
      this._eventListenersView.addEmptyHolderIfNeeded();
      return Promise.resolve();
    }
    this._lastRequestedNode = node;
    var selectedNodeOnly = !this._showForAncestorsSetting.get();
    var promises = [];
    promises.push(node.resolveToObject(Elements.EventListenersWidget._objectGroupName));
    if (!selectedNodeOnly) {
      var currentNode = node.parentNode;
      while (currentNode) {
        promises.push(currentNode.resolveToObject(Elements.EventListenersWidget._objectGroupName));
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
   * @return {!Array<!UI.ToolbarItem>}
   */
  toolbarItems() {
    return this._toolbarItems;
  }

  /**
   * @param {!Event} event
   */
  _onDispatchFilterTypeChanged(event) {
    this._dispatchFilterBySetting.set(event.target.value);
  }

  _showFrameworkListenersChanged() {
    var dispatchFilter = this._dispatchFilterBySetting.get();
    var showPassive = dispatchFilter === Elements.EventListenersWidget.DispatchFilterBy.All ||
        dispatchFilter === Elements.EventListenersWidget.DispatchFilterBy.Passive;
    var showBlocking = dispatchFilter === Elements.EventListenersWidget.DispatchFilterBy.All ||
        dispatchFilter === Elements.EventListenersWidget.DispatchFilterBy.Blocking;
    this._eventListenersView.showFrameworkListeners(
        this._showFrameworkListenersSetting.get(), showPassive, showBlocking);
  }

  /**
   * @param {!SDK.DOMNode} node
   * @return {!Promise<!SDK.RemoteObject>}
   */
  _windowObjectInNodeContext(node) {
    return new Promise(windowObjectInNodeContext);

    /**
     * @param {function(?)} fulfill
     * @param {function(*)} reject
     */
    function windowObjectInNodeContext(fulfill, reject) {
      var executionContexts = node.domModel().runtimeModel().executionContexts();
      var context = null;
      if (node.frameId()) {
        for (var i = 0; i < executionContexts.length; ++i) {
          var executionContext = executionContexts[i];
          if (executionContext.frameId === node.frameId() && executionContext.isDefault)
            context = executionContext;
        }
      } else {
        context = executionContexts[0];
      }
      context.evaluate(
          'self', Elements.EventListenersWidget._objectGroupName, false, true, false, false, false, fulfill);
    }
  }

  _eventListenersArrivedForTest() {
  }
};

Elements.EventListenersWidget.DispatchFilterBy = {
  All: 'All',
  Blocking: 'Blocking',
  Passive: 'Passive'
};

Elements.EventListenersWidget._objectGroupName = 'event-listeners-panel';

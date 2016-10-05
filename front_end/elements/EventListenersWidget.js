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
 * @constructor
 * @extends {WebInspector.ThrottledWidget}
 * @implements {WebInspector.ToolbarItem.ItemsProvider}
 */
WebInspector.EventListenersWidget = function()
{
    WebInspector.ThrottledWidget.call(this);
    this.element.classList.add("events-pane");
    this._toolbarItems = [];

    this._showForAncestorsSetting = WebInspector.settings.moduleSetting("showEventListenersForAncestors");
    this._showForAncestorsSetting.addChangeListener(this.update.bind(this));

    this._dispatchFilterBySetting = WebInspector.settings.createSetting("eventListenerDispatchFilterType", WebInspector.EventListenersWidget.DispatchFilterBy.All);
    this._dispatchFilterBySetting.addChangeListener(this.update.bind(this));

    this._showFrameworkListenersSetting = WebInspector.settings.createSetting("showFrameowkrListeners", true);
    this._showFrameworkListenersSetting.addChangeListener(this._showFrameworkListenersChanged.bind(this));
    this._eventListenersView = new WebInspector.EventListenersView(this.element, this.update.bind(this));

    var refreshButton = new WebInspector.ToolbarButton(WebInspector.UIString("Refresh"), "refresh-toolbar-item");
    refreshButton.addEventListener("click", this.update.bind(this));
    this._toolbarItems.push(refreshButton);
    this._toolbarItems.push(new WebInspector.ToolbarCheckbox(WebInspector.UIString("Ancestors"), WebInspector.UIString("Show listeners on the ancestors"), this._showForAncestorsSetting));
    var dispatchFilter = new WebInspector.ToolbarComboBox(this._onDispatchFilterTypeChanged.bind(this));

    /**
     * @param {string} name
     * @param {string} value
     * @this {WebInspector.EventListenersWidget}
     */
    function addDispatchFilterOption(name, value)
    {
        var option = dispatchFilter.createOption(name, "", value);
        if (value === this._dispatchFilterBySetting.get())
            dispatchFilter.select(option);
    }
    addDispatchFilterOption.call(this, WebInspector.UIString("All"), WebInspector.EventListenersWidget.DispatchFilterBy.All);
    addDispatchFilterOption.call(this, WebInspector.UIString("Passive"), WebInspector.EventListenersWidget.DispatchFilterBy.Passive);
    addDispatchFilterOption.call(this, WebInspector.UIString("Blocking"), WebInspector.EventListenersWidget.DispatchFilterBy.Blocking);
    dispatchFilter.setMaxWidth(200);
    this._toolbarItems.push(dispatchFilter);
    this._toolbarItems.push(new WebInspector.ToolbarCheckbox(WebInspector.UIString("Framework listeners"), WebInspector.UIString("Resolve event listeners bound with framework"), this._showFrameworkListenersSetting));

    WebInspector.context.addFlavorChangeListener(WebInspector.DOMNode, this.update, this);
    this.update();
};

WebInspector.EventListenersWidget.DispatchFilterBy = {
    All : "All",
    Blocking : "Blocking",
    Passive : "Passive"
};

WebInspector.EventListenersWidget._objectGroupName = "event-listeners-panel";

WebInspector.EventListenersWidget.prototype = {
    /**
     * @override
     * @protected
     * @return {!Promise.<?>}
     */
    doUpdate: function()
    {
        if (this._lastRequestedNode) {
            this._lastRequestedNode.target().runtimeAgent().releaseObjectGroup(WebInspector.EventListenersWidget._objectGroupName);
            delete this._lastRequestedNode;
        }
        var node = WebInspector.context.flavor(WebInspector.DOMNode);
        if (!node) {
            this._eventListenersView.reset();
            this._eventListenersView.addEmptyHolderIfNeeded();
            return Promise.resolve();
        }
        this._lastRequestedNode = node;
        var selectedNodeOnly = !this._showForAncestorsSetting.get();
        var promises = [];
        var listenersView = this._eventListenersView;
        promises.push(node.resolveToObjectPromise(WebInspector.EventListenersWidget._objectGroupName));
        if (!selectedNodeOnly) {
            var currentNode = node.parentNode;
            while (currentNode) {
                promises.push(currentNode.resolveToObjectPromise(WebInspector.EventListenersWidget._objectGroupName));
                currentNode = currentNode.parentNode;
            }
            promises.push(this._windowObjectInNodeContext(node));
        }
        return Promise.all(promises).then(this._eventListenersView.addObjects.bind(this._eventListenersView)).then(this._showFrameworkListenersChanged.bind(this));
    },

    /**
     * @override
     * @return {!Array<!WebInspector.ToolbarItem>}
     */
    toolbarItems: function()
    {
        return this._toolbarItems;
    },

    /**
     * @param {!Event} event
     */
    _onDispatchFilterTypeChanged: function(event)
    {
        this._dispatchFilterBySetting.set(event.target.value);
    },

    _showFrameworkListenersChanged: function()
    {
        var dispatchFilter = this._dispatchFilterBySetting.get();
        var showPassive = dispatchFilter === WebInspector.EventListenersWidget.DispatchFilterBy.All || dispatchFilter === WebInspector.EventListenersWidget.DispatchFilterBy.Passive;
        var showBlocking = dispatchFilter === WebInspector.EventListenersWidget.DispatchFilterBy.All || dispatchFilter === WebInspector.EventListenersWidget.DispatchFilterBy.Blocking;
        this._eventListenersView.showFrameworkListeners(this._showFrameworkListenersSetting.get(), showPassive, showBlocking);
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {!Promise<!WebInspector.RemoteObject>}
     */
    _windowObjectInNodeContext: function(node)
    {
        return new Promise(windowObjectInNodeContext);

        /**
         * @param {function(?)} fulfill
         * @param {function(*)} reject
         */
        function windowObjectInNodeContext(fulfill, reject)
        {
            var executionContexts = node.target().runtimeModel.executionContexts();
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
            context.evaluate("self", WebInspector.EventListenersWidget._objectGroupName, false, true, false, false, false, fulfill);
        }
    },

    _eventListenersArrivedForTest: function()
    {
    },

    __proto__: WebInspector.ThrottledWidget.prototype
};

// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.ToolbarItem.ItemsProvider}
 */
WebInspector.ObjectEventListenersSidebarPane = function()
{
    WebInspector.VBox.call(this);
    this.element.classList.add("event-listeners-sidebar-pane");

    this._refreshButton = new WebInspector.ToolbarButton(WebInspector.UIString("Refresh"), "refresh-toolbar-item");
    this._refreshButton.addEventListener("click", this._refreshClick.bind(this));
    this._refreshButton.setEnabled(false);

    this._eventListenersView = new WebInspector.EventListenersView(this.element, this.update.bind(this));
};

WebInspector.ObjectEventListenersSidebarPane._objectGroupName = "object-event-listeners-sidebar-pane";

WebInspector.ObjectEventListenersSidebarPane.prototype = {
    /**
     * @override
     * @return {!Array<!WebInspector.ToolbarItem>}
     */
    toolbarItems: function()
    {
        return [this._refreshButton];
    },

    update: function()
    {
        if (this._lastRequestedContext) {
            this._lastRequestedContext.target().runtimeAgent().releaseObjectGroup(WebInspector.ObjectEventListenersSidebarPane._objectGroupName);
            delete this._lastRequestedContext;
        }
        var executionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
        if (!executionContext) {
            this._eventListenersView.reset();
            this._eventListenersView.addEmptyHolderIfNeeded();
            return;
        }
        this._lastRequestedContext = executionContext;
        Promise.all([this._windowObjectInContext(executionContext)]).then(this._eventListenersView.addObjects.bind(this._eventListenersView));
    },

    wasShown: function()
    {
        WebInspector.VBox.prototype.wasShown.call(this);
        WebInspector.context.addFlavorChangeListener(WebInspector.ExecutionContext, this.update, this);
        this._refreshButton.setEnabled(true);
        this.update();
    },

    willHide: function()
    {
        WebInspector.VBox.prototype.willHide.call(this);
        WebInspector.context.removeFlavorChangeListener(WebInspector.ExecutionContext, this.update, this);
        this._refreshButton.setEnabled(false);
    },

    /**
     * @param {!WebInspector.ExecutionContext} executionContext
     * @return {!Promise<!WebInspector.RemoteObject>} object
     */
    _windowObjectInContext: function(executionContext)
    {
        return new Promise(windowObjectInContext);
        /**
         * @param {function(?)} fulfill
         * @param {function(*)} reject
         */
        function windowObjectInContext(fulfill, reject)
        {
            executionContext.evaluate("self", WebInspector.ObjectEventListenersSidebarPane._objectGroupName, false, true, false, false, false, mycallback);
            /**
             * @param {?WebInspector.RemoteObject} object
             */
            function mycallback(object)
            {
                if (object)
                    fulfill(object);
                else
                    reject(null);
            }
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _refreshClick: function(event)
    {
        event.consume();
        this.update();
    },

    __proto__: WebInspector.VBox.prototype
};

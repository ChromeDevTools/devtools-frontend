// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.ActionRegistry = function()
{
    /** @type {!Map.<string, !WebInspector.Action>} */
    this._actionsById = new Map();
    this._registerActions();
}

WebInspector.ActionRegistry.prototype = {
    _registerActions: function()
    {
        self.runtime.extensions(WebInspector.ActionDelegate).forEach(registerExtension, this);

        /**
         * @param {!Runtime.Extension} extension
         * @this {WebInspector.ActionRegistry}
         */
        function registerExtension(extension)
        {
            var actionId = extension.descriptor()["actionId"];
            console.assert(actionId);
            console.assert(!this._actionsById.get(actionId));
            this._actionsById.set(actionId, new WebInspector.Action(extension));
        }
    },

    /**
     * @param {!Array.<string>} actionIds
     * @param {!WebInspector.Context} context
     * @return {!Array.<!WebInspector.Action>}
     */
    applicableActions: function(actionIds, context)
    {
        var extensions = [];
        actionIds.forEach(function(actionId) {
           var action = this._actionsById.get(actionId);
           if (action)
               extensions.push(action._extension);
        }, this);
        return context.applicableExtensions(extensions).valuesArray().map(extensionToAction.bind(this));

        /**
         * @param {!Runtime.Extension} extension
         * @return {!WebInspector.Action}
         * @this {WebInspector.ActionRegistry}
         */
        function extensionToAction(extension)
        {
            return this.getAction(extension.descriptor()["actionId"]);
        }
    },

    /**
     * @param {string} actionId
     * @return {!WebInspector.Action}
     */
    getAction: function(actionId)
    {
        var action = this._actionsById.get(actionId);
        console.assert(action, "No action found for actionId '" + actionId + "'");
        return /** @type {!WebInspector.Action} */ (action);
    }
}

/**
 * @constructor
 */
WebInspector.Action = function(extension)
{
    this._extension = extension
}

WebInspector.Action.prototype = {
    /**
     * @return {!Promise.<boolean>}
     */
    execute: function()
    {
        return this._extension.instancePromise().then(handleAction.bind(this));

        /**
         * @param {!Object} actionDelegate
         * @return {boolean}
         * @this {WebInspector.Action}
         */
        function handleAction(actionDelegate)
        {
            var actionId = this._extension.descriptor()["actionId"];
            var delegate = /** @type {!WebInspector.ActionDelegate} */(actionDelegate);
            return delegate.handleAction(WebInspector.context, actionId);
        }
    },

    /**
     * @return {string}
     */
    actionTitle: function()
    {
        return this._extension.descriptor()["title"] || "";
    },

    /**
     * @return {string}
     */
    actionIcon: function()
    {
        return this._extension.descriptor()["iconClass"] || "";
    }
}

/**
 * @interface
 */
WebInspector.ActionDelegate = function()
{
}

WebInspector.ActionDelegate.prototype = {
    /**
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId) {}
}

/** @type {!WebInspector.ActionRegistry} */
WebInspector.actionRegistry;

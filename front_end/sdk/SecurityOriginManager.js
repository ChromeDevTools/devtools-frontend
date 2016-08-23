// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.SDKModel}
 * @param {!WebInspector.Target} target
 */
WebInspector.SecurityOriginManager = function(target)
{
    WebInspector.SDKModel.call(this, WebInspector.SecurityOriginManager, target);

    this._securityOriginCounter = new Map();
    this._mainSecurityOrigin = "";
}

/** @enum {symbol} */
WebInspector.SecurityOriginManager.Events = {
    SecurityOriginAdded: Symbol("SecurityOriginAdded"),
    SecurityOriginRemoved: Symbol("SecurityOriginRemoved"),
    MainSecurityOriginChanged: Symbol("MainSecurityOriginChanged")
}

/**
 * @param {!WebInspector.Target} target
 * @return {!WebInspector.SecurityOriginManager}
 */
WebInspector.SecurityOriginManager.fromTarget = function(target)
{
    var securityOriginManager = /** @type {?WebInspector.SecurityOriginManager} */ (target.model(WebInspector.SecurityOriginManager));
    if (!securityOriginManager)
        securityOriginManager = new WebInspector.SecurityOriginManager(target);
    return securityOriginManager;
}

WebInspector.SecurityOriginManager.prototype = {
    /**
     * @param {string} securityOrigin
     */
    addSecurityOrigin: function(securityOrigin)
    {
        var currentCount = this._securityOriginCounter.get(securityOrigin);
        if (!currentCount) {
            this._securityOriginCounter.set(securityOrigin, 1);
            this.dispatchEventToListeners(WebInspector.SecurityOriginManager.Events.SecurityOriginAdded, securityOrigin);
            return;
        }
        this._securityOriginCounter.set(securityOrigin, currentCount + 1);
    },

    /**
     * @param {string} securityOrigin
     */
    removeSecurityOrigin: function(securityOrigin)
    {
        var currentCount = this._securityOriginCounter.get(securityOrigin);
        if (currentCount === 1) {
            this._securityOriginCounter.delete(securityOrigin);
            this.dispatchEventToListeners(WebInspector.SecurityOriginManager.Events.SecurityOriginRemoved, securityOrigin);
            return;
        }
        this._securityOriginCounter.set(securityOrigin, currentCount - 1);
    },

    /**
     * @return {!Array<string>}
     */
    securityOrigins: function()
    {
        return this._securityOriginCounter.keysArray();
    },

    /**
     * @return {string}
     */
    mainSecurityOrigin: function()
    {
        return this._mainSecurityOrigin;
    },

    /**
     * @param {string} securityOrigin
     */
    setMainSecurityOrigin: function(securityOrigin)
    {
        this._mainSecurityOrigin = securityOrigin;
        this.dispatchEventToListeners(WebInspector.SecurityOriginManager.Events.MainSecurityOriginChanged, securityOrigin);
    },

    __proto__: WebInspector.SDKModel.prototype
}

// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {Service}
 */
function Audits2Service(notify)
{
    this._notify = notify;
}

Audits2Service.prototype = {
    /**
     * @return {!Promise}
     */
    start: function()
    {
        console.error("************ WORKER START *****************");
        this._notify("sendProtocolMessage", {message: JSON.stringify({id: 1, method: "Page.enable"})});
        this._notify("sendProtocolMessage", {message: JSON.stringify({id: 2, method: "Runtime.enable"})});
        this._notify("sendProtocolMessage", {message: JSON.stringify({id: 3, method: "Page.reload"})});
        return Promise.resolve();
    },

    /**
     * @return {!Promise}
     */
    stop: function()
    {
        console.error("************ WORKER STOP *****************");
        return Promise.resolve();
    },

    /**
     * @param {!Object=} params
     * @return {!Promise}
     */
    dispatchProtocolMessage: function(params)
    {
        console.error("message: " + JSON.stringify(params));
        return Promise.resolve();
    },

    /**
     * @override
     * @return {!Promise}
     */
    dispose: function()
    {
        console.error("************ WORKER DISPOSE *****************");
        return Promise.resolve();
    }
}

initializeWorkerService("Audits2Service", Audits2Service);

// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.Panel}
 */
WebInspector.Audits2Panel = function()
{
    WebInspector.Panel.call(this, "audits2");
    this.contentElement.classList.add("vbox");
    this.contentElement.appendChild(createTextButton(WebInspector.UIString("Start"), this._start.bind(this)));
    this.contentElement.appendChild(createTextButton(WebInspector.UIString("Stop"), this._stop.bind(this)));
    this._resultElement = this.contentElement.createChild("div", "overflow-auto");
};

WebInspector.Audits2Panel.prototype = {
    _start: function()
    {
        WebInspector.targetManager.interceptMainConnection(this._dispatchProtocolMessage.bind(this)).then(rawConnection => {
            this._rawConnection = rawConnection;
            this._send("start").then(result => {
                var section = new WebInspector.ObjectPropertiesSection(WebInspector.RemoteObject.fromLocalObject(result), WebInspector.UIString("Audit Results"));
                this._resultElement.appendChild(section.element);
                this._stop();
            });
        });
    },

    /**
     * @param {string} message
     */
    _dispatchProtocolMessage: function(message)
    {
        this._send("dispatchProtocolMessage", {message: message});
    },

    _stop: function()
    {
        this._send("stop").then(() => {
            this._rawConnection.disconnect();
            this._backend.dispose();
            delete this._backend;
            delete this._backendPromise;
        });
    },

    /**
     * @param {string} method
     * @param {!Object=} params
     * @return {!Promise<!Object|undefined>}
     */
    _send: function(method, params)
    {
        if (!this._backendPromise) {
            this._backendPromise = WebInspector.serviceManager.createAppService("audits2_worker", "Audits2Service", false).then(backend => {
                this._backend = backend;
                this._backend.on("sendProtocolMessage", result => this._rawConnection.sendMessage(result.message));
            });
        }
        return this._backendPromise.then(() => this._backend ? this._backend.send(method, params) : undefined);
    },

    __proto__: WebInspector.Panel.prototype
};

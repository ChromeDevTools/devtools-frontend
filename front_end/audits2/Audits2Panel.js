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
}

WebInspector.Audits2Panel.prototype = {
    _start: function()
    {
        this._backend().then(backend => backend ? backend.send("start") : undefined).then(console.error.bind(console, "STARTED"));
    },

    _stop: function()
    {
        this._backend().then(backend => backend ? backend.send("stop") : undefined).then(console.error.bind(console, "STOPPED"));
    },

    /**
     * @return {!Promise<?WebInspector.ServiceManager.Service>}
     */
    _backend: function()
    {
        if (!this._backendPromise)
            this._backendPromise = WebInspector.serviceManager.createAppService("audits2_worker", "Audits2Service", false);
        return this._backendPromise;
    },

    __proto__: WebInspector.Panel.prototype
}

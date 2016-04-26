/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @param {string} appName
 * @param {string=} workerName
 */
WebInspector.Worker = function(appName, workerName)
{
    var isSharedWorker = !!workerName;

    var url = appName + ".js";
    var remoteBase = Runtime.queryParam("remoteBase");
    if (remoteBase)
        url += "?remoteBase=" + remoteBase;

    /** @type {!Worker|!SharedWorker} */
    var worker;
    var callback;
    try {
        if (isSharedWorker) {
            worker = new SharedWorker(url, workerName);
            worker.port.onmessage = onMessage;
        } else {
            worker = new Worker(url);
            worker.onmessage = onMessage;
        }
    } catch(e) {
        return Promise.reject(e);
    }

    /**
     * @param {!Event} event
     */
    function onMessage(event)
    {
        console.assert(event.data === "workerReady");
        if (isSharedWorker)
            worker.port.onmessage = null;
        else
            worker.onmessage = null;
        callback(worker);
    }

    /** @type {!Promise<!Worker|!SharedWorker>} */
    this._workerPromise = new Promise(fulfill => callback = fulfill);
}

WebInspector.Worker.prototype = {
    /**
     * @param {*} message
     */
    postMessage: function(message)
    {
        this._workerPromise.then(postToWorker.bind(this));

        /**
         * @param {!Worker|!SharedWorker} worker
         * @this {WebInspector.Worker}
         */
        function postToWorker(worker)
        {
            if (!this._disposed)
                worker.postMessage(message);
        }
    },

    dispose: function()
    {
        this._disposed = true;
        this._workerPromise.then(terminate);

        /**
         * @param {!Worker|!SharedWorker} worker
         */
        function terminate(worker)
        {
            worker.terminate();
        }
    },

    terminate: function()
    {
        this.dispose();
    },

    /**
     * @param {?function(!MessageEvent.<*>)} listener
     */
    set onmessage(listener)
    {
        this._workerPromise.then(setOnMessage);

        /**
         * @param {!Worker|!SharedWorker} worker
         */
        function setOnMessage(worker)
        {
            if (worker.port)
                worker.port.onmessage = listener;
            else
                worker.onmessage = listener;
        }
    },

    /**
     * @param {?function(!Event)} listener
     */
    set onerror(listener)
    {
        this._workerPromise.then(setOnError);

        /**
         * @param {!Worker|!SharedWorker} worker
         */
        function setOnError(worker)
        {
            if (worker.port)
                worker.port.onerror = listener;
            else
                worker.onerror = listener;
        }
    }
}

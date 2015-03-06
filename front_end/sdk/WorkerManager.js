/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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
 * @extends {WebInspector.Object}
 * @param {!WebInspector.Target} target
 * @param {boolean} isMainFrontend
 */
WebInspector.WorkerManager = function(target, isMainFrontend)
{
    target.registerWorkerDispatcher(new WebInspector.WorkerDispatcher(this));
    if (isMainFrontend) {
        target.workerAgent().enable();
        target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated, this._mainFrameNavigated, this);
    }
}

WebInspector.WorkerManager.Events = {
    WorkerAdded: "WorkerAdded",
    WorkerRemoved: "WorkerRemoved",
    WorkersCleared: "WorkersCleared",
    WorkerDisconnected: "WorkerDisconnected",
    MessageFromWorker: "MessageFromWorker",
}

WebInspector.WorkerManager.prototype = {

    /**
     * @param {string} workerId
     * @param {string} url
     * @param {boolean} inspectorConnected
     */
    _workerCreated: function(workerId, url, inspectorConnected)
    {
        this.dispatchEventToListeners(WebInspector.WorkerManager.Events.WorkerAdded, {workerId: workerId, url: url, inspectorConnected: inspectorConnected});
     },

    /**
     * @param {string} workerId
     */
    _workerTerminated: function(workerId)
    {
        this.dispatchEventToListeners(WebInspector.WorkerManager.Events.WorkerRemoved, workerId);
    },

    /**
     * @param {string} workerId
     * @param {string} message
     */
    _dispatchMessageFromWorker: function(workerId, message)
    {
        this.dispatchEventToListeners(WebInspector.WorkerManager.Events.MessageFromWorker, {workerId: workerId, message: message});
    },

    _disconnectedFromWorker: function()
    {
        this.dispatchEventToListeners(WebInspector.WorkerManager.Events.WorkerDisconnected);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _mainFrameNavigated: function(event)
    {
        this.dispatchEventToListeners(WebInspector.WorkerManager.Events.WorkersCleared);
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @implements {WorkerAgent.Dispatcher}
 */
WebInspector.WorkerDispatcher = function(workerManager)
{
    this._workerManager = workerManager;
}

WebInspector.WorkerDispatcher.prototype = {
    /**
     * @override
     * @param {string} workerId
     * @param {string} url
     * @param {boolean} inspectorConnected
     */
    workerCreated: function(workerId, url, inspectorConnected)
    {
        this._workerManager._workerCreated(workerId, url, inspectorConnected);
    },

    /**
     * @override
     * @param {string} workerId
     */
    workerTerminated: function(workerId)
    {
        this._workerManager._workerTerminated(workerId);
    },

    /**
     * @override
     * @param {string} workerId
     * @param {string} message
     */
    dispatchMessageFromWorker: function(workerId, message)
    {
        this._workerManager._dispatchMessageFromWorker(workerId, message);
    },

    /**
     * @override
     */
    disconnectedFromWorker: function()
    {
        this._workerManager._disconnectedFromWorker();
    }
}

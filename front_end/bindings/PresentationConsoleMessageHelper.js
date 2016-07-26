/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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
 * @param {!WebInspector.Workspace} workspace
 */
WebInspector.PresentationConsoleMessageHelper = function(workspace)
{
    this._workspace = workspace;

    /** @type {!Object.<string, !Array.<!WebInspector.ConsoleMessage>>} */
    this._pendingConsoleMessages = {};

    /** @type {!Array.<!WebInspector.PresentationConsoleMessage>} */
    this._presentationConsoleMessages = [];

    WebInspector.multitargetConsoleModel.addEventListener(WebInspector.ConsoleModel.Events.ConsoleCleared, this._consoleCleared, this);
    WebInspector.multitargetConsoleModel.addEventListener(WebInspector.ConsoleModel.Events.MessageAdded, this._onConsoleMessageAdded, this);
    WebInspector.multitargetConsoleModel.messages().forEach(this._consoleMessageAdded, this);
    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.ParsedScriptSource, this._parsedScriptSource, this);
    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.FailedToParseScriptSource, this._parsedScriptSource, this);
    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._debuggerReset, this);

    this._locationPool = new WebInspector.LiveLocationPool();
}

WebInspector.PresentationConsoleMessageHelper.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _onConsoleMessageAdded: function(event)
    {
        var message = /** @type {!WebInspector.ConsoleMessage} */ (event.data);
        this._consoleMessageAdded(message);
    },

    /**
     * @param {!WebInspector.ConsoleMessage} message
     */
    _consoleMessageAdded: function(message)
    {
        if (!message.isErrorOrWarning())
            return;

        var rawLocation = this._rawLocation(message);
        if (rawLocation)
            this._addConsoleMessageToScript(message, rawLocation);
        else
            this._addPendingConsoleMessage(message);
    },

    /**
     * @param {!WebInspector.ConsoleMessage} message
     * @return {?WebInspector.DebuggerModel.Location}
     */
    _rawLocation: function(message)
    {
        var debuggerModel = WebInspector.DebuggerModel.fromTarget(message.target());
        if (!debuggerModel)
            return null;
        if (message.scriptId)
            return debuggerModel.createRawLocationByScriptId(message.scriptId, message.line, message.column);
        var callFrame = message.stackTrace && message.stackTrace.callFrames ? message.stackTrace.callFrames[0] : null;
        if (callFrame)
            return debuggerModel.createRawLocationByScriptId(callFrame.scriptId, callFrame.lineNumber, callFrame.columnNumber);
        if (message.url)
            return debuggerModel.createRawLocationByURL(message.url, message.line, message.column);
        return null;
    },

    /**
     * @param {!WebInspector.ConsoleMessage} message
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     */
    _addConsoleMessageToScript: function(message, rawLocation)
    {
        this._presentationConsoleMessages.push(new WebInspector.PresentationConsoleMessage(message, rawLocation, this._locationPool));
    },

    /**
     * @param {!WebInspector.ConsoleMessage} message
     */
    _addPendingConsoleMessage: function(message)
    {
        if (!message.url)
            return;
        if (!this._pendingConsoleMessages[message.url])
            this._pendingConsoleMessages[message.url] = [];
        this._pendingConsoleMessages[message.url].push(message);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _parsedScriptSource: function(event)
    {
        var script = /** @type {!WebInspector.Script} */ (event.data);

        var messages = this._pendingConsoleMessages[script.sourceURL];
        if (!messages)
            return;

        var pendingMessages = [];
        for (var i = 0; i < messages.length; i++) {
            var message = messages[i];
            var rawLocation = this._rawLocation(message);
            if (!rawLocation)
                continue;
            if (script.target() === message.target() && script.scriptId === rawLocation.scriptId)
                this._addConsoleMessageToScript(message, rawLocation);
            else
                pendingMessages.push(message);
        }

        if (pendingMessages.length)
            this._pendingConsoleMessages[script.sourceURL] = pendingMessages;
        else
            delete this._pendingConsoleMessages[script.sourceURL];
    },

    _consoleCleared: function()
    {
        this._pendingConsoleMessages = {};
        for (var i = 0; i < this._presentationConsoleMessages.length; ++i)
            this._presentationConsoleMessages[i].dispose();
        this._presentationConsoleMessages = [];
        this._locationPool.disposeAll();
    },

    _debuggerReset: function()
    {
        this._consoleCleared();
    }
}

/**
 * @constructor
 * @param {!WebInspector.ConsoleMessage} message
 * @param {!WebInspector.DebuggerModel.Location} rawLocation
 * @param {!WebInspector.LiveLocationPool} locationPool
 */
WebInspector.PresentationConsoleMessage = function(message, rawLocation, locationPool)
{
    this._text = message.messageText;
    this._level = message.level === WebInspector.ConsoleMessage.MessageLevel.Error ? WebInspector.UISourceCode.Message.Level.Error : WebInspector.UISourceCode.Message.Level.Warning;
    WebInspector.debuggerWorkspaceBinding.createLiveLocation(rawLocation, this._updateLocation.bind(this), locationPool);
}

WebInspector.PresentationConsoleMessage.prototype = {
    /**
     * @param {!WebInspector.LiveLocation} liveLocation
     */
    _updateLocation: function(liveLocation)
    {
        if (this._uiMessage)
            this._uiMessage.remove();
        var uiLocation = liveLocation.uiLocation();
        if (!uiLocation)
            return;
        this._uiMessage = uiLocation.uiSourceCode.addLineMessage(this._level, this._text, uiLocation.lineNumber, uiLocation.columnNumber);
    },

    dispose: function()
    {
        if (this._uiMessage)
            this._uiMessage.remove();
    }
}

/** @type {!WebInspector.PresentationConsoleMessageHelper} */
WebInspector.presentationConsoleMessageHelper;

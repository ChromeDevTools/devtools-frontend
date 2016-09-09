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
 * @extends {WebInspector.SDKModel}
 * @param {!WebInspector.Target} target
 */
WebInspector.RuntimeModel = function(target)
{
    WebInspector.SDKModel.call(this, WebInspector.RuntimeModel, target);

    this._agent = target.runtimeAgent();
    this.target().registerRuntimeDispatcher(new WebInspector.RuntimeDispatcher(this));
    if (target.hasJSCapability())
        this._agent.enable();
    /** @type {!Map<number, !WebInspector.ExecutionContext>} */
    this._executionContextById = new Map();
    this._executionContextComparator = WebInspector.ExecutionContext.comparator;

    if (WebInspector.moduleSetting("customFormatters").get())
        this._agent.setCustomObjectFormatterEnabled(true);

    WebInspector.moduleSetting("customFormatters").addChangeListener(this._customFormattersStateChanged.bind(this));
}

/** @enum {symbol} */
WebInspector.RuntimeModel.Events = {
    ExecutionContextCreated: Symbol("ExecutionContextCreated"),
    ExecutionContextDestroyed: Symbol("ExecutionContextDestroyed"),
    ExecutionContextChanged: Symbol("ExecutionContextChanged"),
    ExecutionContextOrderChanged: Symbol("ExecutionContextOrderChanged")
}

WebInspector.RuntimeModel._privateScript = "private script";

WebInspector.RuntimeModel.prototype = {

    /**
     * @return {!Array.<!WebInspector.ExecutionContext>}
     */
    executionContexts: function()
    {
        return this._executionContextById.valuesArray().sort(this.executionContextComparator());
    },

    /**
     * @param {function(!WebInspector.ExecutionContext,!WebInspector.ExecutionContext)} comparator
     */
    setExecutionContextComparator: function(comparator)
    {
        this._executionContextComparator = comparator;
    },

    /**
     * @return {function(!WebInspector.ExecutionContext,!WebInspector.ExecutionContext)} comparator
     */
    executionContextComparator: function()
    {
        return this._executionContextComparator;
    },

    /**
     * @return {?WebInspector.ExecutionContext}
     */
    defaultExecutionContext: function()
    {
        for (var context of this._executionContextById.values()) {
            if (context.isDefault)
                return context;
        }
        return null;
    },

    /**
     * @param {!RuntimeAgent.ExecutionContextId} id
     * @return {?WebInspector.ExecutionContext}
     */
    executionContext: function(id)
    {
        return this._executionContextById.get(id) || null;
    },

    /**
     * @param {!RuntimeAgent.ExecutionContextDescription} context
     */
    _executionContextCreated: function(context)
    {
        // The private script context should be hidden behind an experiment.
        if (context.name === WebInspector.RuntimeModel._privateScript && !context.origin && !Runtime.experiments.isEnabled("privateScriptInspection")) {
            return;
        }
        var data = context.auxData || { isDefault: true };
        var executionContext = new WebInspector.ExecutionContext(this.target(), context.id, context.name, context.origin, data["isDefault"], data["frameId"]);
        this._executionContextById.set(executionContext.id, executionContext);
        this.dispatchEventToListeners(WebInspector.RuntimeModel.Events.ExecutionContextCreated, executionContext);
    },

    /**
     * @param {number} executionContextId
     */
    _executionContextDestroyed: function(executionContextId)
    {
        var executionContext = this._executionContextById.get(executionContextId);
        if (!executionContext)
            return;
        this._executionContextById.delete(executionContextId);
        this.dispatchEventToListeners(WebInspector.RuntimeModel.Events.ExecutionContextDestroyed, executionContext);
    },

    fireExecutionContextOrderChanged: function()
    {
        this.dispatchEventToListeners(WebInspector.RuntimeModel.Events.ExecutionContextOrderChanged, this);
    },

    _executionContextsCleared: function()
    {
        var debuggerModel = WebInspector.DebuggerModel.fromTarget(this.target());
        if (debuggerModel)
            debuggerModel.globalObjectCleared();
        var contexts = this.executionContexts();
        this._executionContextById.clear();
        for (var  i = 0; i < contexts.length; ++i)
            this.dispatchEventToListeners(WebInspector.RuntimeModel.Events.ExecutionContextDestroyed, contexts[i]);
    },

    /**
     * @param {!RuntimeAgent.RemoteObject} payload
     * @return {!WebInspector.RemoteObject}
     */
    createRemoteObject: function(payload)
    {
        console.assert(typeof payload === "object", "Remote object payload should only be an object");
        return new WebInspector.RemoteObjectImpl(this.target(), payload.objectId, payload.type, payload.subtype, payload.value, payload.unserializableValue, payload.description, payload.preview, payload.customPreview);
    },

    /**
     * @param {!RuntimeAgent.RemoteObject} payload
     * @param {!WebInspector.ScopeRef} scopeRef
     * @return {!WebInspector.RemoteObject}
     */
    createScopeRemoteObject: function(payload, scopeRef)
    {
        return new WebInspector.ScopeRemoteObject(this.target(), payload.objectId, scopeRef, payload.type, payload.subtype, payload.value, payload.unserializableValue, payload.description, payload.preview);
    },

    /**
     * @param {number|string|boolean|undefined} value
     * @return {!WebInspector.RemoteObject}
     */
    createRemoteObjectFromPrimitiveValue: function(value)
    {
        var type = typeof value;
        var unserializableValue = undefined;
        if (typeof value === "number") {
            var description = String(value);
            if (value === 0 && 1 / value < 0)
                unserializableValue = RuntimeAgent.UnserializableValue.Negative0;
            if (description === "NaN")
                unserializableValue = RuntimeAgent.UnserializableValue.NaN;
            if (description === "Infinity")
                unserializableValue = RuntimeAgent.UnserializableValue.Infinity;
            if (description === "-Infinity")
                unserializableValue = RuntimeAgent.UnserializableValue.NegativeInfinity;
            if (typeof unserializableValue !== "undefined")
                value = undefined;
        }
        return new WebInspector.RemoteObjectImpl(this.target(), undefined, type, undefined, value, unserializableValue);
    },

    /**
     * @param {string} name
     * @param {number|string|boolean} value
     * @return {!WebInspector.RemoteObjectProperty}
     */
    createRemotePropertyFromPrimitiveValue: function(name, value)
    {
        return new WebInspector.RemoteObjectProperty(name, this.createRemoteObjectFromPrimitiveValue(value));
    },

    discardConsoleEntries: function()
    {
        this._agent.discardConsoleEntries();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _customFormattersStateChanged: function(event)
    {
        var enabled = /** @type {boolean} */ (event.data);
        this._agent.setCustomObjectFormatterEnabled(enabled);
    },

    /**
     * @param {string} expression
     * @param {string} sourceURL
     * @param {boolean} persistScript
     * @param {number} executionContextId
     * @param {function(!RuntimeAgent.ScriptId=, ?RuntimeAgent.ExceptionDetails=)=} callback
     */
    compileScript: function(expression, sourceURL, persistScript, executionContextId, callback)
    {
        this._agent.compileScript(expression, sourceURL, persistScript, executionContextId, innerCallback);

        /**
         * @param {?Protocol.Error} error
         * @param {!RuntimeAgent.ScriptId=} scriptId
         * @param {?RuntimeAgent.ExceptionDetails=} exceptionDetails
         */
        function innerCallback(error, scriptId, exceptionDetails)
        {
            if (error) {
                console.error(error);
                return;
            }
            if (callback)
                callback(scriptId, exceptionDetails);
        }
    },

    /**
     * @param {!RuntimeAgent.ScriptId} scriptId
     * @param {number} executionContextId
     * @param {string=} objectGroup
     * @param {boolean=} silent
     * @param {boolean=} includeCommandLineAPI
     * @param {boolean=} returnByValue
     * @param {boolean=} generatePreview
     * @param {boolean=} awaitPromise
     * @param {function(?RuntimeAgent.RemoteObject, ?RuntimeAgent.ExceptionDetails=)=} callback
     */
    runScript: function(scriptId, executionContextId, objectGroup, silent, includeCommandLineAPI, returnByValue, generatePreview, awaitPromise, callback)
    {
        this._agent.runScript(scriptId, executionContextId, objectGroup, silent, includeCommandLineAPI, returnByValue, generatePreview, awaitPromise, innerCallback);

        /**
         * @param {?Protocol.Error} error
         * @param {!RuntimeAgent.RemoteObject} result
         * @param {!RuntimeAgent.ExceptionDetails=} exceptionDetails
         */
        function innerCallback(error, result, exceptionDetails)
        {
            if (error) {
                console.error(error);
                return;
            }
            if (callback)
                callback(result, exceptionDetails);
        }
    },

    /**
     * @param {!RuntimeAgent.RemoteObject} payload
     * @param {!Object=} hints
     */
    _inspectRequested: function(payload, hints)
    {
        var object = this.createRemoteObject(payload);

        if (hints.copyToClipboard) {
            this._copyRequested(object);
            return;
        }

        if (object.isNode()) {
            WebInspector.Revealer.revealPromise(object).then(object.release.bind(object));
            return;
        }

        if (object.type === "function") {
            WebInspector.RemoteFunction.objectAsFunction(object).targetFunctionDetails().then(didGetDetails);
            return;
        }

        /**
         * @param {?WebInspector.DebuggerModel.FunctionDetails} response
         */
        function didGetDetails(response)
        {
            object.release();
            if (!response || !response.location)
                return;
            WebInspector.Revealer.reveal(response.location);
        }
        object.release();
    },

    /**
     * @param {!WebInspector.RemoteObject} object
     */
    _copyRequested: function(object)
    {
        if (!object.objectId) {
            InspectorFrontendHost.copyText(object.value);
            return;
        }
        object.callFunctionJSON(toStringForClipboard, [ { value : object.subtype } ], InspectorFrontendHost.copyText.bind(InspectorFrontendHost));

        /**
         * @param {string} subtype
         * @this {Object}
         * @suppressReceiverCheck
         */
        function toStringForClipboard(subtype)
        {
            if (subtype === "node")
                return this.outerHTML;
            if (subtype && typeof this === "undefined")
                return subtype + "";
            try {
                return JSON.stringify(this, null, "  ");
            } catch (e) {
                return "" + this;
            }
        }
    },

    __proto__: WebInspector.SDKModel.prototype
}

/**
 * @constructor
 * @implements {RuntimeAgent.Dispatcher}
 * @param {!WebInspector.RuntimeModel} runtimeModel
 */
WebInspector.RuntimeDispatcher = function(runtimeModel)
{
    this._runtimeModel = runtimeModel;
}

WebInspector.RuntimeDispatcher.prototype = {
    /**
     * @override
     * @param {!RuntimeAgent.ExecutionContextDescription} context
     */
    executionContextCreated: function(context)
    {
        this._runtimeModel._executionContextCreated(context);
    },

    /**
     * @override
     * @param {!RuntimeAgent.ExecutionContextId} executionContextId
     */
    executionContextDestroyed: function(executionContextId)
    {
        this._runtimeModel._executionContextDestroyed(executionContextId);
    },

    /**
     * @override
     */
    executionContextsCleared: function()
    {
        this._runtimeModel._executionContextsCleared();
    },

    /**
     * @override
     * @param {number} timestamp
     * @param {!RuntimeAgent.ExceptionDetails} exceptionDetails
     */
    exceptionThrown: function(timestamp, exceptionDetails)
    {
        var consoleMessage = WebInspector.ConsoleMessage.fromException(this._runtimeModel.target(), exceptionDetails, undefined, timestamp, undefined);
        consoleMessage.setExceptionId(exceptionDetails.exceptionId);
        this._runtimeModel.target().consoleModel.addMessage(consoleMessage);
    },

    /**
     * @override
     * @param {string} reason
     * @param {number} exceptionId
     */
    exceptionRevoked: function(reason, exceptionId)
    {
        var consoleMessage = new WebInspector.ConsoleMessage(
            this._runtimeModel.target(),
            WebInspector.ConsoleMessage.MessageSource.JS,
            WebInspector.ConsoleMessage.MessageLevel.RevokedError,
            reason,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined);
        consoleMessage.setRevokedExceptionId(exceptionId);
        this._runtimeModel.target().consoleModel.addMessage(consoleMessage);
    },

    /**
     * @override
     * @param {string} type
     * @param {!Array.<!RuntimeAgent.RemoteObject>} args
     * @param {number} executionContextId
     * @param {number} timestamp
     * @param {!RuntimeAgent.StackTrace=} stackTrace
     */
    consoleAPICalled: function(type, args, executionContextId, timestamp, stackTrace)
    {
        var level = WebInspector.ConsoleMessage.MessageLevel.Log;
        if (type === WebInspector.ConsoleMessage.MessageType.Debug)
            level = WebInspector.ConsoleMessage.MessageLevel.Debug;
        if (type === WebInspector.ConsoleMessage.MessageType.Error || type === WebInspector.ConsoleMessage.MessageType.Assert)
            level = WebInspector.ConsoleMessage.MessageLevel.Error;
        if (type === WebInspector.ConsoleMessage.MessageType.Warning)
            level = WebInspector.ConsoleMessage.MessageLevel.Warning;
        if (type === WebInspector.ConsoleMessage.MessageType.Info)
            level = WebInspector.ConsoleMessage.MessageLevel.Info;
        var message = "";
        if (args.length && typeof args[0].value === "string")
            message = args[0].value;
        else if (args.length && args[0].description)
            message = args[0].description;
        var callFrame = stackTrace && stackTrace.callFrames.length ? stackTrace.callFrames[0] : null;
        var consoleMessage = new WebInspector.ConsoleMessage(
            this._runtimeModel.target(),
            WebInspector.ConsoleMessage.MessageSource.ConsoleAPI,
            level,
            /** @type {string} */ (message),
            type,
            callFrame ? callFrame.url : undefined,
            callFrame ? callFrame.lineNumber : undefined,
            callFrame ? callFrame.columnNumber : undefined,
            undefined,
            args,
            stackTrace,
            timestamp,
            executionContextId,
            undefined);
        this._runtimeModel.target().consoleModel.addMessage(consoleMessage);
    },

    /**
     * @override
     * @param {!RuntimeAgent.RemoteObject} payload
     * @param {!Object=} hints
     */
    inspectRequested: function(payload, hints)
    {
        this._runtimeModel._inspectRequested(payload, hints);
    }
}

/**
 * @constructor
 * @extends {WebInspector.SDKObject}
 * @param {!WebInspector.Target} target
 * @param {number} id
 * @param {string} name
 * @param {string} origin
 * @param {boolean} isDefault
 * @param {string=} frameId
 */
WebInspector.ExecutionContext = function(target, id, name, origin, isDefault, frameId)
{
    WebInspector.SDKObject.call(this, target);
    this.id = id;
    this.name = name;
    this.origin = origin;
    this.isDefault = isDefault;
    this.runtimeModel = target.runtimeModel;
    this.debuggerModel = WebInspector.DebuggerModel.fromTarget(target);
    this.frameId = frameId;

    this._label = name;
    var parsedUrl = origin.asParsedURL();
    if (!this._label && parsedUrl)
        this._label = parsedUrl.lastPathComponentWithFragment();
}

/**
 * @param {!WebInspector.ExecutionContext} a
 * @param {!WebInspector.ExecutionContext} b
 * @return {number}
 */
WebInspector.ExecutionContext.comparator = function(a, b)
{
    /**
     * @param {!WebInspector.Target} target
     * @return {number}
     */
    function targetWeight(target)
    {
        if (target.hasBrowserCapability())
            return 3;
        if (target.hasJSCapability())
            return 2;
        return 1;
    }

    var weightDiff = targetWeight(a.target()) - targetWeight(b.target());
    if (weightDiff)
        return -weightDiff;

    // Main world context should always go first.
    if (a.isDefault)
        return -1;
    if (b.isDefault)
        return +1;
    return a.name.localeCompare(b.name);
}

WebInspector.ExecutionContext.prototype = {
    /**
     * @param {string} expression
     * @param {string} objectGroup
     * @param {boolean} includeCommandLineAPI
     * @param {boolean} silent
     * @param {boolean} returnByValue
     * @param {boolean} generatePreview
     * @param {boolean} userGesture
     * @param {function(?WebInspector.RemoteObject, !RuntimeAgent.ExceptionDetails=)} callback
     */
    evaluate: function(expression, objectGroup, includeCommandLineAPI, silent, returnByValue, generatePreview, userGesture, callback)
    {
        // FIXME: It will be moved to separate ExecutionContext.
        if (this.debuggerModel.selectedCallFrame()) {
            this.debuggerModel.evaluateOnSelectedCallFrame(expression, objectGroup, includeCommandLineAPI, silent, returnByValue, generatePreview, callback);
            return;
        }
        this._evaluateGlobal.apply(this, arguments);
    },

    /**
     * @param {string} objectGroup
     * @param {boolean} generatePreview
     * @param {function(?WebInspector.RemoteObject, !RuntimeAgent.ExceptionDetails=)} callback
     */
    globalObject: function(objectGroup, generatePreview, callback)
    {
        this._evaluateGlobal("this", objectGroup, false, true, false, generatePreview, false, callback);
    },

    /**
     * @param {string} expression
     * @param {string} objectGroup
     * @param {boolean} includeCommandLineAPI
     * @param {boolean} silent
     * @param {boolean} returnByValue
     * @param {boolean} generatePreview
     * @param {boolean} userGesture
     * @param {function(?WebInspector.RemoteObject, !RuntimeAgent.ExceptionDetails=)} callback
     */
    _evaluateGlobal: function(expression, objectGroup, includeCommandLineAPI, silent, returnByValue, generatePreview, userGesture, callback)
    {
        if (!expression) {
            // There is no expression, so the completion should happen against global properties.
            expression = "this";
        }

        /**
         * @this {WebInspector.ExecutionContext}
         * @param {?Protocol.Error} error
         * @param {!RuntimeAgent.RemoteObject} result
         * @param {!RuntimeAgent.ExceptionDetails=} exceptionDetails
         */
        function evalCallback(error, result, exceptionDetails)
        {
            if (error) {
                console.error(error);
                callback(null);
                return;
            }
            callback(this.runtimeModel.createRemoteObject(result), exceptionDetails);
        }
        this.target().runtimeAgent().evaluate(expression, objectGroup, includeCommandLineAPI, silent, this.id, returnByValue, generatePreview, userGesture, false, evalCallback.bind(this));
    },

    /**
     * @param {string} expressionString
     * @param {string} prefix
     * @param {boolean} force
     * @param {function(!Array.<string>, number=)} completionsReadyCallback
     */
    completionsForExpression: function(expressionString, prefix, force, completionsReadyCallback)
    {
        var lastIndex = expressionString.length - 1;

        var dotNotation = (expressionString[lastIndex] === ".");
        var bracketNotation = (expressionString[lastIndex] === "[");

        if (dotNotation || bracketNotation)
            expressionString = expressionString.substr(0, lastIndex);

        if (expressionString && !isNaN(expressionString)) {
            // User is entering float value, do not suggest anything.
            completionsReadyCallback([]);
            return;
        }

        if (!prefix && !expressionString && !force) {
            completionsReadyCallback([]);
            return;
        }

        if (!expressionString && this.debuggerModel.selectedCallFrame())
            this.debuggerModel.selectedCallFrame().variableNames(receivedPropertyNames.bind(this));
        else
            this.evaluate(expressionString, "completion", true, true, false, false, false, evaluated.bind(this));

        /**
         * @param {?WebInspector.RemoteObject} result
         * @param {!RuntimeAgent.ExceptionDetails=} exceptionDetails
         * @this {WebInspector.ExecutionContext}
         */
        function evaluated(result, exceptionDetails)
        {
            if (!result || !!exceptionDetails) {
                completionsReadyCallback([]);
                return;
            }

            /**
             * @param {?WebInspector.RemoteObject} object
             * @return {!Promise<?WebInspector.RemoteObject>}
             */
            function extractTarget(object)
            {
                if (!object)
                    return Promise.resolve(/** @type {?WebInspector.RemoteObject} */(null));
                if (object.type !== "object" || object.subtype !== "proxy")
                    return Promise.resolve(/** @type {?WebInspector.RemoteObject} */(object));
                return object.getOwnPropertiesPromise().then(extractTargetFromProperties).then(extractTarget);
            }

            /**
             * @param {!{properties: ?Array<!WebInspector.RemoteObjectProperty>, internalProperties: ?Array<!WebInspector.RemoteObjectProperty>}} properties
             * @return {?WebInspector.RemoteObject}
             */
            function extractTargetFromProperties(properties)
            {
                var internalProperties = properties.internalProperties || [];
                var target = internalProperties.find(property => property.name === "[[Target]]");
                return target ? target.value : null;
            }

            /**
             * @param {string=} type
             * @return {!Object}
             * @suppressReceiverCheck
             * @this {Object}
             */
            function getCompletions(type)
            {
                var object;
                if (type === "string")
                    object = new String("");
                else if (type === "number")
                    object = new Number(0);
                else if (type === "boolean")
                    object = new Boolean(false);
                else
                    object = this;

                var resultSet = { __proto__: null };
                try {
                    for (var o = object; o; o = Object.getPrototypeOf(o)) {
                        if ((type === "array" || type === "typedarray") && o === object && ArrayBuffer.isView(o) && o.length > 9999)
                            continue;
                        var names = Object.getOwnPropertyNames(o);
                        var isArray = Array.isArray(o);
                        for (var i = 0; i < names.length; ++i) {
                            // Skip array elements indexes.
                            if (isArray && /^[0-9]/.test(names[i]))
                                continue;
                            resultSet[names[i]] = true;
                        }
                    }
                } catch (e) {
                }
                return resultSet;
            }

            /**
             * @param {?WebInspector.RemoteObject} object
             * @this {WebInspector.ExecutionContext}
             */
            function completionsForObject(object)
            {
                if (!object)
                    receivedPropertyNames.call(this, null);
                else if (object.type === "object" || object.type === "function")
                    object.callFunctionJSON(getCompletions, [WebInspector.RemoteObject.toCallArgument(object.subtype)], receivedPropertyNames.bind(this));
                else if (object.type === "string" || object.type === "number" || object.type === "boolean")
                    this.evaluate("(" + getCompletions + ")(\"" + result.type + "\")", "completion", false, true, true, false, false, receivedPropertyNamesFromEval.bind(this));
            }

            extractTarget(result).then(completionsForObject.bind(this));
        }

        /**
         * @param {?WebInspector.RemoteObject} result
         * @param {!RuntimeAgent.ExceptionDetails=} exceptionDetails
         * @this {WebInspector.ExecutionContext}
         */
        function receivedPropertyNamesFromEval(result, exceptionDetails)
        {
            this.target().runtimeAgent().releaseObjectGroup("completion");
            if (result && !exceptionDetails)
                receivedPropertyNames.call(this, /** @type {!Object} */(result.value));
            else
                completionsReadyCallback([]);
        }

        /**
         * @param {?Object} propertyNames
         * @this {WebInspector.ExecutionContext}
         */
        function receivedPropertyNames(propertyNames)
        {
            this.target().runtimeAgent().releaseObjectGroup("completion");
            if (!propertyNames) {
                completionsReadyCallback([]);
                return;
            }
            var includeCommandLineAPI = (!dotNotation && !bracketNotation);
            if (includeCommandLineAPI) {
                const commandLineAPI = ["dir", "dirxml", "keys", "values", "profile", "profileEnd", "monitorEvents", "unmonitorEvents", "inspect", "copy", "clear",
                    "getEventListeners", "debug", "undebug", "monitor", "unmonitor", "table", "$", "$$", "$x"];
                for (var i = 0; i < commandLineAPI.length; ++i)
                    propertyNames[commandLineAPI[i]] = true;
            }
            this._reportCompletions(completionsReadyCallback, dotNotation, bracketNotation, expressionString, prefix, Object.keys(propertyNames));
        }
    },

    /**
     * @param {function(!Array.<string>, number=)} completionsReadyCallback
     * @param {boolean} dotNotation
     * @param {boolean} bracketNotation
     * @param {string} expressionString
     * @param {string} prefix
     * @param {!Array.<string>} properties
     */
    _reportCompletions: function(completionsReadyCallback, dotNotation, bracketNotation, expressionString, prefix, properties) {
        if (bracketNotation) {
            if (prefix.length && prefix[0] === "'")
                var quoteUsed = "'";
            else
                var quoteUsed = "\"";
        }

        var results = [];

        if (!expressionString) {
            const keywords = ["break", "case", "catch", "continue", "default", "delete", "do", "else", "finally", "for", "function", "if", "in",
                              "instanceof", "new", "return", "switch", "this", "throw", "try", "typeof", "var", "void", "while", "with"];
            properties = properties.concat(keywords);
        }

        properties.sort();

        for (var i = 0; i < properties.length; ++i) {
            var property = properties[i];

            // Assume that all non-ASCII characters are letters and thus can be used as part of identifier.
            if (dotNotation && !/^[a-zA-Z_$\u008F-\uFFFF][a-zA-Z0-9_$\u008F-\uFFFF]*$/.test(property))
                continue;

            if (bracketNotation) {
                if (!/^[0-9]+$/.test(property))
                    property = quoteUsed + property.escapeCharacters(quoteUsed + "\\") + quoteUsed;
                property += "]";
            }

            if (property.length < prefix.length)
                continue;
            if (prefix.length && !property.startsWith(prefix))
                continue;

            // Substitute actual newlines with newline characters. @see crbug.com/498421
            results.push(property.split("\n").join("\\n"));
        }
        completionsReadyCallback(results);
    },

    /**
     * @return {string}
     */
    label: function()
    {
        return this._label;
    },

    /**
     * @param {string} label
     */
    setLabel: function(label)
    {
        this._label = label;
        this.runtimeModel.dispatchEventToListeners(WebInspector.RuntimeModel.Events.ExecutionContextChanged, this);
    },

    __proto__: WebInspector.SDKObject.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SDKObject}
 * @param {!WebInspector.Target} target
 * @param {!WebInspector.RemoteObject} eventTarget
 * @param {string} type
 * @param {boolean} useCapture
 * @param {boolean} passive
 * @param {?WebInspector.RemoteObject} handler
 * @param {?WebInspector.RemoteObject} originalHandler
 * @param {!WebInspector.DebuggerModel.Location} location
 * @param {?WebInspector.RemoteObject} removeFunction
 * @param {string=} listenerType
 */
WebInspector.EventListener = function(target, eventTarget, type, useCapture, passive, handler, originalHandler, location, removeFunction, listenerType)
{
    WebInspector.SDKObject.call(this, target);
    this._eventTarget = eventTarget;
    this._type = type;
    this._useCapture = useCapture;
    this._passive = passive;
    this._handler = handler;
    this._originalHandler = originalHandler || handler;
    this._location = location;
    var script = location.script();
    this._sourceURL = script ? script.contentURL() : "";
    this._removeFunction = removeFunction;
    this._listenerType = listenerType || "normal";
}

WebInspector.EventListener.prototype = {
    /**
     * @return {string}
     */
    type: function()
    {
        return this._type;
    },

    /**
     * @return {boolean}
     */
    useCapture: function()
    {
        return this._useCapture;
    },

    /**
     * @return {boolean}
     */
    passive: function()
    {
        return this._passive;
    },

    /**
     * @return {?WebInspector.RemoteObject}
     */
    handler: function()
    {
        return this._handler;
    },

    /**
     * @return {!WebInspector.DebuggerModel.Location}
     */
    location: function()
    {
        return this._location;
    },

    /**
     * @return {string}
     */
    sourceURL: function()
    {
        return this._sourceURL;
    },

    /**
     * @return {?WebInspector.RemoteObject}
     */
    originalHandler: function()
    {
        return this._originalHandler;
    },

    /**
     * @return {?WebInspector.RemoteObject}
     */
    removeFunction: function()
    {
        return this._removeFunction;
    },

    /**
     * @return {!Promise<undefined>}
     */
    remove: function()
    {
        if (!this._removeFunction)
            return Promise.resolve();
        return this._removeFunction.callFunctionPromise(callCustomRemove, [
            WebInspector.RemoteObject.toCallArgument(this._type),
            WebInspector.RemoteObject.toCallArgument(this._originalHandler),
            WebInspector.RemoteObject.toCallArgument(this._useCapture),
            WebInspector.RemoteObject.toCallArgument(this._passive),
        ]).then(() => undefined);

        /**
         * @param {string} type
         * @param {function()} listener
         * @param {boolean} useCapture
         * @param {boolean} passive
         * @this {Function}
         * @suppressReceiverCheck
         */
        function callCustomRemove(type, listener, useCapture, passive)
        {
            this.call(null, type, listener, useCapture, passive);
        }
    },

    /**
     * @return {!Promise<undefined>}
     */
    togglePassive: function()
    {
        return new Promise(promiseConstructor.bind(this));

        /**
         * @param {function()} success
         * @this {WebInspector.EventListener}
         */
        function promiseConstructor(success)
        {
            this._eventTarget.callFunctionPromise(callTogglePassive, [
                WebInspector.RemoteObject.toCallArgument(this._type),
                WebInspector.RemoteObject.toCallArgument(this._originalHandler),
                WebInspector.RemoteObject.toCallArgument(this._useCapture),
                WebInspector.RemoteObject.toCallArgument(this._passive),
            ]).then(success);

            /**
             * @param {string} type
             * @param {function()} listener
             * @param {boolean} useCapture
             * @param {boolean} passive
             * @this {Object}
             * @suppressReceiverCheck
             */
            function callTogglePassive(type, listener, useCapture, passive)
            {
                this.removeEventListener(type, listener, {capture: useCapture});
                this.addEventListener(type, listener, {capture: useCapture, passive: !passive});
            }
        }
    },

    /**
     * @return {string}
     */
    listenerType: function()
    {
        return this._listenerType;
    },

    /**
     * @param {string} listenerType
     */
    setListenerType: function(listenerType)
    {
        this._listenerType = listenerType;
    },

    /**
     * @return {boolean}
     */
    isScrollBlockingType: function()
    {
        return this._type === "touchstart" || this._type === "touchmove" || this._type === "mousewheel" || this._type === "wheel";
    },

    /**
     * @return {boolean}
     */
    isNormalListenerType: function()
    {
        return this._listenerType === "normal";
    },

    __proto__: WebInspector.SDKObject.prototype
}

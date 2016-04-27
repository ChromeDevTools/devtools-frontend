// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.SourceMapNamesResolver = {};

WebInspector.SourceMapNamesResolver._cachedMapSymbol = Symbol("cache");
WebInspector.SourceMapNamesResolver._cachedIdentifiersSymbol = Symbol("cachedIdentifiers");

/**
 * @constructor
 * @param {string} name
 * @param {number} lineNumber
 * @param {number} columnNumber
 */
WebInspector.SourceMapNamesResolver.Identifier = function(name, lineNumber, columnNumber)
{
    this.name = name;
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
}

/**
 * @param {!WebInspector.DebuggerModel.Scope} scope
 * @return {!Promise<!Array<!WebInspector.SourceMapNamesResolver.Identifier>>}
 */
WebInspector.SourceMapNamesResolver._scopeIdentifiers = function(scope)
{
    var startLocation = scope.startLocation();
    var endLocation = scope.endLocation();

    if (scope.type() === DebuggerAgent.ScopeType.Global || !startLocation || !endLocation || !startLocation.script().sourceMapURL || (startLocation.script() !== endLocation.script()))
        return Promise.resolve(/** @type {!Array<!WebInspector.SourceMapNamesResolver.Identifier>}*/([]));

    var script = startLocation.script();
    return script.requestContent().then(onContent);

    /**
     * @param {?string} content
     * @return {!Promise<!Array<!WebInspector.SourceMapNamesResolver.Identifier>>}
     */
    function onContent(content)
    {
        if (!content)
            return Promise.resolve(/** @type {!Array<!WebInspector.SourceMapNamesResolver.Identifier>}*/([]));

        var text = new WebInspector.Text(content);
        var scopeRange = new WebInspector.TextRange(startLocation.lineNumber, startLocation.columnNumber, endLocation.lineNumber, endLocation.columnNumber)
        var scopeText = text.extract(scopeRange);
        var scopeStart = text.toSourceRange(scopeRange).offset;
        var prefix = "function fui";
        return WebInspector.formatterWorkerPool.runTask("javaScriptIdentifiers", {content: prefix + scopeText})
            .then(onIdentifiers.bind(null, text, scopeStart, prefix));
    }

    /**
     * @param {!WebInspector.Text} text
     * @param {number} scopeStart
     * @param {string} prefix
     * @param {?MessageEvent} event
     * @return {!Array<!WebInspector.SourceMapNamesResolver.Identifier>}
     */
    function onIdentifiers(text, scopeStart, prefix, event)
    {
        var identifiers = event ? /** @type {!Array<!{name: string, offset: number}>} */(event.data) : [];
        var result = [];
        var cursor = new WebInspector.TextCursor(text.lineEndings());
        var promises = [];
        for (var i = 0; i < identifiers.length; ++i) {
            var id = identifiers[i];
            if (id.offset < prefix.length)
                continue;
            var start = scopeStart + id.offset - prefix.length;
            cursor.resetTo(start);
            result.push(new WebInspector.SourceMapNamesResolver.Identifier(id.name, cursor.lineNumber(), cursor.columnNumber()));
        }
        return result;
    }
}

/**
 * @param {!WebInspector.DebuggerModel.Scope} scope
 * @return {!Promise.<!Map<string, string>>}
 */
WebInspector.SourceMapNamesResolver._resolveScope = function(scope)
{
    var identifiersPromise = scope[WebInspector.SourceMapNamesResolver._cachedIdentifiersSymbol];
    if (identifiersPromise)
        return identifiersPromise;

    var script = scope.callFrame().script;
    var sourceMap = WebInspector.debuggerWorkspaceBinding.sourceMapForScript(script);
    if (!sourceMap)
        return Promise.resolve(new Map());

    /** @type {!Map<string, !WebInspector.Text>} */
    var textCache = new Map();
    identifiersPromise = WebInspector.SourceMapNamesResolver._scopeIdentifiers(scope).then(onIdentifiers);
    scope[WebInspector.SourceMapNamesResolver._cachedIdentifiersSymbol] = identifiersPromise;
    return identifiersPromise;

    /**
     * @param {!Array<!WebInspector.SourceMapNamesResolver.Identifier>} identifiers
     * @return {!Promise<!Map<string, string>>}
     */
    function onIdentifiers(identifiers)
    {
        var namesMapping = new Map();
        // Extract as much as possible from SourceMap.
        for (var i = 0; i < identifiers.length; ++i) {
            var id = identifiers[i];
            var entry = sourceMap.findEntry(id.lineNumber, id.columnNumber);
            if (entry && entry.name)
                namesMapping.set(id.name, entry.name);
        }

        // Resolve missing identifier names from sourcemap ranges.
        var promises = [];
        for (var i = 0; i < identifiers.length; ++i) {
            var id = identifiers[i];
            if (namesMapping.has(id.name))
                continue;
            var promise = resolveSourceName(id).then(onSourceNameResolved.bind(null, namesMapping, id));
            promises.push(promise);
        }
        return Promise.all(promises)
            .then(() => WebInspector.SourceMapNamesResolver._scopeResolvedForTest())
            .then(() => namesMapping)
    }

    /**
     * @param {!Map<string, string>} namesMapping
     * @param {!WebInspector.SourceMapNamesResolver.Identifier} id
     * @param {?string} sourceName
     */
    function onSourceNameResolved(namesMapping, id, sourceName)
    {
        if (!sourceName)
            return;
        namesMapping.set(id.name, sourceName);
    }

    /**
     * @param {!WebInspector.SourceMapNamesResolver.Identifier} id
     * @return {!Promise<?string>}
     */
    function resolveSourceName(id)
    {
        var startEntry = sourceMap.findEntry(id.lineNumber, id.columnNumber);
        var endEntry = sourceMap.findEntry(id.lineNumber, id.columnNumber + id.name.length);
        if (!startEntry || !endEntry || !startEntry.sourceURL || startEntry.sourceURL !== endEntry.sourceURL
            || !startEntry.sourceLineNumber || !startEntry.sourceColumnNumber
            || !endEntry.sourceLineNumber || !endEntry.sourceColumnNumber)
            return Promise.resolve(/** @type {?string} */(null));
        var sourceTextRange = new WebInspector.TextRange(startEntry.sourceLineNumber, startEntry.sourceColumnNumber, endEntry.sourceLineNumber, endEntry.sourceColumnNumber);
        var uiSourceCode = WebInspector.networkMapping.uiSourceCodeForScriptURL(startEntry.sourceURL, script);
        if (!uiSourceCode)
            return Promise.resolve(/** @type {?string} */(null));

        return uiSourceCode.requestContent()
            .then(onSourceContent.bind(null, sourceTextRange));
    }

    /**
     * @param {!WebInspector.TextRange} sourceTextRange
     * @param {?string} content
     * @return {?string}
     */
    function onSourceContent(sourceTextRange, content)
    {
        if (!content)
            return null;
        var text = textCache.get(content);
        if (!text) {
            text = new WebInspector.Text(content);
            textCache.set(content, text);
        }
        var originalIdentifier = text.extract(sourceTextRange).trim();
        return /[a-zA-Z0-9_$]+/.test(originalIdentifier) ? originalIdentifier : null;
    }
}

WebInspector.SourceMapNamesResolver._scopeResolvedForTest = function() { }

/**
 * @param {!WebInspector.DebuggerModel.CallFrame} callFrame
 * @return {!Promise.<!Map<string, string>>}
 */
WebInspector.SourceMapNamesResolver._allVariablesInCallFrame = function(callFrame)
{
    var cached = callFrame[WebInspector.SourceMapNamesResolver._cachedMapSymbol];
    if (cached)
        return Promise.resolve(cached);

    var promises = [];
    var scopeChain = callFrame.scopeChain();
    for (var i = 0; i < scopeChain.length; ++i)
        promises.push(WebInspector.SourceMapNamesResolver._resolveScope(scopeChain[i]));

    return Promise.all(promises).then(mergeVariables);

    /**
     * @param {!Array<!Map<string, string>>} nameMappings
     * @return {!Map<string, string>}
     */
    function mergeVariables(nameMappings)
    {
        var reverseMapping = new Map();
        for (var map of nameMappings) {
            for (var compiledName of map.keys()) {
                var originalName = map.get(compiledName);
                if (!reverseMapping.has(originalName))
                    reverseMapping.set(originalName, compiledName);
            }
        }
        callFrame[WebInspector.SourceMapNamesResolver._cachedMapSymbol] = reverseMapping;
        return reverseMapping;
    }
}

/**
 * @param {!WebInspector.DebuggerModel.CallFrame} callFrame
 * @param {string} originalText
 * @param {!WebInspector.UISourceCode} uiSourceCode
 * @param {number} lineNumber
 * @param {number} startColumnNumber
 * @param {number} endColumnNumber
 * @return {!Promise<string>}
 */
WebInspector.SourceMapNamesResolver.resolveExpression = function(callFrame, originalText, uiSourceCode, lineNumber, startColumnNumber, endColumnNumber)
{
    if (!Runtime.experiments.isEnabled("resolveVariableNames") || !uiSourceCode.contentType().isFromSourceMap())
        return Promise.resolve("");

    return WebInspector.SourceMapNamesResolver._allVariablesInCallFrame(callFrame).then(findCompiledName);

    /**
     * @param {!Map<string, string>} reverseMapping
     * @return {!Promise<string>}
     */
    function findCompiledName(reverseMapping)
    {
        if (reverseMapping.has(originalText))
            return Promise.resolve(reverseMapping.get(originalText) || "");

        return WebInspector.SourceMapNamesResolver._resolveExpression(callFrame, uiSourceCode, lineNumber, startColumnNumber, endColumnNumber);
    }
}

/**
 * @param {!WebInspector.DebuggerModel.CallFrame} callFrame
 * @param {!WebInspector.UISourceCode} uiSourceCode
 * @param {number} lineNumber
 * @param {number} startColumnNumber
 * @param {number} endColumnNumber
 * @return {!Promise<string>}
 */
WebInspector.SourceMapNamesResolver._resolveExpression = function(callFrame, uiSourceCode, lineNumber, startColumnNumber, endColumnNumber)
{
    var target = callFrame.target();
    var rawLocation = WebInspector.debuggerWorkspaceBinding.uiLocationToRawLocation(target, uiSourceCode, lineNumber, startColumnNumber);
    if (!rawLocation)
        return Promise.resolve("");

    var script = rawLocation.script();
    var sourceMap = WebInspector.debuggerWorkspaceBinding.sourceMapForScript(script);
    if (!sourceMap)
        return Promise.resolve("");

    return script.requestContent().then(onContent);

    /**
     * @param {?string} content
     * @return {!Promise<string>}
     */
    function onContent(content)
    {
        if (!content)
            return Promise.resolve("");

        var text = new WebInspector.Text(content);
        var textRange = sourceMap.reverseMapTextRange(uiSourceCode.url(), new WebInspector.TextRange(lineNumber, startColumnNumber, lineNumber, endColumnNumber));
        var originalText = text.extract(textRange);
        if (!originalText)
            return Promise.resolve("");
        return WebInspector.formatterWorkerPool.runTask("evaluatableJavaScriptSubstring", {content: originalText})
            .then(onResult);
    }

    /**
     * @param {?MessageEvent} event
     * @return {string}
     */
    function onResult(event)
    {
        return event ? /** @type {string} */(event.data) : "";
    }
}

/**
 * @param {?WebInspector.DebuggerModel.CallFrame} callFrame
 * @return {!Promise<?WebInspector.RemoteObject>}
 */
WebInspector.SourceMapNamesResolver.resolveThisObject = function(callFrame)
{
    if (!callFrame)
        return Promise.resolve(/** @type {?WebInspector.RemoteObject} */(null));
    if (!Runtime.experiments.isEnabled("resolveVariableNames") || !callFrame.scopeChain().length)
        return Promise.resolve(callFrame.thisObject());

    return WebInspector.SourceMapNamesResolver._resolveScope(callFrame.scopeChain()[0])
        .then(onScopeResolved);

    /**
     * @param {!Map<string, string>} namesMapping
     * @return {!Promise<?WebInspector.RemoteObject>}
     */
    function onScopeResolved(namesMapping)
    {
        var thisMappings = namesMapping.inverse().get("this");
        if (!thisMappings || thisMappings.size !== 1)
            return Promise.resolve(callFrame.thisObject());

        var thisMapping = thisMappings.valuesArray()[0];
        var callback;
        var promise = new Promise(fulfill => callback = fulfill);
        callFrame.evaluate(thisMapping, "backtrace", false, true, false, true, onEvaluated.bind(null, callback));
        return promise;
    }

    /**
     * @param {function(!WebInspector.RemoteObject)} callback
     * @param {?RuntimeAgent.RemoteObject} evaluateResult
     */
    function onEvaluated(callback, evaluateResult)
    {
        var remoteObject = evaluateResult ? callFrame.target().runtimeModel.createRemoteObject(evaluateResult) : callFrame.thisObject();
        callback(remoteObject);
    }
}

/**
 * @param {!WebInspector.DebuggerModel.Scope} scope
 * @return {!WebInspector.RemoteObject}
 */
WebInspector.SourceMapNamesResolver.resolveScopeInObject = function(scope)
{
    if (!Runtime.experiments.isEnabled("resolveVariableNames"))
        return scope.object();

    var startLocation = scope.startLocation();
    var endLocation = scope.endLocation();

    if (scope.type() === DebuggerAgent.ScopeType.Global || !startLocation || !endLocation || !startLocation.script().sourceMapURL || startLocation.script() !== endLocation.script())
        return scope.object();

    return new WebInspector.SourceMapNamesResolver.RemoteObject(scope);
}

/**
 * @constructor
 * @extends {WebInspector.RemoteObject}
 * @param {!WebInspector.DebuggerModel.Scope} scope
 */
WebInspector.SourceMapNamesResolver.RemoteObject = function(scope)
{
    WebInspector.RemoteObject.call(this);
    this._scope = scope;
    this._object = scope.object();
};

WebInspector.SourceMapNamesResolver.RemoteObject.prototype = {
    /**
     * @override
     * @return {?RuntimeAgent.CustomPreview}
     */
    customPreview: function()
    {
        return this._object.customPreview();
    },

    /**
     * @override
     * @return {string}
     */
    get type()
    {
        return this._object.type;
    },

    /**
     * @override
     * @return {string|undefined}
     */
    get subtype()
    {
        return this._object.subtype;
    },

    /**
     * @override
     * @return {string|undefined}
     */
    get description()
    {
        return this._object.description;
    },

    /**
     * @override
     * @return {boolean}
     */
    get hasChildren()
    {
        return this._object.hasChildren;
    },

    /**
     * @override
     * @return {number}
     */
    arrayLength: function()
    {
        return this._object.arrayLength();
    },

    /**
     * @override
     * @param {function(?Array.<!WebInspector.RemoteObjectProperty>, ?Array.<!WebInspector.RemoteObjectProperty>)} callback
     */
    getOwnProperties: function(callback)
    {
        this._object.getOwnProperties(callback);
    },

    /**
     * @override
     * @param {boolean} accessorPropertiesOnly
     * @param {function(?Array<!WebInspector.RemoteObjectProperty>, ?Array<!WebInspector.RemoteObjectProperty>)} callback
     */
    getAllProperties: function(accessorPropertiesOnly, callback)
    {
        /**
         * @param {?Array.<!WebInspector.RemoteObjectProperty>} properties
         * @param {?Array.<!WebInspector.RemoteObjectProperty>} internalProperties
         * @this {WebInspector.SourceMapNamesResolver.RemoteObject}
         */
        function wrappedCallback(properties, internalProperties)
        {
            WebInspector.SourceMapNamesResolver._resolveScope(this._scope).then(resolveNames.bind(null, properties, internalProperties))
        }

        /**
         * @param {?Array.<!WebInspector.RemoteObjectProperty>} properties
         * @param {?Array.<!WebInspector.RemoteObjectProperty>} internalProperties
         * @param {!Map<string, string>} namesMapping
         */
        function resolveNames(properties, internalProperties, namesMapping)
        {
            var newProperties = [];
            if (properties) {
                for (var i = 0; i < properties.length; ++i) {
                    var property = properties[i];
                    var name = namesMapping.get(property.name) || properties[i].name;
                    newProperties.push(new WebInspector.RemoteObjectProperty(name, property.value, property.enumerable, property.writable, property.isOwn, property.wasThrown, property.symbol, property.synthetic));
                }
            }

            callback(newProperties, internalProperties);
        }

        this._object.getAllProperties(accessorPropertiesOnly, wrappedCallback.bind(this));
    },

    /**
     * @override
     * @param {string|!RuntimeAgent.CallArgument} argumentName
     * @param {string} value
     * @param {function(string=)} callback
     */
    setPropertyValue: function(argumentName, value, callback)
    {
        WebInspector.SourceMapNamesResolver._resolveScope(this._scope).then(resolveName.bind(this));

        /**
         * @param {!Map<string, string>} namesMapping
         * @this {WebInspector.SourceMapNamesResolver.RemoteObject}
         */
        function resolveName(namesMapping)
        {
            var name;
            if (typeof argumentName === "string")
                name = argumentName;
            else
                name = /** @type {string} */ (argumentName.value);

            var actualName = name;
            for (var compiledName of namesMapping.keys()) {
                if (namesMapping.get(compiledName) === name) {
                    actualName = compiledName;
                    break;
                }
            }
            this._object.setPropertyValue(actualName, value, callback);
        }
    },

    /**
     * @override
     * @return {!Promise<?Array<!WebInspector.EventListener>>}
     */
    eventListeners: function()
    {
        return this._object.eventListeners();
    },

    /**
     * @override
     * @param {!RuntimeAgent.CallArgument} name
     * @param {function(string=)} callback
     */
    deleteProperty: function(name, callback)
    {
        this._object.deleteProperty(name, callback);
    },

    /**
     * @override
     * @param {function(this:Object, ...)} functionDeclaration
     * @param {!Array<!RuntimeAgent.CallArgument>=} args
     * @param {function(?WebInspector.RemoteObject, boolean=)=} callback
     */
    callFunction: function(functionDeclaration, args, callback)
    {
        this._object.callFunction(functionDeclaration, args, callback);
    },

    /**
     * @override
     * @param {function(this:Object, ...)} functionDeclaration
     * @param {!Array<!RuntimeAgent.CallArgument>|undefined} args
     * @param {function(*)} callback
     */
    callFunctionJSON: function(functionDeclaration, args, callback)
    {
        this._object.callFunctionJSON(functionDeclaration, args, callback);
    },

    /**
     * @override
     * @return {!WebInspector.Target}
     */
    target: function()
    {
        return this._object.target();
    },

    /**
     * @override
     * @return {?WebInspector.DebuggerModel}
     */
    debuggerModel: function()
    {
        return this._object.debuggerModel();
    },

    /**
     * @override
     * @return {boolean}
     */
    isNode: function()
    {
        return this._object.isNode();
    },

    /**
     * @override
     * @param {function(?WebInspector.DebuggerModel.FunctionDetails)} callback
     */
    functionDetails: function(callback)
    {
        this._object.functionDetails(callback);
    },

    /**
     * @override
     * @param {function(?WebInspector.DebuggerModel.GeneratorObjectDetails)} callback
     */
    generatorObjectDetails: function(callback)
    {
        this._object.generatorObjectDetails(callback);
    },

    /**
     * @override
     * @param {function(?Array<!DebuggerAgent.CollectionEntry>)} callback
     */
    collectionEntries: function(callback)
    {
        this._object.collectionEntries(callback);
    },

    __proto__: WebInspector.RemoteObject.prototype
}


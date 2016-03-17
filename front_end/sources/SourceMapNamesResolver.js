// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.SourceMapNamesResolver = {};

WebInspector.SourceMapNamesResolver._cachedMapSymbol = Symbol("cache");
WebInspector.SourceMapNamesResolver._cachedPromiseSymbol = Symbol("cachePromise");

/**
 * @param {!WebInspector.DebuggerModel.Scope} scope
 * @return {!Promise.<!Map<string, string>>}
 */
WebInspector.SourceMapNamesResolver._resolveScope = function(scope)
{
    var cachedMap = scope[WebInspector.SourceMapNamesResolver._cachedMapSymbol];
    if (cachedMap)
        return Promise.resolve(cachedMap);

    var cachedPromise = scope[WebInspector.SourceMapNamesResolver._cachedPromiseSymbol];
    if (cachedPromise)
        return cachedPromise;

    var startLocation = scope.startLocation();
    var endLocation = scope.endLocation();

    if (scope.type() === DebuggerAgent.ScopeType.Global || !startLocation || !endLocation || !startLocation.script().sourceMapURL || (startLocation.script() !== endLocation.script()))
        return Promise.resolve(new Map());

    var script = startLocation.script();
    var sourceMap = WebInspector.debuggerWorkspaceBinding.sourceMapForScript(script);
    if (!sourceMap)
        return Promise.resolve(new Map());

    var promise = script.requestContent().then(onContent);
    scope[WebInspector.SourceMapNamesResolver._cachedPromiseSymbol] = promise;
    return promise;

    /**
     * @param {?string} content
     * @return {!Map<string, string>}
     */
    function onContent(content)
    {
        if (!content)
            return new Map();

        var startLocation = scope.startLocation();
        var endLocation = scope.endLocation();
        var textRange = new WebInspector.TextRange(startLocation.lineNumber, startLocation.columnNumber, endLocation.lineNumber, endLocation.columnNumber);

        var text = new WebInspector.Text(content);
        var scopeText = text.extract(textRange);
        var scopeStart = text.toSourceRange(textRange).offset;
        var prefix = "function fui";
        var root = acorn.parse(prefix + scopeText, {});
        /** @type {!Array<!ESTree.Node>} */
        var identifiers = [];
        var functionDeclarationCounter = 0;
        var walker = new WebInspector.ESTreeWalker(beforeVisit, afterVisit);

        /**
         * @param {!ESTree.Node} node
         * @return {boolean}
         */
        function isFunction(node)
        {
            return node.type === "FunctionDeclaration" || node.type === "FunctionExpression";
        }

        /**
         * @param {!ESTree.Node} node
         */
        function beforeVisit(node)
        {
            if (isFunction(node))
                functionDeclarationCounter++;

            if (functionDeclarationCounter > 1)
                return;

            if (isFunction(node) && node.params)
                identifiers.pushAll(node.params);

            if (node.type === "VariableDeclarator")
                identifiers.push(/** @type {!ESTree.Node} */(node.id));
        }

        /**
         * @param {!ESTree.Node} node
         */
        function afterVisit(node)
        {
            if (isFunction(node))
                functionDeclarationCounter--;
        }

        walker.walk(root);

        var namesMapping = new Map();
        var lineEndings = content.computeLineEndings();

        for (var i = 0; i < identifiers.length; ++i) {
            var id = identifiers[i];
            var start = scopeStart + id.start - prefix.length;

            var lineNumber = lineEndings.lowerBound(start);
            var columnNumber = start - (lineNumber === 0 ? 0 : (lineEndings[lineNumber - 1] + 1));
            var entry = sourceMap.findEntry(lineNumber, columnNumber);
            if (entry)
                namesMapping.set(id.name, entry.name);
        }

        scope[WebInspector.SourceMapNamesResolver._cachedMapSymbol] = namesMapping;
        delete scope[WebInspector.SourceMapNamesResolver._cachedPromiseSymbol];
        return namesMapping;
    }
}

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
    if (!Runtime.experiments.isEnabled("resolveVariableNames"))
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

        return WebInspector.SourceMapNamesResolver._resolveExpression(callFrame, uiSourceCode, lineNumber, startColumnNumber, endColumnNumber)
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
     * @return {string}
     */
    function onContent(content)
    {
        if (!content)
            return "";

        var text = new WebInspector.Text(content);
        var textRange = sourceMap.reverseMapTextRange(uiSourceCode.url(), new WebInspector.TextRange(lineNumber, startColumnNumber, lineNumber, endColumnNumber));
        var originalText = text.extract(textRange);
        if (!originalText)
            return "";

        var tokenizer = acorn.tokenizer(originalText, {ecmaVersion: 6});
        try {
            var token = tokenizer.getToken();
            while (token.type !== acorn.tokTypes.eof && WebInspector.AcornTokenizer.punctuator(token))
                token = tokenizer.getToken();

            var startIndex = token.start;
            var endIndex = token.end;
            var openBracketsCounter = 0;
            while (token.type !== acorn.tokTypes.eof) {
                var isIdentifier = WebInspector.AcornTokenizer.identifier(token);
                var isThis = WebInspector.AcornTokenizer.keyword(token, "this");
                var isString = token.type === acorn.tokTypes.string;
                if (!isThis && !isIdentifier && !isString)
                    break;

                endIndex = token.end;
                token = tokenizer.getToken();
                while (WebInspector.AcornTokenizer.punctuator(token, ".[]")) {
                    if (WebInspector.AcornTokenizer.punctuator(token, "["))
                        openBracketsCounter++;

                    if (WebInspector.AcornTokenizer.punctuator(token, "]")) {
                        endIndex = openBracketsCounter > 0 ? token.end : endIndex;
                        openBracketsCounter--;
                    }

                    token = tokenizer.getToken();
                }
            }
            return originalText.substring(startIndex, endIndex);
        } catch (e) {
            return "";
        }
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

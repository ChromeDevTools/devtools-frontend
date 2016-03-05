// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.SourceMapNamesResolver = {};

WebInspector.SourceMapNamesResolver._cachedMapSymbol = Symbol("cache");
WebInspector.SourceMapNamesResolver._cachedPromiseSymbol = Symbol("cache");

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
    var script = startLocation.script();

    if (scope.type() === DebuggerAgent.ScopeType.Global || !startLocation || !endLocation || !script.sourceMapURL || script !== endLocation.script())
        return Promise.resolve(new Map());

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

        var scopeText = textRange.extract(content);
        var scopeStart = textRange.toSourceRange(content).offset;
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
        var lineEndings = content.lineEndings();

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

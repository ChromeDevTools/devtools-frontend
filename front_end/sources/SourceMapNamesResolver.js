// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
Sources.SourceMapNamesResolver = {};

Sources.SourceMapNamesResolver._cachedMapSymbol = Symbol('cache');
Sources.SourceMapNamesResolver._cachedIdentifiersSymbol = Symbol('cachedIdentifiers');

/**
 * @unrestricted
 */
Sources.SourceMapNamesResolver.Identifier = class {
  /**
   * @param {string} name
   * @param {number} lineNumber
   * @param {number} columnNumber
   */
  constructor(name, lineNumber, columnNumber) {
    this.name = name;
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
  }
};

/**
 * @param {!SDK.DebuggerModel.Scope} scope
 * @return {!Promise<!Array<!Sources.SourceMapNamesResolver.Identifier>>}
 */
Sources.SourceMapNamesResolver._scopeIdentifiers = function(scope) {
  var startLocation = scope.startLocation();
  var endLocation = scope.endLocation();

  if (scope.type() === Protocol.Debugger.ScopeType.Global || !startLocation || !endLocation ||
      !startLocation.script() || !startLocation.script().sourceMapURL ||
      (startLocation.script() !== endLocation.script()))
    return Promise.resolve(/** @type {!Array<!Sources.SourceMapNamesResolver.Identifier>}*/ ([]));

  var script = startLocation.script();
  return script.requestContent().then(onContent);

  /**
   * @param {?string} content
   * @return {!Promise<!Array<!Sources.SourceMapNamesResolver.Identifier>>}
   */
  function onContent(content) {
    if (!content)
      return Promise.resolve(/** @type {!Array<!Sources.SourceMapNamesResolver.Identifier>}*/ ([]));

    var text = new TextUtils.Text(content);
    var scopeRange = new TextUtils.TextRange(
        startLocation.lineNumber, startLocation.columnNumber, endLocation.lineNumber, endLocation.columnNumber);
    var scopeText = text.extract(scopeRange);
    var scopeStart = text.toSourceRange(scopeRange).offset;
    var prefix = 'function fui';
    return Formatter.formatterWorkerPool()
        .javaScriptIdentifiers(prefix + scopeText)
        .then(onIdentifiers.bind(null, text, scopeStart, prefix));
  }

  /**
   * @param {!TextUtils.Text} text
   * @param {number} scopeStart
   * @param {string} prefix
   * @param {!Array<!{name: string, offset: number}>} identifiers
   * @return {!Array<!Sources.SourceMapNamesResolver.Identifier>}
   */
  function onIdentifiers(text, scopeStart, prefix, identifiers) {
    var result = [];
    var cursor = new TextUtils.TextCursor(text.lineEndings());
    for (var i = 0; i < identifiers.length; ++i) {
      var id = identifiers[i];
      if (id.offset < prefix.length)
        continue;
      var start = scopeStart + id.offset - prefix.length;
      cursor.resetTo(start);
      result.push(new Sources.SourceMapNamesResolver.Identifier(id.name, cursor.lineNumber(), cursor.columnNumber()));
    }
    return result;
  }
};

/**
 * @param {!SDK.DebuggerModel.Scope} scope
 * @return {!Promise.<!Map<string, string>>}
 */
Sources.SourceMapNamesResolver._resolveScope = function(scope) {
  var identifiersPromise = scope[Sources.SourceMapNamesResolver._cachedIdentifiersSymbol];
  if (identifiersPromise)
    return identifiersPromise;

  var script = scope.callFrame().script;
  var sourceMap = Bindings.debuggerWorkspaceBinding.sourceMapForScript(script);
  if (!sourceMap)
    return Promise.resolve(new Map());

  /** @type {!Map<string, !TextUtils.Text>} */
  var textCache = new Map();
  identifiersPromise = Sources.SourceMapNamesResolver._scopeIdentifiers(scope).then(onIdentifiers);
  scope[Sources.SourceMapNamesResolver._cachedIdentifiersSymbol] = identifiersPromise;
  return identifiersPromise;

  /**
   * @param {!Array<!Sources.SourceMapNamesResolver.Identifier>} identifiers
   * @return {!Promise<!Map<string, string>>}
   */
  function onIdentifiers(identifiers) {
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
        .then(() => Sources.SourceMapNamesResolver._scopeResolvedForTest())
        .then(() => namesMapping);
  }

  /**
   * @param {!Map<string, string>} namesMapping
   * @param {!Sources.SourceMapNamesResolver.Identifier} id
   * @param {?string} sourceName
   */
  function onSourceNameResolved(namesMapping, id, sourceName) {
    if (!sourceName)
      return;
    namesMapping.set(id.name, sourceName);
  }

  /**
   * @param {!Sources.SourceMapNamesResolver.Identifier} id
   * @return {!Promise<?string>}
   */
  function resolveSourceName(id) {
    var startEntry = sourceMap.findEntry(id.lineNumber, id.columnNumber);
    var endEntry = sourceMap.findEntry(id.lineNumber, id.columnNumber + id.name.length);
    if (!startEntry || !endEntry || !startEntry.sourceURL || startEntry.sourceURL !== endEntry.sourceURL ||
        !startEntry.sourceLineNumber || !startEntry.sourceColumnNumber || !endEntry.sourceLineNumber ||
        !endEntry.sourceColumnNumber)
      return Promise.resolve(/** @type {?string} */ (null));
    var sourceTextRange = new TextUtils.TextRange(
        startEntry.sourceLineNumber, startEntry.sourceColumnNumber, endEntry.sourceLineNumber,
        endEntry.sourceColumnNumber);
    var uiSourceCode = Bindings.debuggerWorkspaceBinding.uiSourceCodeForSourceMapSourceURL(
        script.debuggerModel, startEntry.sourceURL, script.isContentScript());
    if (!uiSourceCode)
      return Promise.resolve(/** @type {?string} */ (null));

    return uiSourceCode.requestContent().then(onSourceContent.bind(null, sourceTextRange));
  }

  /**
   * @param {!TextUtils.TextRange} sourceTextRange
   * @param {?string} content
   * @return {?string}
   */
  function onSourceContent(sourceTextRange, content) {
    if (!content)
      return null;
    var text = textCache.get(content);
    if (!text) {
      text = new TextUtils.Text(content);
      textCache.set(content, text);
    }
    var originalIdentifier = text.extract(sourceTextRange).trim();
    return /[a-zA-Z0-9_$]+/.test(originalIdentifier) ? originalIdentifier : null;
  }
};

Sources.SourceMapNamesResolver._scopeResolvedForTest = function() {};

/**
 * @param {!SDK.DebuggerModel.CallFrame} callFrame
 * @return {!Promise.<!Map<string, string>>}
 */
Sources.SourceMapNamesResolver._allVariablesInCallFrame = function(callFrame) {
  var cached = callFrame[Sources.SourceMapNamesResolver._cachedMapSymbol];
  if (cached)
    return Promise.resolve(cached);

  var promises = [];
  var scopeChain = callFrame.scopeChain();
  for (var i = 0; i < scopeChain.length; ++i)
    promises.push(Sources.SourceMapNamesResolver._resolveScope(scopeChain[i]));

  return Promise.all(promises).then(mergeVariables);

  /**
   * @param {!Array<!Map<string, string>>} nameMappings
   * @return {!Map<string, string>}
   */
  function mergeVariables(nameMappings) {
    var reverseMapping = new Map();
    for (var map of nameMappings) {
      for (var compiledName of map.keys()) {
        var originalName = map.get(compiledName);
        if (!reverseMapping.has(originalName))
          reverseMapping.set(originalName, compiledName);
      }
    }
    callFrame[Sources.SourceMapNamesResolver._cachedMapSymbol] = reverseMapping;
    return reverseMapping;
  }
};

/**
 * @param {!SDK.DebuggerModel.CallFrame} callFrame
 * @param {string} originalText
 * @param {!Workspace.UISourceCode} uiSourceCode
 * @param {number} lineNumber
 * @param {number} startColumnNumber
 * @param {number} endColumnNumber
 * @return {!Promise<string>}
 */
Sources.SourceMapNamesResolver.resolveExpression = function(
    callFrame, originalText, uiSourceCode, lineNumber, startColumnNumber, endColumnNumber) {
  if (!uiSourceCode.contentType().isFromSourceMap())
    return Promise.resolve('');

  return Sources.SourceMapNamesResolver._allVariablesInCallFrame(callFrame).then(findCompiledName);

  /**
   * @param {!Map<string, string>} reverseMapping
   * @return {!Promise<string>}
   */
  function findCompiledName(reverseMapping) {
    if (reverseMapping.has(originalText))
      return Promise.resolve(reverseMapping.get(originalText) || '');

    return Sources.SourceMapNamesResolver._resolveExpression(
        uiSourceCode, lineNumber, startColumnNumber, endColumnNumber);
  }
};

/**
 * @param {!Workspace.UISourceCode} uiSourceCode
 * @param {number} lineNumber
 * @param {number} startColumnNumber
 * @param {number} endColumnNumber
 * @return {!Promise<string>}
 */
Sources.SourceMapNamesResolver._resolveExpression = function(
    uiSourceCode, lineNumber, startColumnNumber, endColumnNumber) {
  var rawLocation =
      Bindings.debuggerWorkspaceBinding.uiLocationToRawLocation(uiSourceCode, lineNumber, startColumnNumber);
  if (!rawLocation)
    return Promise.resolve('');

  var script = rawLocation.script();
  if (!script)
    return Promise.resolve('');
  var sourceMap = Bindings.debuggerWorkspaceBinding.sourceMapForScript(script);
  if (!sourceMap)
    return Promise.resolve('');

  return script.requestContent().then(onContent);

  /**
   * @param {?string} content
   * @return {!Promise<string>}
   */
  function onContent(content) {
    if (!content)
      return Promise.resolve('');

    var text = new TextUtils.Text(content);
    var textRange = sourceMap.reverseMapTextRange(
        uiSourceCode.url(), new TextUtils.TextRange(lineNumber, startColumnNumber, lineNumber, endColumnNumber));
    var originalText = text.extract(textRange);
    if (!originalText)
      return Promise.resolve('');
    return Formatter.formatterWorkerPool().evaluatableJavaScriptSubstring(originalText);
  }
};

/**
 * @param {?SDK.DebuggerModel.CallFrame} callFrame
 * @return {!Promise<?SDK.RemoteObject>}
 */
Sources.SourceMapNamesResolver.resolveThisObject = function(callFrame) {
  if (!callFrame)
    return Promise.resolve(/** @type {?SDK.RemoteObject} */ (null));
  if (!callFrame.scopeChain().length)
    return Promise.resolve(callFrame.thisObject());

  return Sources.SourceMapNamesResolver._resolveScope(callFrame.scopeChain()[0]).then(onScopeResolved);

  /**
   * @param {!Map<string, string>} namesMapping
   * @return {!Promise<?SDK.RemoteObject>}
   */
  function onScopeResolved(namesMapping) {
    var thisMappings = namesMapping.inverse().get('this');
    if (!thisMappings || thisMappings.size !== 1)
      return Promise.resolve(callFrame.thisObject());

    var thisMapping = thisMappings.valuesArray()[0];
    return callFrame
        .evaluate({
          expression: thisMapping,
          objectGroup: 'backtrace',
          includeCommandLineAPI: false,
          silent: true,
          returnByValue: false,
          generatePreview: true
        })
        .then(onEvaluated);
  }

  /**
   * @param {!SDK.RuntimeModel.EvaluationResult} result
   * @return {?SDK.RemoteObject}
   */
  function onEvaluated(result) {
    return !result.exceptionDetails && result.object ? result.object : callFrame.thisObject();
  }
};

/**
 * @param {!SDK.DebuggerModel.Scope} scope
 * @return {!SDK.RemoteObject}
 */
Sources.SourceMapNamesResolver.resolveScopeInObject = function(scope) {
  var startLocation = scope.startLocation();
  var endLocation = scope.endLocation();

  if (scope.type() === Protocol.Debugger.ScopeType.Global || !startLocation || !endLocation ||
      !startLocation.script() || !startLocation.script().sourceMapURL ||
      startLocation.script() !== endLocation.script())
    return scope.object();

  return new Sources.SourceMapNamesResolver.RemoteObject(scope);
};

/**
 * @unrestricted
 */
Sources.SourceMapNamesResolver.RemoteObject = class extends SDK.RemoteObject {
  /**
   * @param {!SDK.DebuggerModel.Scope} scope
   */
  constructor(scope) {
    super();
    this._scope = scope;
    this._object = scope.object();
  }

  /**
   * @override
   * @return {?Protocol.Runtime.CustomPreview}
   */
  customPreview() {
    return this._object.customPreview();
  }

  /**
   * @override
   * @return {!Protocol.Runtime.RemoteObjectId|undefined}
   */
  get objectId() {
    return this._object.objectId;
  }

  /**
   * @override
   * @return {string}
   */
  get type() {
    return this._object.type;
  }

  /**
   * @override
   * @return {string|undefined}
   */
  get subtype() {
    return this._object.subtype;
  }

  /**
   * @override
   * @return {*}
   */
  get value() {
    return this._object.value;
  }

  /**
   * @override
   * @return {string|undefined}
   */
  get description() {
    return this._object.description;
  }

  /**
   * @override
   * @return {boolean}
   */
  get hasChildren() {
    return this._object.hasChildren;
  }

  /**
   * @override
   * @return {!Protocol.Runtime.ObjectPreview|undefined}
   */
  get preview() {
    return this._object.preview;
  }

  /**
   * @override
   * @return {number}
   */
  arrayLength() {
    return this._object.arrayLength();
  }

  /**
   * @override
   * @param {boolean} generatePreview
   * @param {function(?Array.<!SDK.RemoteObjectProperty>, ?Array.<!SDK.RemoteObjectProperty>)} callback
   */
  getOwnProperties(generatePreview, callback) {
    this._object.getOwnProperties(generatePreview, callback);
  }

  /**
   * @override
   * @param {boolean} accessorPropertiesOnly
   * @param {boolean} generatePreview
   * @param {function(?Array<!SDK.RemoteObjectProperty>, ?Array<!SDK.RemoteObjectProperty>)} callback
   */
  getAllProperties(accessorPropertiesOnly, generatePreview, callback) {
    /**
     * @param {?Array.<!SDK.RemoteObjectProperty>} properties
     * @param {?Array.<!SDK.RemoteObjectProperty>} internalProperties
     * @this {Sources.SourceMapNamesResolver.RemoteObject}
     */
    function wrappedCallback(properties, internalProperties) {
      Sources.SourceMapNamesResolver._resolveScope(this._scope)
          .then(resolveNames.bind(null, properties, internalProperties));
    }

    /**
     * @param {?Array.<!SDK.RemoteObjectProperty>} properties
     * @param {?Array.<!SDK.RemoteObjectProperty>} internalProperties
     * @param {!Map<string, string>} namesMapping
     */
    function resolveNames(properties, internalProperties, namesMapping) {
      var newProperties = [];
      if (properties) {
        for (var i = 0; i < properties.length; ++i) {
          var property = properties[i];
          var name = namesMapping.get(property.name) || properties[i].name;
          newProperties.push(new SDK.RemoteObjectProperty(
              name, property.value, property.enumerable, property.writable, property.isOwn, property.wasThrown,
              property.symbol, property.synthetic));
        }
      }

      callback(newProperties, internalProperties);
    }

    this._object.getAllProperties(accessorPropertiesOnly, generatePreview, wrappedCallback.bind(this));
  }

  /**
   * @override
   * @param {string|!Protocol.Runtime.CallArgument} argumentName
   * @param {string} value
   * @return {!Promise<string|undefined>}
   */
  async setPropertyValue(argumentName, value) {
    var namesMapping = await Sources.SourceMapNamesResolver._resolveScope(this._scope);

    var name;
    if (typeof argumentName === 'string')
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
    return this._object.setPropertyValue(actualName, value);
  }

  /**
   * @override
   * @param {!Array.<string>} propertyPath
   * @param {function(?SDK.RemoteObject, boolean=)} callback
   */
  getProperty(propertyPath, callback) {
    this._object.getProperty(propertyPath, callback);
  }

  /**
   * @override
   * @param {!Protocol.Runtime.CallArgument} name
   * @return {!Promise<string|undefined>}
   */
  async deleteProperty(name) {
    return this._object.deleteProperty(name);
  }

  /**
   * @override
   * @param {function(this:Object, ...)} functionDeclaration
   * @param {!Array<!Protocol.Runtime.CallArgument>=} args
   * @param {function(?SDK.RemoteObject, boolean=)=} callback
   */
  callFunction(functionDeclaration, args, callback) {
    this._object.callFunction(functionDeclaration, args, callback);
  }

  /**
   * @override
   * @param {function(this:Object, ...)} functionDeclaration
   * @param {!Array<!Protocol.Runtime.CallArgument>|undefined} args
   * @param {function(*)} callback
   */
  callFunctionJSON(functionDeclaration, args, callback) {
    this._object.callFunctionJSON(functionDeclaration, args, callback);
  }

  /**
   * @override
   */
  release() {
    this._object.release();
  }

  /**
   * @override
   * @return {!SDK.DebuggerModel}
   */
  debuggerModel() {
    return this._object.debuggerModel();
  }

  /**
   * @override
   * @return {!SDK.RuntimeModel}
   */
  runtimeModel() {
    return this._object.runtimeModel();
  }

  /**
   * @override
   * @return {boolean}
   */
  isNode() {
    return this._object.isNode();
  }
};

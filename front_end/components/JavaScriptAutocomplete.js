// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Components.JavaScriptAutocomplete = {};

/** @typedef {{title:(string|undefined), items:Array<string>}} */
Components.JavaScriptAutocomplete.CompletionGroup;

/**
 * @param {string} text
 * @param {string} query
 * @param {boolean=} force
 * @return {!Promise<!UI.SuggestBox.Suggestions>}
 */
Components.JavaScriptAutocomplete.completionsForTextInCurrentContext = function(text, query, force) {
  var index;
  var stopChars = new Set(' =:({;,!+-*/&|^<>`'.split(''));
  for (index = text.length - 1; index >= 0; index--) {
    // Pass less stop characters to rangeOfWord so the range will be a more complete expression.
    if (stopChars.has(text.charAt(index)))
      break;
  }
  var clippedExpression = text.substring(index + 1);
  var bracketCount = 0;

  index = clippedExpression.length - 1;
  while (index >= 0) {
    var character = clippedExpression.charAt(index);
    if (character === ']')
      bracketCount++;
    // Allow an open bracket at the end for property completion.
    if (character === '[' && index < clippedExpression.length - 1) {
      bracketCount--;
      if (bracketCount < 0)
        break;
    }
    index--;
  }
  clippedExpression = clippedExpression.substring(index + 1);

  return Components.JavaScriptAutocomplete.completionsForExpression(clippedExpression, query, force);
};

/**
 * @param {string} expressionString
 * @param {string} query
 * @param {boolean=} force
 * @return {!Promise<!UI.SuggestBox.Suggestions>}
 */
Components.JavaScriptAutocomplete.completionsForExpression = function(expressionString, query, force) {
  var executionContext = UI.context.flavor(SDK.ExecutionContext);
  if (!executionContext)
    return Promise.resolve([]);

  var lastIndex = expressionString.length - 1;

  var dotNotation = (expressionString[lastIndex] === '.');
  var bracketNotation = (expressionString[lastIndex] === '[');

  if (dotNotation || bracketNotation)
    expressionString = expressionString.substr(0, lastIndex);
  else
    expressionString = '';

  // User is entering float value, do not suggest anything.
  if ((expressionString && !isNaN(expressionString)) || (!expressionString && query && !isNaN(query)))
    return Promise.resolve([]);

  // User is creating an array, do not suggest anything.
  if (bracketNotation && !expressionString)
    return Promise.resolve([]);

  if (!query && !expressionString && !force)
    return Promise.resolve([]);

  var fufill;
  var promise = new Promise(x => fufill = x);
  if (!expressionString && executionContext.debuggerModel.selectedCallFrame())
    variableNamesInScopes(executionContext.debuggerModel.selectedCallFrame(), receivedPropertyNames);
  else
    executionContext.evaluate(expressionString, 'completion', true, true, false, false, false, evaluated);

  return promise;
  /**
   * @param {?SDK.RemoteObject} result
   * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
   */
  function evaluated(result, exceptionDetails) {
    if (!result || !!exceptionDetails) {
      fufill([]);
      return;
    }

    /**
     * @param {?SDK.RemoteObject} object
     * @return {!Promise<?SDK.RemoteObject>}
     */
    function extractTarget(object) {
      if (!object)
        return Promise.resolve(/** @type {?SDK.RemoteObject} */ (null));
      if (object.type !== 'object' || object.subtype !== 'proxy')
        return Promise.resolve(/** @type {?SDK.RemoteObject} */ (object));
      return object.getOwnPropertiesPromise().then(extractTargetFromProperties).then(extractTarget);
    }

    /**
     * @param {!{properties: ?Array<!SDK.RemoteObjectProperty>, internalProperties: ?Array<!SDK.RemoteObjectProperty>}} properties
     * @return {?SDK.RemoteObject}
     */
    function extractTargetFromProperties(properties) {
      var internalProperties = properties.internalProperties || [];
      var target = internalProperties.find(property => property.name === '[[Target]]');
      return target ? target.value : null;
    }

    /**
     * @param {string=} type
     * @return {!Object}
     * @suppressReceiverCheck
     * @this {Object}
     */
    function getCompletions(type) {
      var object;
      if (type === 'string')
        object = new String('');
      else if (type === 'number')
        object = new Number(0);
      else if (type === 'boolean')
        object = new Boolean(false);
      else
        object = this;

      var result = [];
      try {
        for (var o = object; o; o = Object.getPrototypeOf(o)) {
          if ((type === 'array' || type === 'typedarray') && o === object && ArrayBuffer.isView(o) && o.length > 9999)
            continue;

          var group = {items: [], __proto__: null};
          try {
            if (typeof o === 'object' && o.constructor && o.constructor.name)
              group.title = o.constructor.name;
          } catch (ee) {
            // we could break upon cross origin check.
          }
          result[result.length] = group;
          var names = Object.getOwnPropertyNames(o);
          var isArray = Array.isArray(o);
          for (var i = 0; i < names.length; ++i) {
            // Skip array elements indexes.
            if (isArray && /^[0-9]/.test(names[i]))
              continue;
            group.items[group.items.length] = names[i];
          }
        }
      } catch (e) {
      }
      return result;
    }

    /**
     * @param {?SDK.RemoteObject} object
     */
    function completionsForObject(object) {
      if (!object) {
        receivedPropertyNames(null);
      } else if (object.type === 'object' || object.type === 'function') {
        object.callFunctionJSON(
            getCompletions, [SDK.RemoteObject.toCallArgument(object.subtype)], receivedPropertyNames);
      } else if (object.type === 'string' || object.type === 'number' || object.type === 'boolean') {
        executionContext.evaluate(
            '(' + getCompletions + ')("' + result.type + '")', 'completion', false, true, true, false, false,
            receivedPropertyNamesFromEval);
      }
    }

    extractTarget(result).then(completionsForObject);
  }

  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {function(!Array<!Components.JavaScriptAutocomplete.CompletionGroup>)} callback
   */
  function variableNamesInScopes(callFrame, callback) {
    var result = [{items: ['this']}];

    /**
     * @param {string} name
     * @param {?Array<!SDK.RemoteObjectProperty>} properties
     */
    function propertiesCollected(name, properties) {
      var group = {title: name, items: []};
      result.push(group);
      for (var i = 0; properties && i < properties.length; ++i)
        group.items.push(properties[i].name);
      if (--pendingRequests === 0)
        callback(result);
    }

    var scopeChain = callFrame.scopeChain();
    var pendingRequests = scopeChain.length;
    for (var i = 0; i < scopeChain.length; ++i) {
      var scope = scopeChain[i];
      var object = scope.object();
      object.getAllProperties(false, propertiesCollected.bind(null, scope.typeName()));
    }
  }

  /**
   * @param {?SDK.RemoteObject} result
   * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
   */
  function receivedPropertyNamesFromEval(result, exceptionDetails) {
    executionContext.target().runtimeAgent().releaseObjectGroup('completion');
    if (result && !exceptionDetails)
      receivedPropertyNames(/** @type {!Object} */ (result.value));
    else
      fufill([]);
  }

  /**
   * @param {?Object} object
   */
  function receivedPropertyNames(object) {
    executionContext.target().runtimeAgent().releaseObjectGroup('completion');
    if (!object) {
      fufill([]);
      return;
    }
    var propertyGroups = /** @type {!Array<!Components.JavaScriptAutocomplete.CompletionGroup>} */ (object);
    var includeCommandLineAPI = (!dotNotation && !bracketNotation);
    if (includeCommandLineAPI) {
      const commandLineAPI = [
        'dir',
        'dirxml',
        'keys',
        'values',
        'profile',
        'profileEnd',
        'monitorEvents',
        'unmonitorEvents',
        'inspect',
        'copy',
        'clear',
        'getEventListeners',
        'debug',
        'undebug',
        'monitor',
        'unmonitor',
        'table',
        '$',
        '$$',
        '$x'
      ];
      propertyGroups.push({items: commandLineAPI});
    }
    fufill(Components.JavaScriptAutocomplete._completionsForQuery(
        dotNotation, bracketNotation, expressionString, query, propertyGroups));
  }
};

/**
   * @param {boolean} dotNotation
   * @param {boolean} bracketNotation
   * @param {string} expressionString
   * @param {string} query
   * @param {!Array<!Components.JavaScriptAutocomplete.CompletionGroup>} propertyGroups
   * @return {!UI.SuggestBox.Suggestions}
   */
Components.JavaScriptAutocomplete._completionsForQuery = function(
    dotNotation, bracketNotation, expressionString, query, propertyGroups) {
  if (bracketNotation) {
    if (query.length && query[0] === '\'')
      var quoteUsed = '\'';
    else
      var quoteUsed = '"';
  }

  if (!expressionString) {
    const keywords = [
      'break', 'case',     'catch',  'continue', 'default',    'delete', 'do',     'else',   'finally',
      'for',   'function', 'if',     'in',       'instanceof', 'new',    'return', 'switch', 'this',
      'throw', 'try',      'typeof', 'var',      'void',       'while',  'with'
    ];
    propertyGroups.push({title: Common.UIString('keywords'), items: keywords});
  }

  var result = [];
  var lastGroupTitle;
  for (var group of propertyGroups) {
    group.items.sort();
    var caseSensitivePrefix = [];
    var caseInsensitivePrefix = [];
    var caseSensitiveAnywhere = [];
    var caseInsensitiveAnywhere = [];

    for (var property of group.items) {
      // Assume that all non-ASCII characters are letters and thus can be used as part of identifier.
      if (!bracketNotation && !/^[a-zA-Z_$\u008F-\uFFFF][a-zA-Z0-9_$\u008F-\uFFFF]*$/.test(property))
        continue;

      if (bracketNotation) {
        if (!/^[0-9]+$/.test(property))
          property = quoteUsed + property.escapeCharacters(quoteUsed + '\\') + quoteUsed;
        property += ']';
      }

      if (property.length < query.length)
        continue;
      if (query.length && property.toLowerCase().indexOf(query.toLowerCase()) === -1)
        continue;
      // Substitute actual newlines with newline characters. @see crbug.com/498421
      var prop = property.split('\n').join('\\n');

      if (property.startsWith(query))
        caseSensitivePrefix.push({title: prop, priority: 4});
      else if (property.toLowerCase().startsWith(query.toLowerCase()))
        caseInsensitivePrefix.push({title: prop, priority: 3});
      else if (property.indexOf(query) !== -1)
        caseSensitiveAnywhere.push({title: prop, priority: 2});
      else
        caseInsensitiveAnywhere.push({title: prop, priority: 1});
    }
    var structuredGroup =
        caseSensitivePrefix.concat(caseInsensitivePrefix, caseSensitiveAnywhere, caseInsensitiveAnywhere);
    if (structuredGroup.length && group.title !== lastGroupTitle) {
      structuredGroup[0].subtitle = group.title;
      lastGroupTitle = group.title;
    }
    result = result.concat(structuredGroup);
  }
  return result;
};

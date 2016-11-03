// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.JavaScriptAutocomplete = {};

/**
 * @param {!Element} proxyElement
 * @param {!Range} wordRange
 * @param {boolean} force
 * @param {function(!Array.<string>, number=)} completionsReadyCallback
 */
WebInspector.JavaScriptAutocomplete.completionsForTextPromptInCurrentContext = function(proxyElement, wordRange, force, completionsReadyCallback) {
  var expressionRange = wordRange.cloneRange();
  expressionRange.collapse(true);
  expressionRange.setStartBefore(proxyElement);
  WebInspector.JavaScriptAutocomplete.completionsForTextInCurrentContext(expressionRange.toString(), wordRange.toString(), force)
    .then(completionsReadyCallback);
};

/**
 * @param {string} text
 * @param {string} completionsPrefix
 * @param {boolean=} force
 * @return {!Promise<!Array<string>>}
 */
WebInspector.JavaScriptAutocomplete.completionsForTextInCurrentContext = function(text, completionsPrefix, force) {
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

  return WebInspector.JavaScriptAutocomplete.completionsForExpression(clippedExpression, completionsPrefix, force);
};


  /**
   * @param {string} expressionString
   * @param {string} prefix
   * @param {boolean=} force
   * @return {!Promise<!Array<string>>}
   */
WebInspector.JavaScriptAutocomplete.completionsForExpression = function(expressionString, prefix, force) {
  var executionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
  if (!executionContext)
    return Promise.resolve([]);

  var lastIndex = expressionString.length - 1;

  var dotNotation = (expressionString[lastIndex] === '.');
  var bracketNotation = (expressionString[lastIndex] === '[');

  if (dotNotation || bracketNotation)
    expressionString = expressionString.substr(0, lastIndex);

  // User is entering float value, do not suggest anything.
  if (expressionString && !isNaN(expressionString))
    return Promise.resolve([]);

  if (!prefix && !expressionString && !force)
    return Promise.resolve([]);

  var fufill;
  var promise = new Promise(x => fufill = x);
  if (!expressionString && executionContext.debuggerModel.selectedCallFrame())
    executionContext.debuggerModel.selectedCallFrame().variableNames(receivedPropertyNames);
  else
    executionContext.evaluate(expressionString, 'completion', true, true, false, false, false, evaluated);

  return promise;
  /**
   * @param {?WebInspector.RemoteObject} result
   * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
   */
  function evaluated(result, exceptionDetails) {
    if (!result || !!exceptionDetails) {
      fufill([]);
      return;
    }

    /**
     * @param {?WebInspector.RemoteObject} object
     * @return {!Promise<?WebInspector.RemoteObject>}
     */
    function extractTarget(object) {
      if (!object)
        return Promise.resolve(/** @type {?WebInspector.RemoteObject} */(null));
      if (object.type !== 'object' || object.subtype !== 'proxy')
        return Promise.resolve(/** @type {?WebInspector.RemoteObject} */(object));
      return object.getOwnPropertiesPromise().then(extractTargetFromProperties).then(extractTarget);
    }

    /**
     * @param {!{properties: ?Array<!WebInspector.RemoteObjectProperty>, internalProperties: ?Array<!WebInspector.RemoteObjectProperty>}} properties
     * @return {?WebInspector.RemoteObject}
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

      var resultSet = { __proto__: null };
      try {
        for (var o = object; o; o = Object.getPrototypeOf(o)) {
          if ((type === 'array' || type === 'typedarray') && o === object && ArrayBuffer.isView(o) && o.length > 9999)
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
     */
    function completionsForObject(object) {
      if (!object)
        receivedPropertyNames(null);
      else if (object.type === 'object' || object.type === 'function')
        object.callFunctionJSON(
          getCompletions, [WebInspector.RemoteObject.toCallArgument(object.subtype)],
          receivedPropertyNames);
      else if (object.type === 'string' || object.type === 'number' || object.type === 'boolean')
        executionContext.evaluate(
          '(' + getCompletions + ')("' + result.type + '")', 'completion', false, true, true, false, false,
          receivedPropertyNamesFromEval);
    }

    extractTarget(result).then(completionsForObject);
  }

  /**
   * @param {?WebInspector.RemoteObject} result
   * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
   */
  function receivedPropertyNamesFromEval(result, exceptionDetails) {
    executionContext.target().runtimeAgent().releaseObjectGroup('completion');
    if (result && !exceptionDetails)
      receivedPropertyNames(/** @type {!Object} */(result.value));
    else
      fufill([]);
  }

  /**
   * @param {?Object} propertyNames
   */
  function receivedPropertyNames(propertyNames) {
    executionContext.target().runtimeAgent().releaseObjectGroup('completion');
    if (!propertyNames) {
      fufill([]);
      return;
    }
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
      for (var i = 0; i < commandLineAPI.length; ++i)
        propertyNames[commandLineAPI[i]] = true;
    }
    fufill(WebInspector.JavaScriptAutocomplete._completionsForPrefix(
      dotNotation, bracketNotation, expressionString, prefix, Object.keys(propertyNames)));
  }
};

  /**
   * @param {boolean} dotNotation
   * @param {boolean} bracketNotation
   * @param {string} expressionString
   * @param {string} prefix
   * @param {!Array.<string>} properties
   * @return {!Array<string>}
   */
WebInspector.JavaScriptAutocomplete._completionsForPrefix = function(dotNotation, bracketNotation, expressionString, prefix, properties) {
  if (bracketNotation) {
    if (prefix.length && prefix[0] === '\'')
      var quoteUsed = '\'';
    else
      var quoteUsed = '"';
  }

  var results = [];

  if (!expressionString) {
    const keywords = [
      'break', 'case', 'catch', 'continue', 'default', 'delete', 'do', 'else', 'finally',
      'for', 'function', 'if', 'in', 'instanceof', 'new', 'return', 'switch', 'this',
      'throw', 'try', 'typeof', 'var', 'void', 'while', 'with'
    ];
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
        property = quoteUsed + property.escapeCharacters(quoteUsed + '\\') + quoteUsed;
      property += ']';
    }

    if (property.length < prefix.length)
      continue;
    if (prefix.length && !property.startsWith(prefix))
      continue;

    // Substitute actual newlines with newline characters. @see crbug.com/498421
    results.push(property.split('\n').join('\\n'));
  }
  return results;
};

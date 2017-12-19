// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

ObjectUI.JavaScriptAutocomplete = class {
  constructor() {
    /** @type {!Map<string, {date: number, value: !Promise<?Object>}>} */
    this._expressionCache = new Map();
    ConsoleModel.consoleModel.addEventListener(
        ConsoleModel.ConsoleModel.Events.CommandEvaluated, this._clearCache, this);
    SDK.targetManager.addModelListener(
        SDK.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextChanged, this._clearCache, this);
    SDK.targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this._clearCache, this);
  }

  _clearCache() {
    this._expressionCache.clear();
  }

  /**
   * @param {string} text
   * @param {string} query
   * @param {boolean=} force
   * @return {!Promise<!UI.SuggestBox.Suggestions>}
   */
  completionsForTextInCurrentContext(text, query, force) {
    var clippedExpression = this._clipExpression(text, true);
    var mapCompletionsPromise = this._mapCompletions(text, query);
    return this._completionsForExpression(clippedExpression, query, force)
        .then(completions => mapCompletionsPromise.then(mapCompletions => mapCompletions.concat(completions)));
  }

  /**
   * @param {string} text
   * @param {boolean=} allowEndingBracket
   * @return {string}
   */
  _clipExpression(text, allowEndingBracket) {
    var index;
    var stopChars = new Set('=:({;,!+-*/&|^<>`'.split(''));
    var whiteSpaceChars = new Set(' \r\n\t'.split(''));
    var continueChars = new Set('[. \r\n\t'.split(''));

    for (index = text.length - 1; index >= 0; index--) {
      if (stopChars.has(text.charAt(index)))
        break;
      if (whiteSpaceChars.has(text.charAt(index)) && !continueChars.has(text.charAt(index - 1)))
        break;
    }
    var clippedExpression = text.substring(index + 1).trim();
    var bracketCount = 0;

    index = clippedExpression.length - 1;
    while (index >= 0) {
      var character = clippedExpression.charAt(index);
      if (character === ']')
        bracketCount++;
      // Allow an open bracket at the end for property completion.
      if (character === '[' && (index < clippedExpression.length - 1 || !allowEndingBracket)) {
        bracketCount--;
        if (bracketCount < 0)
          break;
      }
      index--;
    }
    return clippedExpression.substring(index + 1).trim();
  }

  /**
   * @param {string} text
   * @param {string} query
   * @return {!Promise<!UI.SuggestBox.Suggestions>}
   */
  async _mapCompletions(text, query) {
    var mapMatch = text.match(/\.\s*(get|set|delete)\s*\(\s*$/);
    var executionContext = UI.context.flavor(SDK.ExecutionContext);
    if (!executionContext || !mapMatch)
      return [];

    var clippedExpression = this._clipExpression(text.substring(0, mapMatch.index));
    var result = await executionContext.evaluate(
        {
          expression: clippedExpression,
          objectGroup: 'completion',
          includeCommandLineAPI: true,
          silent: true,
          returnByValue: false,
          generatePreview: false
        },
        /* userGesture */ false, /* awaitPromise */ false);
    if (result.error || !!result.exceptionDetails || result.object.subtype !== 'map')
      return [];
    var properties = await result.object.getOwnPropertiesPromise(false);
    var internalProperties = properties.internalProperties || [];
    var entriesProperty = internalProperties.find(property => property.name === '[[Entries]]');
    if (!entriesProperty)
      return [];
    var keysObj = await entriesProperty.value.callFunctionJSONPromise(getEntries);
    return gotKeys(Object.keys(keysObj));

    /**
     * @suppressReceiverCheck
     * @this {!Array<{key:?, value:?}>}
     * @return {!Object}
     */
    function getEntries() {
      var result = {__proto__: null};
      for (var i = 0; i < this.length; i++) {
        if (typeof this[i].key === 'string')
          result[this[i].key] = true;
      }
      return result;
    }

    /**
     * @param {!Array<string>} rawKeys
     * @return {!UI.SuggestBox.Suggestions}
     */
    function gotKeys(rawKeys) {
      var caseSensitivePrefix = [];
      var caseInsensitivePrefix = [];
      var caseSensitiveAnywhere = [];
      var caseInsensitiveAnywhere = [];
      var quoteChar = '"';
      if (query.startsWith('\''))
        quoteChar = '\'';
      var endChar = ')';
      if (mapMatch[0].indexOf('set') !== -1)
        endChar = ', ';

      var sorter = rawKeys.length < 1000 ? String.naturalOrderComparator : undefined;
      var keys = rawKeys.sort(sorter).map(key => quoteChar + key + quoteChar);

      for (var key of keys) {
        if (key.length < query.length)
          continue;
        if (query.length && key.toLowerCase().indexOf(query.toLowerCase()) === -1)
          continue;
        // Substitute actual newlines with newline characters. @see crbug.com/498421
        var title = key.split('\n').join('\\n');
        var text = title + endChar;

        if (key.startsWith(query))
          caseSensitivePrefix.push({text: text, title: title, priority: 4});
        else if (key.toLowerCase().startsWith(query.toLowerCase()))
          caseInsensitivePrefix.push({text: text, title: title, priority: 3});
        else if (key.indexOf(query) !== -1)
          caseSensitiveAnywhere.push({text: text, title: title, priority: 2});
        else
          caseInsensitiveAnywhere.push({text: text, title: title, priority: 1});
      }
      var suggestions =
          caseSensitivePrefix.concat(caseInsensitivePrefix, caseSensitiveAnywhere, caseInsensitiveAnywhere);
      if (suggestions.length)
        suggestions[0].subtitle = Common.UIString('Keys');
      return suggestions;
    }
  }

  /**
   * @param {string} expressionString
   * @param {string} query
   * @param {boolean=} force
   * @return {!Promise<!UI.SuggestBox.Suggestions>}
   */
  async _completionsForExpression(expressionString, query, force) {
    var executionContext = UI.context.flavor(SDK.ExecutionContext);
    if (!executionContext)
      return [];

    var lastIndex = expressionString.length - 1;

    var dotNotation = (expressionString[lastIndex] === '.');
    var bracketNotation = (expressionString.length > 1 && expressionString[lastIndex] === '[');

    if (dotNotation || bracketNotation)
      expressionString = expressionString.substr(0, lastIndex);
    else
      expressionString = '';

    // User is entering float value, do not suggest anything.
    if ((expressionString && !isNaN(expressionString)) || (!expressionString && query && !isNaN(query)))
      return [];


    if (!query && !expressionString && !force)
      return [];
    var selectedFrame = executionContext.debuggerModel.selectedCallFrame();
    var completionGroups;
    var TEN_SECONDS = 10000;
    var cache = this._expressionCache.get(expressionString);
    if (cache && cache.date + TEN_SECONDS > Date.now()) {
      completionGroups = await cache.value;
    } else if (!expressionString && selectedFrame) {
      cache = {date: Date.now(), value: completionsOnPause(selectedFrame)};
      this._expressionCache.set(expressionString, cache);
      completionGroups = await cache.value;
    } else {
      var resultPromise = executionContext.evaluate(
          {
            expression: expressionString,
            objectGroup: 'completion',
            includeCommandLineAPI: true,
            silent: true,
            returnByValue: false,
            generatePreview: false
          },
          /* userGesture */ false, /* awaitPromise */ false);
      cache = {date: Date.now(), value: resultPromise.then(result => completionsOnGlobal.call(this, result))};
      this._expressionCache.set(expressionString, cache);
      completionGroups = await cache.value;
    }
    return this._receivedPropertyNames(completionGroups, dotNotation, bracketNotation, expressionString, query);

    /**
     * @this {ObjectUI.JavaScriptAutocomplete}
     * @param {!SDK.RuntimeModel.EvaluationResult} result
     * @return {!Promise<!Array<!ObjectUI.JavaScriptAutocomplete.CompletionGroup>>}
     */
    async function completionsOnGlobal(result) {
      if (result.error || !!result.exceptionDetails || !result.object)
        return [];

      var object = result.object;
      while (object && object.type === 'object' && object.subtype === 'proxy') {
        var properties = await object.getOwnPropertiesPromise(false /* generatePreview */);
        var internalProperties = properties.internalProperties || [];
        var target = internalProperties.find(property => property.name === '[[Target]]');
        object = target ? target.value : null;
      }
      if (!object)
        return [];
      var completions = [];
      if (object.type === 'object' || object.type === 'function') {
        completions =
            await object.callFunctionJSONPromise(getCompletions, [SDK.RemoteObject.toCallArgument(object.subtype)]) ||
            [];
      } else if (object.type === 'string' || object.type === 'number' || object.type === 'boolean') {
        var evaluateResult = await executionContext.evaluate(
            {
              expression: '(' + getCompletions + ')("' + object.type + '")',
              objectGroup: 'completion',
              includeCommandLineAPI: false,
              silent: true,
              returnByValue: true,
              generatePreview: false
            },
            /* userGesture */ false,
            /* awaitPromise */ false);
        if (evaluateResult.object && !evaluateResult.exceptionDetails)
          completions = evaluateResult.object.value || [];
      }
      executionContext.runtimeModel.releaseObjectGroup('completion');

      if (!expressionString) {
        var globalNames = await executionContext.globalLexicalScopeNames();
        // Merge lexical scope names with first completion group on global object: var a and let b should be in the same group.
        if (completions.length)
          completions[0].items = completions[0].items.concat(globalNames);
        else
          completions.push({items: globalNames.sort(), title: Common.UIString('Lexical scope variables')});
      }

      for (var group of completions) {
        for (var i = 0; i < group.items.length; i++)
          group.items[i] = group.items[i].replace(/\n/g, '\\n');

        group.items.sort(group.items.length < 1000 ? this._itemComparator : undefined);
      }

      return completions;

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
            if ((type === 'array' || type === 'typedarray') && o === object && o.length > 9999)
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
    }

    /**
     * @param {!SDK.DebuggerModel.CallFrame} callFrame
     * @return {!Promise<?Object>}
     */
    async function completionsOnPause(callFrame) {
      var result = [{items: ['this']}];
      var scopeChain = callFrame.scopeChain();
      var groupPromises = [];
      for (var scope of scopeChain) {
        groupPromises.push(scope.object()
                               .getAllPropertiesPromise(false /* accessorPropertiesOnly */, false /* generatePreview */)
                               .then(result => ({properties: result.properties, name: scope.name()})));
      }
      var fullScopes = await Promise.all(groupPromises);
      executionContext.runtimeModel.releaseObjectGroup('completion');
      for (var scope of fullScopes)
        result.push({title: scope.name, items: scope.properties.map(property => property.name).sort()});
      return result;
    }
  }

  /**
   * @param {?Array<!ObjectUI.JavaScriptAutocomplete.CompletionGroup>} propertyGroups
   * @param {boolean} dotNotation
   * @param {boolean} bracketNotation
   * @param {string} expressionString
   * @param {string} query
   * @return {!UI.SuggestBox.Suggestions}
   */
  _receivedPropertyNames(propertyGroups, dotNotation, bracketNotation, expressionString, query) {
    if (!propertyGroups)
      return [];
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
        'queryObjects',
        '$',
        '$$',
        '$x'
      ];
      propertyGroups.push({items: commandLineAPI});
    }
    return this._completionsForQuery(dotNotation, bracketNotation, expressionString, query, propertyGroups);
  }

  /**
     * @param {boolean} dotNotation
     * @param {boolean} bracketNotation
     * @param {string} expressionString
     * @param {string} query
     * @param {!Array<!ObjectUI.JavaScriptAutocomplete.CompletionGroup>} propertyGroups
     * @return {!UI.SuggestBox.Suggestions}
     */
  _completionsForQuery(dotNotation, bracketNotation, expressionString, query, propertyGroups) {
    var quoteUsed = (bracketNotation && query.startsWith('\'')) ? '\'' : '"';

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
    var regex = /^[a-zA-Z_$\u008F-\uFFFF][a-zA-Z0-9_$\u008F-\uFFFF]*$/;
    var lowerCaseQuery = query.toLowerCase();
    for (var group of propertyGroups) {
      var caseSensitivePrefix = [];
      var caseInsensitivePrefix = [];
      var caseSensitiveAnywhere = [];
      var caseInsensitiveAnywhere = [];

      for (var i = 0; i < group.items.length; i++) {
        var property = group.items[i];
        // Assume that all non-ASCII characters are letters and thus can be used as part of identifier.
        if (!bracketNotation && !regex.test(property))
          continue;

        if (bracketNotation) {
          if (!/^[0-9]+$/.test(property))
            property = quoteUsed + property.escapeCharacters(quoteUsed + '\\') + quoteUsed;
          property += ']';
        }

        if (property.length < query.length)
          continue;
        var lowerCaseProperty = property.toLowerCase();
        if (query.length && lowerCaseProperty.indexOf(lowerCaseQuery) === -1)
          continue;

        if (property.startsWith(query))
          caseSensitivePrefix.push({text: property, priority: 4});
        else if (lowerCaseProperty.startsWith(lowerCaseQuery))
          caseInsensitivePrefix.push({text: property, priority: 3});
        else if (property.indexOf(query) !== -1)
          caseSensitiveAnywhere.push({text: property, priority: 2});
        else
          caseInsensitiveAnywhere.push({text: property, priority: 1});
      }
      var structuredGroup =
          caseSensitivePrefix.concat(caseInsensitivePrefix, caseSensitiveAnywhere, caseInsensitiveAnywhere);
      if (structuredGroup.length && group.title !== lastGroupTitle) {
        structuredGroup[0].subtitle = group.title;
        lastGroupTitle = group.title;
      }
      result = result.concat(structuredGroup);
      result.forEach(item => {
        if (item.text.endsWith(']'))
          item.title = item.text.substring(0, item.text.length - 1);
      });
    }
    return result;
  }

  /**
   * @param {string} a
   * @param {string} b
   * @return {number}
   */
  _itemComparator(a, b) {
    var aStartsWithUnderscore = a.startsWith('_');
    var bStartsWithUnderscore = b.startsWith('_');
    if (aStartsWithUnderscore && !bStartsWithUnderscore)
      return 1;
    if (bStartsWithUnderscore && !aStartsWithUnderscore)
      return -1;
    return String.naturalOrderComparator(a, b);
  }
};

/** @typedef {{title:(string|undefined), items:Array<string>}} */
ObjectUI.JavaScriptAutocomplete.CompletionGroup;

ObjectUI.javaScriptAutocomplete = new ObjectUI.JavaScriptAutocomplete();
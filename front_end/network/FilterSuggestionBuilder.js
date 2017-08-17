/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
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

Network.FilterSuggestionBuilder = class {
  /**
   * @param {!Array.<string>} keys
   */
  constructor(keys) {
    this._keys = keys;
    this._valueSets = {};
    this._valueLists = {};
  }

  /**
   * @param {string} expression
   * @param {string} prefix
   * @param {boolean=} force
   * @return {!Promise<!UI.SuggestBox.Suggestions>}
   */
  completions(expression, prefix, force) {
    if (!prefix && !force)
      return Promise.resolve([]);

    var negative = prefix.startsWith('-');
    if (negative)
      prefix = prefix.substring(1);
    var modifier = negative ? '-' : '';
    var valueDelimiterIndex = prefix.indexOf(':');

    var suggestions = [];
    if (valueDelimiterIndex === -1) {
      var matcher = new RegExp('^' + prefix.escapeForRegExp(), 'i');
      for (var j = 0; j < this._keys.length; ++j) {
        if (this._keys[j].match(matcher))
          suggestions.push({text: modifier + this._keys[j] + ':'});
      }
    } else {
      var key = prefix.substring(0, valueDelimiterIndex).toLowerCase();
      var value = prefix.substring(valueDelimiterIndex + 1);
      var matcher = new RegExp('^' + value.escapeForRegExp(), 'i');
      var items = this._values(key);
      for (var i = 0; i < items.length; ++i) {
        if (items[i].match(matcher) && (items[i] !== value))
          suggestions.push({text: modifier + key + ':' + items[i]});
      }
    }
    return Promise.resolve(suggestions);
  }

  /**
   * @param {string} key
   * @return {!Array.<string>}
   */
  _values(key) {
    var result = /** @type {!Array<string>} */ (this._valueLists[key]);

    if (!result)
      return [];

    if (key === Network.NetworkLogView.FilterType.Priority) {
      var resultSet = new Set(result);
      result = [];
      /** @type {!Map<number, !Protocol.Network.ResourcePriority>} */
      var numericToPriorityMap = new Map();
      NetworkPriorities.prioritySymbolToNumericMap().forEach((value, key) => numericToPriorityMap.set(value, key));
      var sortedNumericPriorities = numericToPriorityMap.keysArray();
      sortedNumericPriorities.sortNumbers();
      var sortedPriorities = sortedNumericPriorities.map(value => numericToPriorityMap.get(value));
      var sortedPriorityLabels = sortedPriorities.map(value => NetworkPriorities.uiLabelForPriority(value));

      for (var value of sortedPriorityLabels) {
        if (!resultSet.has(value))
          continue;
        result.push(value);
      }
    } else {
      result.sort();
    }

    return result;
  }

  /**
   * @param {string} key
   * @param {?string=} value
   */
  addItem(key, value) {
    if (!value)
      return;

    var set = this._valueSets[key];
    var list = this._valueLists[key];
    if (!set) {
      set = {};
      this._valueSets[key] = set;
      list = [];
      this._valueLists[key] = list;
    }

    if (set[value])
      return;

    set[value] = true;
    list.push(value);
  }
};

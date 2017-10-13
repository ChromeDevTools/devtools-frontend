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
   * @param {!Array<string>} keys
   * @param {function(string, !Array<string>)=} valueSorter
   */
  constructor(keys, valueSorter) {
    this._keys = keys;
    this._valueSorter = valueSorter || ((key, result) => result.sort());
    /** @type {!Map<string, !Set<string>>} */
    this._valuesMap = new Map();
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
      for (var key of this._keys) {
        if (matcher.test(key))
          suggestions.push({text: modifier + key + ':'});
      }
    } else {
      var key = prefix.substring(0, valueDelimiterIndex).toLowerCase();
      var value = prefix.substring(valueDelimiterIndex + 1);
      var matcher = new RegExp('^' + value.escapeForRegExp(), 'i');
      var values = Array.from(this._valuesMap.get(key) || new Set());
      this._valueSorter(key, values);
      for (var item of values) {
        if (matcher.test(item) && (item !== value))
          suggestions.push({text: modifier + key + ':' + item});
      }
    }
    return Promise.resolve(suggestions);
  }

  /**
   * @param {string} key
   * @param {?string=} value
   */
  addItem(key, value) {
    if (!value)
      return;

    if (!this._valuesMap.get(key))
      this._valuesMap.set(key, /** @type {!Set<string>} */ (new Set()));
    this._valuesMap.get(key).add(value);
  }
};

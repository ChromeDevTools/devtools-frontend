// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';           // eslint-disable-line no-unused-vars
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {Workspace.Workspace.ProjectSearchConfig}
 */
export class SearchConfig {
  /**
   * @param {string} query
   * @param {boolean} ignoreCase
   * @param {boolean} isRegex
   */
  constructor(query, ignoreCase, isRegex) {
    this._query = query;
    this._ignoreCase = ignoreCase;
    this._isRegex = isRegex;
    this._parse();
  }

  /**
   * @param {{query: string, ignoreCase: boolean, isRegex: boolean}} object
   * @return {!SearchConfig}
   */
  static fromPlainObject(object) {
    return new SearchConfig(object.query, object.ignoreCase, object.isRegex);
  }

  /**
   * @override
   * @return {string}
   */
  query() {
    return this._query;
  }

  /**
   * @override
   * @return {boolean}
   */
  ignoreCase() {
    return this._ignoreCase;
  }

  /**
   * @override
   * @return {boolean}
   */
  isRegex() {
    return this._isRegex;
  }

  /**
   * @return {{query: string, ignoreCase: boolean, isRegex: boolean}}
   */
  toPlainObject() {
    return {query: this.query(), ignoreCase: this.ignoreCase(), isRegex: this.isRegex()};
  }

  _parse() {
    // Inside double quotes: any symbol except double quote and backslash or any symbol escaped with a backslash.
    const quotedPattern = /"([^\\"]|\\.)+"/;
    // A word is a sequence of any symbols except space and backslash or any symbols escaped with a backslash, that does not start with file:.
    const unquotedWordPattern = /(\s*(?!-?f(ile)?:)[^\\ ]|\\.)+/;
    const unquotedPattern = unquotedWordPattern.source + '(\\s+' + unquotedWordPattern.source + ')*';


    const pattern = [
      '(\\s*' + FilePatternRegex.source + '\\s*)',
      '(' + quotedPattern.source + ')',
      '(' + unquotedPattern + ')',
    ].join('|');
    const regexp = new RegExp(pattern, 'g');
    const queryParts = this._query.match(regexp) || [];
    /**
     * @type {!Array.<!QueryTerm>}
     */
    this._fileQueries = [];

    /**
     * @type {!Array.<string>}
     */
    this._queries = [];

    for (let i = 0; i < queryParts.length; ++i) {
      const queryPart = queryParts[i];
      if (!queryPart) {
        continue;
      }
      const fileQuery = this._parseFileQuery(queryPart);
      if (fileQuery) {
        this._fileQueries.push(fileQuery);
        /** @type {!Array.<!RegexQuery>} */
        this._fileRegexQueries = this._fileRegexQueries || [];
        this._fileRegexQueries.push(
            {regex: new RegExp(fileQuery.text, this.ignoreCase ? 'i' : ''), isNegative: fileQuery.isNegative});
        continue;
      }
      if (this._isRegex) {
        this._queries.push(queryPart);
        continue;
      }
      if (queryPart.startsWith('"')) {
        if (!queryPart.endsWith('"')) {
          continue;
        }
        this._queries.push(this._parseQuotedQuery(queryPart));
        continue;
      }
      this._queries.push(this._parseUnquotedQuery(queryPart));
    }
  }

  /**
   * @override
   * @param {string} filePath
   * @return {boolean}
   */
  filePathMatchesFileQuery(filePath) {
    if (!this._fileRegexQueries) {
      return true;
    }
    for (let i = 0; i < this._fileRegexQueries.length; ++i) {
      if (!!filePath.match(this._fileRegexQueries[i].regex) === this._fileRegexQueries[i].isNegative) {
        return false;
      }
    }
    return true;
  }

  /**
   * @override
   * @return {!Array.<string>}
   */
  queries() {
    return this._queries;
  }

  _parseUnquotedQuery(query) {
    return query.replace(/\\(.)/g, '$1');
  }

  _parseQuotedQuery(query) {
    return query.substring(1, query.length - 1).replace(/\\(.)/g, '$1');
  }

  /**
   * @param {string} query
   * @return {?QueryTerm}
   */
  _parseFileQuery(query) {
    const match = query.match(FilePatternRegex);
    if (!match) {
      return null;
    }
    const isNegative = !!match[1];
    query = match[3];
    let result = '';
    for (let i = 0; i < query.length; ++i) {
      const char = query[i];
      if (char === '*') {
        result += '.*';
      } else if (char === '\\') {
        ++i;
        const nextChar = query[i];
        if (nextChar === ' ') {
          result += ' ';
        }
      } else {
        if (String.regexSpecialCharacters().indexOf(query.charAt(i)) !== -1) {
          result += '\\';
        }
        result += query.charAt(i);
      }
    }
    return new QueryTerm(result, isNegative);
  }
}

// After file: prefix: any symbol except space and backslash or any symbol escaped with a backslash.
export const FilePatternRegex = /(-)?f(ile)?:((?:[^\\ ]|\\.)+)/;

export class QueryTerm {
  /**
   * @param {string} text
   * @param {boolean} isNegative
   */
  constructor(text, isNegative) {
    this.text = text;
    this.isNegative = isNegative;
  }
}

/**
 * @interface
 */
export class SearchResult {
  /**
   * @return {string}
   */
  label() {
  }

  /**
   * @return {string}
   */
  description() {
  }

  /**
   * @return {number}
   */
  matchesCount() {
  }

  /**
   * @param {number} index
   * @return {string}
   */
  matchLabel(index) {
  }

  /**
   * @param {number} index
   * @return {string}
   */
  matchLineContent(index) {
  }

  /**
   * @param {number} index
   * @return {!Object}
   */
  matchRevealable(index) {}
}

/**
 * @interface
 */
export class SearchScope {
  /**
   * @param {!SearchConfig} searchConfig
   * @param {!Common.Progress.Progress} progress
   * @param {function(!SearchResult)} searchResultCallback
   * @param {function(boolean)} searchFinishedCallback
   */
  performSearch(searchConfig, progress, searchResultCallback, searchFinishedCallback) {
  }

  /**
   * @param {!Common.Progress.Progress} progress
   */
  performIndexing(progress) {
  }

  stopSearch() {}
}

/** @typedef {!{regex: !RegExp, isNegative: boolean}} */
export let RegexQuery;

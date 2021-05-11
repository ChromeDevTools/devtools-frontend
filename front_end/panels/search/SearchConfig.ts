// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../../core/common/common.js'; // eslint-disable-line no-unused-vars
import * as Platform from '../../core/platform/platform.js';
import type * as Workspace from '../../models/workspace/workspace.js'; // eslint-disable-line no-unused-vars

export class SearchConfig implements Workspace.Workspace.ProjectSearchConfig {
  _query: string;
  _ignoreCase: boolean;
  _isRegex: boolean;
  _fileQueries?: QueryTerm[];
  _queries?: string[];
  _fileRegexQueries?: RegexQuery[];
  constructor(query: string, ignoreCase: boolean, isRegex: boolean) {
    this._query = query;
    this._ignoreCase = ignoreCase;
    this._isRegex = isRegex;
    this._parse();
  }

  static fromPlainObject(object: {
    query: string,
    ignoreCase: boolean,
    isRegex: boolean,
  }): SearchConfig {
    return new SearchConfig(object.query, object.ignoreCase, object.isRegex);
  }

  query(): string {
    return this._query;
  }

  ignoreCase(): boolean {
    return this._ignoreCase;
  }

  isRegex(): boolean {
    return this._isRegex;
  }

  toPlainObject(): {
    query: string,
    ignoreCase: boolean,
    isRegex: boolean,
  } {
    return {query: this.query(), ignoreCase: this.ignoreCase(), isRegex: this.isRegex()};
  }

  _parse(): void {
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
    this._fileQueries = [];

    this._queries = [];

    for (let i = 0; i < queryParts.length; ++i) {
      const queryPart = queryParts[i];
      if (!queryPart) {
        continue;
      }
      const fileQuery = this._parseFileQuery(queryPart);
      if (fileQuery) {
        this._fileQueries.push(fileQuery);
        this._fileRegexQueries = this._fileRegexQueries || [];
        this._fileRegexQueries.push(
            {regex: new RegExp(fileQuery.text, this.ignoreCase() ? 'i' : ''), isNegative: fileQuery.isNegative});
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

  filePathMatchesFileQuery(filePath: string): boolean {
    if (!this._fileRegexQueries) {
      return true;
    }
    for (let i = 0; i < this._fileRegexQueries.length; ++i) {
      if (Boolean(filePath.match(this._fileRegexQueries[i].regex)) === this._fileRegexQueries[i].isNegative) {
        return false;
      }
    }
    return true;
  }

  queries(): string[] {
    return this._queries || [];
  }

  _parseUnquotedQuery(query: string): string {
    return query.replace(/\\(.)/g, '$1');
  }

  _parseQuotedQuery(query: string): string {
    return query.substring(1, query.length - 1).replace(/\\(.)/g, '$1');
  }

  _parseFileQuery(query: string): QueryTerm|null {
    const match = query.match(FilePatternRegex);
    if (!match) {
      return null;
    }
    const isNegative = Boolean(match[1]);
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
        if (Platform.StringUtilities.regexSpecialCharacters().indexOf(query.charAt(i)) !== -1) {
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
  text: string;
  isNegative: boolean;
  constructor(text: string, isNegative: boolean) {
    this.text = text;
    this.isNegative = isNegative;
  }
}

/**
 * @interface
 */
export interface SearchResult {
  label(): string;

  description(): string;

  matchesCount(): number;

  matchLabel(index: number): string;

  matchLineContent(index: number): string;

  matchRevealable(index: number): Object;
}

/**
 * @interface
 */
export interface SearchScope {
  performSearch(
      searchConfig: SearchConfig, progress: Common.Progress.Progress,
      searchResultCallback: (arg0: SearchResult) => void,
      searchFinishedCallback: (arg0: boolean) => void): void|Promise<void>;

  performIndexing(progress: Common.Progress.Progress): void;

  stopSearch(): void;
}
export interface RegexQuery {
  regex: RegExp;
  isNegative: boolean;
}

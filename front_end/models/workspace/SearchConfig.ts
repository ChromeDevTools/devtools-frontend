// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';

export class SearchConfig {
  readonly #query: string;
  readonly #ignoreCase: boolean;
  readonly #isRegex: boolean;

  readonly #queries: string[];
  readonly #fileRegexQueries: RegexQuery[];

  constructor(query: string, ignoreCase: boolean, isRegex: boolean) {
    this.#query = query;
    this.#ignoreCase = ignoreCase;
    this.#isRegex = isRegex;

    const {queries, fileRegexQueries} = SearchConfig.#parse(query, ignoreCase, isRegex);
    this.#queries = queries;
    this.#fileRegexQueries = fileRegexQueries;
  }

  static fromPlainObject(object: {
    query: string,
    ignoreCase: boolean,
    isRegex: boolean,
  }): SearchConfig {
    return new SearchConfig(object.query, object.ignoreCase, object.isRegex);
  }

  filePathMatchesFileQuery(filePath: Platform.DevToolsPath.RawPathString|
                           Platform.DevToolsPath.EncodedPathString|Platform.DevToolsPath.UrlString): boolean {
    return this.#fileRegexQueries.every(({regex, shouldMatch}) => (Boolean(filePath.match(regex)) === shouldMatch));
  }

  queries(): string[] {
    return this.#queries;
  }

  query(): string {
    return this.#query;
  }

  ignoreCase(): boolean {
    return this.#ignoreCase;
  }

  isRegex(): boolean {
    return this.#isRegex;
  }

  toPlainObject(): {
    query: string,
    ignoreCase: boolean,
    isRegex: boolean,
  } {
    return {query: this.query(), ignoreCase: this.ignoreCase(), isRegex: this.isRegex()};
  }

  static #parse(query: string, ignoreCase: boolean, isRegex: boolean):
      {queries: string[], fileRegexQueries: RegexQuery[]} {
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
    const queryParts = query.match(regexp) || [];

    const queries: string[] = [];
    const fileRegexQueries: RegexQuery[] = [];

    for (const queryPart of queryParts) {
      if (!queryPart) {
        continue;
      }
      const fileQuery = SearchConfig.#parseFileQuery(queryPart);
      if (fileQuery) {
        const regex = new RegExp(fileQuery.text, ignoreCase ? 'i' : '');
        fileRegexQueries.push({regex, shouldMatch: fileQuery.shouldMatch});
      } else if (isRegex) {
        queries.push(queryPart);
      } else if (queryPart.startsWith('"') && queryPart.endsWith('"')) {
        queries.push(SearchConfig.#parseQuotedQuery(queryPart));
      } else {
        queries.push(SearchConfig.#parseUnquotedQuery(queryPart));
      }
    }

    return {queries, fileRegexQueries};
  }

  static #parseUnquotedQuery(query: string): string {
    return query.replace(/\\(.)/g, '$1');
  }

  static #parseQuotedQuery(query: string): string {
    return query.substring(1, query.length - 1).replace(/\\(.)/g, '$1');
  }

  static #parseFileQuery(query: string): QueryTerm|null {
    const match = query.match(FilePatternRegex);
    if (!match) {
      return null;
    }
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
    const shouldMatch = !Boolean(match[1]);
    return {text: result, shouldMatch};
  }
}

// After file: prefix: any symbol except space and backslash or any symbol escaped with a backslash.
const FilePatternRegex = /(-)?f(ile)?:((?:[^\\ ]|\\.)+)/;

interface QueryTerm {
  text: string;
  shouldMatch: boolean;
}

interface RegexQuery {
  regex: RegExp;
  shouldMatch: boolean;
}

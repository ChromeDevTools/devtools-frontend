// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import type * as Workspace from '../../models/workspace/workspace.js';

export class SearchConfig implements Workspace.Workspace.ProjectSearchConfig {
  private readonly queryInternal: string;
  private readonly ignoreCaseInternal: boolean;
  private readonly isRegexInternal: boolean;
  private fileQueries?: QueryTerm[];
  private queriesInternal?: string[];
  private fileRegexQueries?: RegexQuery[];
  constructor(query: string, ignoreCase: boolean, isRegex: boolean) {
    this.queryInternal = query;
    this.ignoreCaseInternal = ignoreCase;
    this.isRegexInternal = isRegex;
    this.parse();
  }

  static fromPlainObject(object: {
    query: string,
    ignoreCase: boolean,
    isRegex: boolean,
  }): SearchConfig {
    return new SearchConfig(object.query, object.ignoreCase, object.isRegex);
  }

  query(): string {
    return this.queryInternal;
  }

  ignoreCase(): boolean {
    return this.ignoreCaseInternal;
  }

  isRegex(): boolean {
    return this.isRegexInternal;
  }

  toPlainObject(): {
    query: string,
    ignoreCase: boolean,
    isRegex: boolean,
  } {
    return {query: this.query(), ignoreCase: this.ignoreCase(), isRegex: this.isRegex()};
  }

  private parse(): void {
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
    const queryParts = this.queryInternal.match(regexp) || [];
    this.fileQueries = [];

    this.queriesInternal = [];

    for (let i = 0; i < queryParts.length; ++i) {
      const queryPart = queryParts[i];
      if (!queryPart) {
        continue;
      }
      const fileQuery = this.parseFileQuery(queryPart);
      if (fileQuery) {
        this.fileQueries.push(fileQuery);
        this.fileRegexQueries = this.fileRegexQueries || [];
        this.fileRegexQueries.push(
            {regex: new RegExp(fileQuery.text, this.ignoreCase() ? 'i' : ''), isNegative: fileQuery.isNegative});
        continue;
      }
      if (this.isRegexInternal) {
        this.queriesInternal.push(queryPart);
        continue;
      }
      if (queryPart.startsWith('"')) {
        if (!queryPart.endsWith('"')) {
          continue;
        }
        this.queriesInternal.push(this.parseQuotedQuery(queryPart));
        continue;
      }
      this.queriesInternal.push(this.parseUnquotedQuery(queryPart));
    }
  }

  filePathMatchesFileQuery(filePath: Platform.DevToolsPath.RawPathString|
                           Platform.DevToolsPath.EncodedPathString|Platform.DevToolsPath.UrlString): boolean {
    if (!this.fileRegexQueries) {
      return true;
    }
    for (let i = 0; i < this.fileRegexQueries.length; ++i) {
      if (Boolean(filePath.match(this.fileRegexQueries[i].regex)) === this.fileRegexQueries[i].isNegative) {
        return false;
      }
    }
    return true;
  }

  queries(): string[] {
    return this.queriesInternal || [];
  }

  private parseUnquotedQuery(query: string): string {
    return query.replace(/\\(.)/g, '$1');
  }

  private parseQuotedQuery(query: string): string {
    return query.substring(1, query.length - 1).replace(/\\(.)/g, '$1');
  }

  private parseFileQuery(query: string): QueryTerm|null {
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

export interface SearchResult {
  label(): string;

  description(): string;

  matchesCount(): number;

  matchLabel(index: number): string;

  matchLineContent(index: number): string;

  matchRevealable(index: number): Object;
}

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

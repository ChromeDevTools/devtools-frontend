// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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
 *     * Neither the #name of Google Inc. nor the names of its
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

import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';

import {type CallFrame, type ScopeChainEntry} from './DebuggerModel.js';
import {SourceMapScopesInfo} from './SourceMapScopesInfo.js';

/**
 * Type of the base source map JSON object, which contains the sources and the mappings at the very least, plus
 * some additional fields.
 *
 * @see {@link SourceMapV3}
 * @see {@link https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k Source Map Revision 3 Proposal}
 */
export type SourceMapV3Object = {
  /* eslint-disable @typescript-eslint/naming-convention */
  'version': number,
  'sources': string[],
  'mappings': string,

  'file'?: string,
  'sourceRoot'?: string,
  'sourcesContent'?: (string|null)[],

  'names'?: string[],
  'ignoreList'?: number[],
  'originalScopes'?: string[],
  'generatedRanges'?: string,
  'x_google_linecount'?: number,
  'x_google_ignoreList'?: number[],
  'x_com_bloomberg_sourcesFunctionMappings'?: string[],
  /* eslint-enable @typescript-eslint/naming-convention */
};

/**
 * Type of JSON objects that classify as valid sourcemaps per version 3 of the specification.
 *
 * We support both possible formats, the traditional source map object (represented by the {@link SourceMapV3Object} type),
 * as well as the index map format, which consists of a sequence of sections that each hold source maps objects themselves
 * or URLs to external source map files.
 *
 * @see {@link SourceMapV3Object}
 * @see {@link https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k Source Map Revision 3 Proposal}
 */
export type SourceMapV3 = SourceMapV3Object|{
  // clang-format off
  'version': number,
  'file'?: string,
  'sections': ({
    'offset': {line: number, column: number},
    'map': SourceMapV3Object,
  } | {
    'offset': {line: number, column: number},
    'url': string,
  })[],
  // clang-format on
};

/**
 * Parses the {@link content} as JSON, ignoring BOM markers in the beginning, and
 * also handling the CORB bypass prefix correctly.
 *
 * @param content the string representation of a sourcemap.
 * @returns the {@link SourceMapV3} representation of the {@link content}.
 */
export function parseSourceMap(content: string): SourceMapV3 {
  if (content.startsWith(')]}')) {
    content = content.substring(content.indexOf('\n'));
  }
  if (content.charCodeAt(0) === 0xFEFF) {
    // Strip BOM at the beginning before parsing the JSON.
    content = content.slice(1);
  }
  return JSON.parse(content) as SourceMapV3;
}

export class SourceMapEntry {
  readonly lineNumber: number;
  readonly columnNumber: number;
  readonly sourceIndex?: number;
  readonly sourceURL: Platform.DevToolsPath.UrlString|undefined;
  readonly sourceLineNumber: number;
  readonly sourceColumnNumber: number;
  readonly name: string|undefined;

  constructor(
      lineNumber: number, columnNumber: number, sourceIndex?: number, sourceURL?: Platform.DevToolsPath.UrlString,
      sourceLineNumber?: number, sourceColumnNumber?: number, name?: string) {
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
    this.sourceIndex = sourceIndex;
    this.sourceURL = sourceURL;
    this.sourceLineNumber = (sourceLineNumber as number);
    this.sourceColumnNumber = (sourceColumnNumber as number);
    this.name = name;
  }

  static compare(entry1: SourceMapEntry, entry2: SourceMapEntry): number {
    if (entry1.lineNumber !== entry2.lineNumber) {
      return entry1.lineNumber - entry2.lineNumber;
    }
    return entry1.columnNumber - entry2.columnNumber;
  }
}

interface Position {
  lineNumber: number;
  columnNumber: number;
}

function comparePositions(a: Position, b: Position): number {
  return a.lineNumber - b.lineNumber || a.columnNumber - b.columnNumber;
}

export interface ScopeEntry {
  scopeName(): string;
  start(): Position;
  end(): Position;
}

class ScopeTreeEntry implements ScopeEntry {
  children: ScopeTreeEntry[] = [];

  constructor(
      readonly startLineNumber: number, readonly startColumnNumber: number, readonly endLineNumber: number,
      readonly endColumnNumber: number, readonly name: string) {
  }

  scopeName(): string {
    return this.name;
  }

  start(): Position {
    return {lineNumber: this.startLineNumber, columnNumber: this.startColumnNumber};
  }

  end(): Position {
    return {lineNumber: this.endLineNumber, columnNumber: this.endColumnNumber};
  }
}

const sourceMapToSourceList = new WeakMap<SourceMapV3, Platform.DevToolsPath.UrlString[]>();

interface SourceInfo {
  content: string|null;
  ignoreListHint: boolean;
  reverseMappings: number[]|null;
  scopeTree: ScopeTreeEntry[]|null;
}

export class SourceMap {
  #json: SourceMapV3|null;
  readonly #compiledURLInternal: Platform.DevToolsPath.UrlString;
  readonly #sourceMappingURL: Platform.DevToolsPath.UrlString;
  readonly #baseURL: Platform.DevToolsPath.UrlString;
  #mappingsInternal: SourceMapEntry[]|null;
  readonly #sourceInfos: Map<Platform.DevToolsPath.UrlString, SourceInfo>;

  /* eslint-disable-next-line no-unused-private-class-members */
  #scopesInfo: SourceMapScopesInfo|null = null;

  /**
   * Implements Source Map V3 model. See https://github.com/google/closure-compiler/wiki/Source-Maps
   * for format description.
   */
  constructor(
      compiledURL: Platform.DevToolsPath.UrlString, sourceMappingURL: Platform.DevToolsPath.UrlString,
      payload: SourceMapV3) {
    this.#json = payload;
    this.#compiledURLInternal = compiledURL;
    this.#sourceMappingURL = sourceMappingURL;
    this.#baseURL = (Common.ParsedURL.schemeIs(sourceMappingURL, 'data:')) ? compiledURL : sourceMappingURL;

    this.#mappingsInternal = null;
    this.#sourceInfos = new Map();
    if ('sections' in this.#json) {
      if (this.#json.sections.find(section => 'url' in section)) {
        Common.Console.Console.instance().warn(
            `SourceMap "${sourceMappingURL}" contains unsupported "URL" field in one of its sections.`);
      }
    }
    this.eachSection(this.parseSources.bind(this));
  }

  compiledURL(): Platform.DevToolsPath.UrlString {
    return this.#compiledURLInternal;
  }

  url(): Platform.DevToolsPath.UrlString {
    return this.#sourceMappingURL;
  }

  sourceURLs(): Platform.DevToolsPath.UrlString[] {
    return [...this.#sourceInfos.keys()];
  }

  embeddedContentByURL(sourceURL: Platform.DevToolsPath.UrlString): string|null {
    const entry = this.#sourceInfos.get(sourceURL);
    if (!entry) {
      return null;
    }
    return entry.content;
  }

  hasScopeInfo(): boolean {
    this.#ensureMappingsProcessed();
    return this.#scopesInfo !== null;
  }

  findEntry(lineNumber: number, columnNumber: number, inlineFrameIndex?: number): SourceMapEntry|null {
    this.#ensureMappingsProcessed();
    if (inlineFrameIndex && this.#scopesInfo !== null) {
      // For inlineFrameIndex != 0 we use the callsite info for the corresponding inlining site.
      // Note that the callsite for "inlineFrameIndex" is actually in the previous frame.
      const {inlinedFunctions} = this.#scopesInfo.findInlinedFunctions(lineNumber, columnNumber);
      const {callsite} = inlinedFunctions[inlineFrameIndex - 1];
      if (!callsite) {
        console.error('Malformed source map. Expected to have a callsite info for index', inlineFrameIndex);
        return null;
      }
      return {
        lineNumber,
        columnNumber,
        sourceIndex: callsite.sourceIndex,
        sourceURL: this.sourceURLs()[callsite.sourceIndex],
        sourceLineNumber: callsite.line,
        sourceColumnNumber: callsite.column,
        name: undefined,
      };
    }
    const mappings = this.mappings();
    const index = Platform.ArrayUtilities.upperBound(
        mappings, undefined, (unused, entry) => lineNumber - entry.lineNumber || columnNumber - entry.columnNumber);
    return index ? mappings[index - 1] : null;
  }

  findEntryRanges(lineNumber: number, columnNumber: number): {
    range: TextUtils.TextRange.TextRange,
    sourceRange: TextUtils.TextRange.TextRange,
    sourceURL: Platform.DevToolsPath.UrlString,
  }|null {
    const mappings = this.mappings();
    const endIndex = Platform.ArrayUtilities.upperBound(
        mappings, undefined, (unused, entry) => lineNumber - entry.lineNumber || columnNumber - entry.columnNumber);
    if (!endIndex) {
      // If the line and column are preceding all the entries, then there is nothing to map.
      return null;
    }
    // startIndex must be within mappings range because endIndex must be not falsy
    const startIndex = endIndex - 1;
    const sourceURL = mappings[startIndex].sourceURL;
    if (!sourceURL) {
      return null;
    }

    // Let us compute the range that contains the source position in the compiled code.
    const endLine = endIndex < mappings.length ? mappings[endIndex].lineNumber : 2 ** 31 - 1;
    const endColumn = endIndex < mappings.length ? mappings[endIndex].columnNumber : 2 ** 31 - 1;
    const range = new TextUtils.TextRange.TextRange(
        mappings[startIndex].lineNumber, mappings[startIndex].columnNumber, endLine, endColumn);

    // Now try to find the corresponding token in the original code.
    const reverseMappings = this.reversedMappings(sourceURL);
    const startSourceLine = mappings[startIndex].sourceLineNumber;
    const startSourceColumn = mappings[startIndex].sourceColumnNumber;
    const endReverseIndex = Platform.ArrayUtilities.upperBound(
        reverseMappings, undefined,
        (unused, i) =>
            startSourceLine - mappings[i].sourceLineNumber || startSourceColumn - mappings[i].sourceColumnNumber);
    if (!endReverseIndex) {
      return null;
    }
    const endSourceLine = endReverseIndex < reverseMappings.length ?
        mappings[reverseMappings[endReverseIndex]].sourceLineNumber :
        2 ** 31 - 1;
    const endSourceColumn = endReverseIndex < reverseMappings.length ?
        mappings[reverseMappings[endReverseIndex]].sourceColumnNumber :
        2 ** 31 - 1;

    const sourceRange =
        new TextUtils.TextRange.TextRange(startSourceLine, startSourceColumn, endSourceLine, endSourceColumn);
    return {range, sourceRange, sourceURL};
  }

  sourceLineMapping(sourceURL: Platform.DevToolsPath.UrlString, lineNumber: number, columnNumber: number):
      SourceMapEntry|null {
    const mappings = this.mappings();
    const reverseMappings = this.reversedMappings(sourceURL);
    const first = Platform.ArrayUtilities.lowerBound(reverseMappings, lineNumber, lineComparator);
    const last = Platform.ArrayUtilities.upperBound(reverseMappings, lineNumber, lineComparator);
    if (first >= reverseMappings.length || mappings[reverseMappings[first]].sourceLineNumber !== lineNumber) {
      return null;
    }
    const columnMappings = reverseMappings.slice(first, last);
    if (!columnMappings.length) {
      return null;
    }
    const index = Platform.ArrayUtilities.lowerBound(
        columnMappings, columnNumber, (columnNumber, i) => columnNumber - mappings[i].sourceColumnNumber);
    return index >= columnMappings.length ? mappings[columnMappings[columnMappings.length - 1]] :
                                            mappings[columnMappings[index]];

    function lineComparator(lineNumber: number, i: number): number {
      return lineNumber - mappings[i].sourceLineNumber;
    }
  }

  private findReverseIndices(sourceURL: Platform.DevToolsPath.UrlString, lineNumber: number, columnNumber: number):
      number[] {
    const mappings = this.mappings();
    const reverseMappings = this.reversedMappings(sourceURL);
    const endIndex = Platform.ArrayUtilities.upperBound(
        reverseMappings, undefined,
        (unused, i) => lineNumber - mappings[i].sourceLineNumber || columnNumber - mappings[i].sourceColumnNumber);
    let startIndex = endIndex;
    while (startIndex > 0 &&
           mappings[reverseMappings[startIndex - 1]].sourceLineNumber ===
               mappings[reverseMappings[endIndex - 1]].sourceLineNumber &&
           mappings[reverseMappings[startIndex - 1]].sourceColumnNumber ===
               mappings[reverseMappings[endIndex - 1]].sourceColumnNumber) {
      --startIndex;
    }

    return reverseMappings.slice(startIndex, endIndex);
  }

  findReverseEntries(sourceURL: Platform.DevToolsPath.UrlString, lineNumber: number, columnNumber: number):
      SourceMapEntry[] {
    const mappings = this.mappings();
    return this.findReverseIndices(sourceURL, lineNumber, columnNumber).map(i => mappings[i]);
  }

  findReverseRanges(sourceURL: Platform.DevToolsPath.UrlString, lineNumber: number, columnNumber: number):
      TextUtils.TextRange.TextRange[] {
    const mappings = this.mappings();
    const indices = this.findReverseIndices(sourceURL, lineNumber, columnNumber);
    const ranges: TextUtils.TextRange.TextRange[] = [];

    for (let i = 0; i < indices.length; ++i) {
      const startIndex = indices[i];

      // Merge adjacent ranges.
      let endIndex = startIndex + 1;
      while (i + 1 < indices.length && endIndex === indices[i + 1]) {
        ++endIndex;
        ++i;
      }

      // Source maps don't contain end positions for entries, but each entry is assumed to
      // span until the following entry. This doesn't work however in case of the last
      // entry, where there's no following entry. We also don't know the number of lines
      // and columns in the original source code (which might not be available at all), so
      // for that case we store the maximum signed 32-bit integer, which is definitely going
      // to be larger than any script we can process and can safely be serialized as part of
      // the skip list we send to V8 with `Debugger.stepOver` (http://crbug.com/1305956).
      const startLine = mappings[startIndex].lineNumber;
      const startColumn = mappings[startIndex].columnNumber;
      const endLine = endIndex < mappings.length ? mappings[endIndex].lineNumber : 2 ** 31 - 1;
      const endColumn = endIndex < mappings.length ? mappings[endIndex].columnNumber : 2 ** 31 - 1;
      ranges.push(new TextUtils.TextRange.TextRange(startLine, startColumn, endLine, endColumn));
    }

    return ranges;
  }

  mappings(): SourceMapEntry[] {
    this.#ensureMappingsProcessed();
    return this.#mappingsInternal ?? [];
  }

  private reversedMappings(sourceURL: Platform.DevToolsPath.UrlString): number[] {
    this.#ensureMappingsProcessed();
    return this.#sourceInfos.get(sourceURL)?.reverseMappings ?? [];
  }

  #ensureMappingsProcessed(): void {
    if (this.#mappingsInternal === null) {
      this.#mappingsInternal = [];
      try {
        this.eachSection(this.parseMap.bind(this));
      } catch (e) {
        console.error('Failed to parse source map', e);
        this.#mappingsInternal = [];
      }

      // As per spec, mappings are not necessarily sorted.
      this.mappings().sort(SourceMapEntry.compare);

      this.#computeReverseMappings(this.#mappingsInternal);
      this.#json = null;
    }
  }

  #computeReverseMappings(mappings: SourceMapEntry[]): void {
    const reverseMappingsPerUrl = new Map<Platform.DevToolsPath.UrlString, number[]>();
    for (let i = 0; i < mappings.length; i++) {
      const entryUrl = mappings[i].sourceURL;
      if (!entryUrl) {
        continue;
      }
      let reverseMap = reverseMappingsPerUrl.get(entryUrl);
      if (!reverseMap) {
        reverseMap = [];
        reverseMappingsPerUrl.set(entryUrl, reverseMap);
      }
      reverseMap.push(i);
    }

    for (const [url, reverseMap] of reverseMappingsPerUrl.entries()) {
      const info = this.#sourceInfos.get(url);
      if (!info) {
        continue;
      }
      reverseMap.sort(sourceMappingComparator);
      info.reverseMappings = reverseMap;
    }

    function sourceMappingComparator(indexA: number, indexB: number): number {
      const a = mappings[indexA];
      const b = mappings[indexB];
      return a.sourceLineNumber - b.sourceLineNumber || a.sourceColumnNumber - b.sourceColumnNumber ||
          a.lineNumber - b.lineNumber || a.columnNumber - b.columnNumber;
    }
  }

  private eachSection(callback: (arg0: SourceMapV3Object, arg1: number, arg2: number) => void): void {
    if (!this.#json) {
      return;
    }
    if ('sections' in this.#json) {
      for (const section of this.#json.sections) {
        if ('map' in section) {
          callback(section.map, section.offset.line, section.offset.column);
        }
      }
    } else {
      callback(this.#json, 0, 0);
    }
  }

  private parseSources(sourceMap: SourceMapV3Object): void {
    const sourcesList = [];
    const sourceRoot = sourceMap.sourceRoot ?? '';
    const ignoreList = new Set(sourceMap.ignoreList ?? sourceMap.x_google_ignoreList);
    for (let i = 0; i < sourceMap.sources.length; ++i) {
      let href = sourceMap.sources[i];
      // The source map v3 proposal says to prepend the sourceRoot to the source URL
      // and if the resulting URL is not absolute, then resolve the source URL against
      // the source map URL. Prepending the sourceRoot (if one exists) is not likely to
      // be meaningful or useful if the source URL is already absolute though. In this
      // case, use the source URL as is without prepending the sourceRoot.
      if (Common.ParsedURL.ParsedURL.isRelativeURL(href)) {
        if (sourceRoot && !sourceRoot.endsWith('/') && href && !href.startsWith('/')) {
          href = sourceRoot.concat('/', href);
        } else {
          href = sourceRoot.concat(href);
        }
      }
      const url =
          Common.ParsedURL.ParsedURL.completeURL(this.#baseURL, href) || (href as Platform.DevToolsPath.UrlString);
      const source = sourceMap.sourcesContent && sourceMap.sourcesContent[i];
      sourcesList.push(url);
      if (!this.#sourceInfos.has(url)) {
        const content = source ?? null;
        const ignoreListHint = ignoreList.has(i);
        this.#sourceInfos.set(url, {content, ignoreListHint, reverseMappings: null, scopeTree: null});
      }
    }
    sourceMapToSourceList.set(sourceMap, sourcesList);
  }

  private parseMap(map: SourceMapV3Object, lineNumber: number, columnNumber: number): void {
    let sourceIndex = 0;
    let sourceLineNumber = 0;
    let sourceColumnNumber = 0;
    let nameIndex = 0;
    // TODO(crbug.com/1011811): refactor away map.
    // `sources` can be undefined if it wasn't previously
    // processed and added to the list. However, that
    // is not WAI and we should make sure that we can
    // only reach this point when we are certain
    // we have the list available.
    const sources = sourceMapToSourceList.get(map);
    const names = map.names ?? [];
    const tokenIter = new TokenIterator(map.mappings);
    let sourceURL: Platform.DevToolsPath.UrlString|undefined = sources && sources[sourceIndex];

    while (true) {
      if (tokenIter.peek() === ',') {
        tokenIter.next();
      } else {
        while (tokenIter.peek() === ';') {
          lineNumber += 1;
          columnNumber = 0;
          tokenIter.next();
        }
        if (!tokenIter.hasNext()) {
          break;
        }
      }

      columnNumber += tokenIter.nextVLQ();
      if (!tokenIter.hasNext() || this.isSeparator(tokenIter.peek())) {
        this.mappings().push(new SourceMapEntry(lineNumber, columnNumber));
        continue;
      }

      const sourceIndexDelta = tokenIter.nextVLQ();
      if (sourceIndexDelta) {
        sourceIndex += sourceIndexDelta;
        if (sources) {
          sourceURL = sources[sourceIndex];
        }
      }
      sourceLineNumber += tokenIter.nextVLQ();
      sourceColumnNumber += tokenIter.nextVLQ();

      if (!tokenIter.hasNext() || this.isSeparator(tokenIter.peek())) {
        this.mappings().push(
            new SourceMapEntry(lineNumber, columnNumber, sourceIndex, sourceURL, sourceLineNumber, sourceColumnNumber));
        continue;
      }

      nameIndex += tokenIter.nextVLQ();
      this.mappings().push(new SourceMapEntry(
          lineNumber, columnNumber, sourceIndex, sourceURL, sourceLineNumber, sourceColumnNumber, names[nameIndex]));
    }

    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.USE_SOURCE_MAP_SCOPES)) {
      this.parseBloombergScopes(map);
      this.#parseScopes(map);
    }
  }

  private parseBloombergScopes(map: SourceMapV3Object): void {
    if (!map.x_com_bloomberg_sourcesFunctionMappings) {
      return;
    }
    const sources = sourceMapToSourceList.get(map);
    if (!sources) {
      return;
    }
    const names = map.names ?? [];
    const scopeList = map.x_com_bloomberg_sourcesFunctionMappings;

    for (let i = 0; i < sources?.length; i++) {
      if (!scopeList[i] || !sources[i]) {
        continue;
      }
      const sourceInfo = this.#sourceInfos.get(sources[i]);
      if (!sourceInfo) {
        continue;
      }
      const scopes = scopeList[i];

      let nameIndex = 0;
      let startLineNumber = 0;
      let startColumnNumber = 0;
      let endLineNumber = 0;
      let endColumnNumber = 0;

      const tokenIter = new TokenIterator(scopes);
      const entries: ScopeTreeEntry[] = [];
      let atStart = true;
      while (tokenIter.hasNext()) {
        if (atStart) {
          atStart = false;
        } else if (tokenIter.peek() === ',') {
          tokenIter.next();
        } else {
          // Unexpected character.
          return;
        }
        nameIndex += tokenIter.nextVLQ();
        startLineNumber += tokenIter.nextVLQ();
        startColumnNumber += tokenIter.nextVLQ();
        endLineNumber += tokenIter.nextVLQ();
        endColumnNumber += tokenIter.nextVLQ();
        entries.push(new ScopeTreeEntry(
            startLineNumber, startColumnNumber, endLineNumber, endColumnNumber, names[nameIndex] ?? '<invalid>'));
      }
      sourceInfo.scopeTree = this.buildScopeTree(entries);
    }
  }

  private buildScopeTree(entries: ScopeTreeEntry[]): ScopeTreeEntry[] {
    const toplevel: ScopeTreeEntry[] = [];
    entries.sort((l, r) => comparePositions(l.start(), r.start()));

    const stack: ScopeTreeEntry[] = [];

    for (const entry of entries) {
      const start = entry.start();
      // Pop all the scopes that precede the current entry.
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (comparePositions(top.end(), start) < 0) {
          stack.pop();
        } else {
          break;
        }
      }

      if (stack.length > 0) {
        stack[stack.length - 1].children.push(entry);
      } else {
        toplevel.push(entry);
      }
      stack.push(entry);
    }
    return toplevel;
  }

  #parseScopes(map: SourceMapV3Object): void {
    if (map.originalScopes && map.generatedRanges) {
      this.#scopesInfo = SourceMapScopesInfo.parseFromMap(this, map);
    }
  }

  findScopeEntry(sourceURL: Platform.DevToolsPath.UrlString, sourceLineNumber: number, sourceColumnNumber: number):
      ScopeEntry|null {
    const sourceInfo = this.#sourceInfos.get(sourceURL);
    if (!sourceInfo || !sourceInfo.scopeTree) {
      return null;
    }
    const position: Position = {lineNumber: sourceLineNumber, columnNumber: sourceColumnNumber};

    let current: ScopeTreeEntry|null = null;
    while (true) {
      const children: ScopeTreeEntry[] = current?.children ?? sourceInfo.scopeTree;
      const match = children.find(
          child => comparePositions(child.start(), position) <= 0 && comparePositions(position, child.end()) <= 0);
      if (!match) {
        return current;
      }
      current = match;
    }
  }

  private isSeparator(char: string): boolean {
    return char === ',' || char === ';';
  }

  /**
   * Finds all the reverse mappings that intersect with the given `textRange` within the
   * source entity identified by the `url`. If the `url` does not have any reverse mappings
   * within this source map, an empty array is returned.
   *
   * @param url the URL of the source entity to query.
   * @param textRange the range of text within the entity to check, considered `[start,end[`.
   * @returns the list of ranges in the generated file that map to locations overlapping the
   *          {@link textRange} in the source file identified by the {@link url}, or `[]`
   *          if the {@link url} does not identify an entity in this source map.
   */
  reverseMapTextRanges(url: Platform.DevToolsPath.UrlString, textRange: TextUtils.TextRange.TextRange):
      TextUtils.TextRange.TextRange[] {
    const reverseMappings = this.reversedMappings(url);
    const mappings = this.mappings();
    if (reverseMappings.length === 0) {
      return [];
    }

    // Determine the first reverse mapping that contains the starting point of the `textRange`.
    let startReverseIndex =
        Platform.ArrayUtilities.lowerBound(reverseMappings, textRange, ({startLine, startColumn}, index) => {
          const {sourceLineNumber, sourceColumnNumber} = mappings[index];
          return startLine - sourceLineNumber || startColumn - sourceColumnNumber;
        });

    // Check if the current mapping does not start on the exact start of the `textRange`, and if
    // so we know that a previous mapping entry (if any) would also overlap. If we reach the end
    // of the reverse mappings table, we just take the last entry and report that.
    while (startReverseIndex === reverseMappings.length ||
           startReverseIndex > 0 &&
               (mappings[reverseMappings[startReverseIndex]].sourceLineNumber > textRange.startLine ||
                mappings[reverseMappings[startReverseIndex]].sourceColumnNumber > textRange.startColumn)) {
      startReverseIndex--;
    }

    // Determine the last reverse mapping that contains the end point of the `textRange`.
    let endReverseIndex = startReverseIndex + 1;
    for (; endReverseIndex < reverseMappings.length; ++endReverseIndex) {
      const {sourceLineNumber, sourceColumnNumber} = mappings[reverseMappings[endReverseIndex]];
      if (sourceLineNumber < textRange.endLine ||
          (sourceLineNumber === textRange.endLine && sourceColumnNumber < textRange.endColumn)) {
        continue;
      }
      break;
    }

    // Create the ranges...
    const ranges = [];
    for (let reverseIndex = startReverseIndex; reverseIndex < endReverseIndex; ++reverseIndex) {
      const startIndex = reverseMappings[reverseIndex], endIndex = startIndex + 1;
      const range = TextUtils.TextRange.TextRange.createUnboundedFromLocation(
          mappings[startIndex].lineNumber, mappings[startIndex].columnNumber);
      if (endIndex < mappings.length) {
        range.endLine = mappings[endIndex].lineNumber;
        range.endColumn = mappings[endIndex].columnNumber;
      }
      ranges.push(range);
    }

    // ...sort them...
    ranges.sort(TextUtils.TextRange.TextRange.comparator);

    // ...and ensure they are maximally merged.
    let j = 0;
    for (let i = 1; i < ranges.length; ++i) {
      if (ranges[j].immediatelyPrecedes(ranges[i])) {
        ranges[j].endLine = ranges[i].endLine;
        ranges[j].endColumn = ranges[i].endColumn;
      } else {
        ranges[++j] = ranges[i];
      }
    }
    ranges.length = j + 1;

    return ranges;
  }

  mapsOrigin(): boolean {
    const mappings = this.mappings();
    if (mappings.length > 0) {
      const firstEntry = mappings[0];
      return firstEntry?.lineNumber === 0 || firstEntry.columnNumber === 0;
    }
    return false;
  }

  hasIgnoreListHint(sourceURL: Platform.DevToolsPath.UrlString): boolean {
    return this.#sourceInfos.get(sourceURL)?.ignoreListHint ?? false;
  }

  /**
   * Returns a list of ranges in the generated script for original sources that
   * match a predicate. Each range is a [begin, end) pair, meaning that code at
   * the beginning location, up to but not including the end location, matches
   * the predicate.
   */
  findRanges(predicate: (sourceURL: Platform.DevToolsPath.UrlString) => boolean, options?: {isStartMatching: boolean}):
      TextUtils.TextRange.TextRange[] {
    const mappings = this.mappings();
    const ranges = [];

    if (!mappings.length) {
      return [];
    }

    let current: TextUtils.TextRange.TextRange|null = null;

    // If the first mapping isn't at the beginning of the original source, it's
    // up to the caller to decide if it should be considered matching the
    // predicate or not. By default, it's not.
    if ((mappings[0].lineNumber !== 0 || mappings[0].columnNumber !== 0) && options?.isStartMatching) {
      current = TextUtils.TextRange.TextRange.createUnboundedFromLocation(0, 0);
      ranges.push(current);
    }

    for (const {sourceURL, lineNumber, columnNumber} of mappings) {
      const ignoreListHint = sourceURL && predicate(sourceURL);

      if (!current && ignoreListHint) {
        current = TextUtils.TextRange.TextRange.createUnboundedFromLocation(lineNumber, columnNumber);
        ranges.push(current);
        continue;
      }
      if (current && !ignoreListHint) {
        current.endLine = lineNumber;
        current.endColumn = columnNumber;
        current = null;
      }
    }

    return ranges;
  }

  /**
   * Determines whether this and the {@link other} `SourceMap` agree on content and ignore-list hint
   * with respect to the {@link sourceURL}.
   *
   * @param sourceURL the URL to test for (might not be provided by either of the sourcemaps).
   * @param other the other `SourceMap` to check.
   * @returns `true` if both this and the {@link other} `SourceMap` either both have the ignore-list
   *          hint for {@link sourceURL} or neither, and if both of them either provide the same
   *          content for the {@link sourceURL} inline or both provide no `sourcesContent` entry
   *          for it.
   */
  compatibleForURL(sourceURL: Platform.DevToolsPath.UrlString, other: SourceMap): boolean {
    return this.embeddedContentByURL(sourceURL) === other.embeddedContentByURL(sourceURL) &&
        this.hasIgnoreListHint(sourceURL) === other.hasIgnoreListHint(sourceURL);
  }

  expandCallFrame(frame: CallFrame): CallFrame[] {
    this.#ensureMappingsProcessed();
    if (this.#scopesInfo === null) {
      return [frame];
    }

    return this.#scopesInfo.expandCallFrame(frame);
  }

  resolveScopeChain(frame: CallFrame): ScopeChainEntry[]|null {
    this.#ensureMappingsProcessed();
    if (this.#scopesInfo === null) {
      return null;
    }

    return this.#scopesInfo.resolveMappedScopeChain(frame);
  }
}

const VLQ_BASE_SHIFT = 5;
const VLQ_BASE_MASK = (1 << 5) - 1;
const VLQ_CONTINUATION_MASK = 1 << 5;

export class TokenIterator {
  readonly #string: string;
  #position: number;

  constructor(string: string) {
    this.#string = string;
    this.#position = 0;
  }

  next(): string {
    return this.#string.charAt(this.#position++);
  }

  /** Returns the unicode value of the next character and advances the iterator  */
  nextCharCode(): number {
    return this.#string.charCodeAt(this.#position++);
  }

  peek(): string {
    return this.#string.charAt(this.#position);
  }

  hasNext(): boolean {
    return this.#position < this.#string.length;
  }

  nextVLQ(): number {
    // Read unsigned value.
    let result = 0;
    let shift = 0;
    let digit: number = VLQ_CONTINUATION_MASK;
    while (digit & VLQ_CONTINUATION_MASK) {
      if (!this.hasNext()) {
        throw new Error('Unexpected end of input while decodling VLQ number!');
      }
      const charCode = this.nextCharCode();
      digit = Common.Base64.BASE64_CODES[charCode];
      if (charCode !== 65 /* 'A' */ && digit === 0) {
        throw new Error(`Unexpected char '${String.fromCharCode(charCode)}' encountered while decoding`);
      }
      result += (digit & VLQ_BASE_MASK) << shift;
      shift += VLQ_BASE_SHIFT;
    }

    // Fix the sign.
    const negative = result & 1;
    result >>= 1;
    return negative ? -result : result;
  }

  /**
   * @returns the next VLQ number without iterating further. Or returns null if
   * the iterator is at the end or it's not a valid number.
   */
  peekVLQ(): null|number {
    const pos = this.#position;
    try {
      return this.nextVLQ();
    } catch {
      return null;
    } finally {
      this.#position = pos;  // Reset the iterator.
    }
  }
}

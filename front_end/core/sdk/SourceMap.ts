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
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';

import {CompilerSourceMappingContentProvider} from './CompilerSourceMappingContentProvider.js';
import type {PageResourceLoadInitiator} from './PageResourceLoader.js';
import {PageResourceLoader} from './PageResourceLoader.js';

const UIStrings = {
  /**
  *@description Error message when failing to load a source map text via the network
  *@example {https://example.com/sourcemap.map} PH1
  *@example {A certificate error occurred} PH2
  */
  couldNotLoadContentForSS: 'Could not load content for {PH1}: {PH2}',
  /**
  *@description Error message when failing to load a script source text via the network
  *@example {https://example.com} PH1
  *@example {Unexpected token} PH2
  */
  couldNotParseContentForSS: 'Could not parse content for {PH1}: {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/SourceMap.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface SourceMap {
  compiledURL(): string;
  url(): string;
  sourceURLs(): string[];
  sourceContentProvider(sourceURL: string, contentType: Common.ResourceType.ResourceType):
      TextUtils.ContentProvider.ContentProvider;
  embeddedContentByURL(sourceURL: string): string|null;
  findEntry(lineNumber: number, columnNumber: number): SourceMapEntry|null;
  findReverseRanges(sourceURL: string, lineNumber: number, columnNumber: number): TextUtils.TextRange.TextRange[];
  sourceLineMapping(sourceURL: string, lineNumber: number, columnNumber: number): SourceMapEntry|null;
  mappings(): SourceMapEntry[];
  mapsOrigin(): boolean;
}

export class SourceMapV3 {
  version!: number;
  file!: string|undefined;
  sources!: string[];
  sections!: Section[]|undefined;
  mappings!: string;
  sourceRoot!: string|undefined;
  names!: string[]|undefined;
  sourcesContent!: string|undefined;
  constructor() {
  }
}

export class Section {
  map!: SourceMapV3;
  offset!: Offset;
  url!: string|undefined;
  constructor() {
  }
}

export class Offset {
  line!: number;
  column!: number;
  constructor() {
  }
}

export class SourceMapEntry {
  lineNumber: number;
  columnNumber: number;
  sourceURL: string|undefined;
  sourceLineNumber: number;
  sourceColumnNumber: number;
  name: string|undefined;

  constructor(
      lineNumber: number, columnNumber: number, sourceURL?: string, sourceLineNumber?: number,
      sourceColumnNumber?: number, name?: string) {
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
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

const base64Digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const base64Map = new Map<string, number>();

for (let i = 0; i < base64Digits.length; ++i) {
  base64Map.set(base64Digits.charAt(i), i);
}

const sourceMapToSourceList = new WeakMap<SourceMapV3, string[]>();

export class TextSourceMap implements SourceMap {
  readonly #initiator: PageResourceLoadInitiator;
  #json: SourceMapV3|null;
  readonly #compiledURLInternal: string;
  readonly #sourceMappingURL: string;
  readonly #baseURL: string;
  #mappingsInternal: SourceMapEntry[]|null;
  readonly #sourceInfos: Map<string, TextSourceMap.SourceInfo>;

  /**
   * Implements Source Map V3 model. See https://github.com/google/closure-compiler/wiki/Source-Maps
   * for format description.
   */
  constructor(
      compiledURL: string, sourceMappingURL: string, payload: SourceMapV3, initiator: PageResourceLoadInitiator) {
    this.#initiator = initiator;
    this.#json = payload;
    this.#compiledURLInternal = compiledURL;
    this.#sourceMappingURL = sourceMappingURL;
    this.#baseURL = sourceMappingURL.startsWith('data:') ? compiledURL : sourceMappingURL;

    this.#mappingsInternal = null;
    this.#sourceInfos = new Map();
    if (this.#json.sections) {
      const sectionWithURL = Boolean(this.#json.sections.find(section => Boolean(section.url)));
      if (sectionWithURL) {
        Common.Console.Console.instance().warn(
            `SourceMap "${sourceMappingURL}" contains unsupported "URL" field in one of its sections.`);
      }
    }
    this.eachSection(this.parseSources.bind(this));
  }

  /**
   * @throws {!Error}
   */
  static async load(sourceMapURL: string, compiledURL: string, initiator: PageResourceLoadInitiator):
      Promise<TextSourceMap> {
    let updatedContent;
    try {
      const {content} = await PageResourceLoader.instance().loadResource(sourceMapURL, initiator);
      updatedContent = content;
      if (content.slice(0, 3) === ')]}') {
        updatedContent = content.substring(content.indexOf('\n'));
      }
    } catch (error) {
      throw new Error(i18nString(UIStrings.couldNotLoadContentForSS, {PH1: sourceMapURL, PH2: error.message}));
    }

    try {
      const payload = (JSON.parse(updatedContent) as SourceMapV3);
      return new TextSourceMap(compiledURL, sourceMapURL, payload, initiator);
    } catch (error) {
      throw new Error(i18nString(UIStrings.couldNotParseContentForSS, {PH1: sourceMapURL, PH2: error.message}));
    }
  }

  compiledURL(): string {
    return this.#compiledURLInternal;
  }

  url(): string {
    return this.#sourceMappingURL;
  }

  sourceURLs(): string[] {
    return [...this.#sourceInfos.keys()];
  }

  sourceContentProvider(sourceURL: string, contentType: Common.ResourceType.ResourceType):
      TextUtils.ContentProvider.ContentProvider {
    const info = this.#sourceInfos.get(sourceURL);
    if (info && info.content) {
      return TextUtils.StaticContentProvider.StaticContentProvider.fromString(sourceURL, contentType, info.content);
    }
    return new CompilerSourceMappingContentProvider(sourceURL, contentType, this.#initiator);
  }

  embeddedContentByURL(sourceURL: string): string|null {
    const entry = this.#sourceInfos.get(sourceURL);
    if (!entry) {
      return null;
    }
    return entry.content;
  }

  findEntry(lineNumber: number, columnNumber: number): SourceMapEntry|null {
    const mappings = this.mappings();
    const index = Platform.ArrayUtilities.upperBound(
        mappings, undefined, (unused, entry) => lineNumber - entry.lineNumber || columnNumber - entry.columnNumber);
    return index ? mappings[index - 1] : null;
  }

  sourceLineMapping(sourceURL: string, lineNumber: number, columnNumber: number): SourceMapEntry|null {
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

  private findReverseIndices(sourceURL: string, lineNumber: number, columnNumber: number): number[] {
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

  findReverseEntries(sourceURL: string, lineNumber: number, columnNumber: number): SourceMapEntry[] {
    const mappings = this.mappings();
    return this.findReverseIndices(sourceURL, lineNumber, columnNumber).map(i => mappings[i]);
  }

  findReverseRanges(sourceURL: string, lineNumber: number, columnNumber: number): TextUtils.TextRange.TextRange[] {
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
      const endLine = endIndex < mappings.length ? mappings[endIndex].lineNumber : Infinity;
      const endColumn = endIndex < mappings.length ? mappings[endIndex].columnNumber : 0;
      ranges.push(new TextUtils.TextRange.TextRange(
          mappings[startIndex].lineNumber, mappings[startIndex].columnNumber, endLine, endColumn));
    }

    return ranges;
  }

  mappings(): SourceMapEntry[] {
    if (this.#mappingsInternal === null) {
      this.#mappingsInternal = [];
      this.eachSection(this.parseMap.bind(this));
      this.#json = null;
    }
    return this.#mappingsInternal;
  }

  private reversedMappings(sourceURL: string): number[] {
    const info = this.#sourceInfos.get(sourceURL);
    if (!info) {
      return [];
    }
    const mappings = this.mappings();
    if (info.reverseMappings === null) {
      const indexes = Array(mappings.length).fill(0).map((_, i) => i);
      info.reverseMappings = indexes.filter(i => mappings[i].sourceURL === sourceURL).sort(sourceMappingComparator);
    }

    return info.reverseMappings;

    function sourceMappingComparator(indexA: number, indexB: number): number {
      const a = mappings[indexA];
      const b = mappings[indexB];
      if (a.sourceLineNumber !== b.sourceLineNumber) {
        return a.sourceLineNumber - b.sourceLineNumber;
      }
      if (a.sourceColumnNumber !== b.sourceColumnNumber) {
        return a.sourceColumnNumber - b.sourceColumnNumber;
      }

      if (a.lineNumber !== b.lineNumber) {
        return a.lineNumber - b.lineNumber;
      }

      return a.columnNumber - b.columnNumber;
    }
  }

  private eachSection(callback: (arg0: SourceMapV3, arg1: number, arg2: number) => void): void {
    if (!this.#json) {
      return;
    }
    if (!this.#json.sections) {
      callback(this.#json, 0, 0);
      return;
    }
    for (const section of this.#json.sections) {
      callback(section.map, section.offset.line, section.offset.column);
    }
  }

  private parseSources(sourceMap: SourceMapV3): void {
    const sourcesList = [];
    let sourceRoot = sourceMap.sourceRoot || '';
    if (sourceRoot && !sourceRoot.endsWith('/')) {
      sourceRoot += '/';
    }
    for (let i = 0; i < sourceMap.sources.length; ++i) {
      let href = sourceMap.sources[i];
      // The source map v3 proposal says to prepend the sourceRoot to the source URL
      // and if the resulting URL is not absolute, then resolve the source URL against
      // the source map URL. Appending the sourceRoot (if one exists) is not likely to
      // be meaningful or useful if the source URL is already absolute though. In this
      // case, use the source URL as is without prepending the sourceRoot.
      if (Common.ParsedURL.ParsedURL.isRelativeURL(href)) {
        href = sourceRoot + href;
      }
      let url = Common.ParsedURL.ParsedURL.completeURL(this.#baseURL, href) || href;
      const source = sourceMap.sourcesContent && sourceMap.sourcesContent[i];
      if (url === this.#compiledURLInternal && source) {
        url += '? [sm]';
      }
      this.#sourceInfos.set(url, new TextSourceMap.SourceInfo(source || null, null));
      sourcesList.push(url);
    }
    sourceMapToSourceList.set(sourceMap, sourcesList);
  }

  private parseMap(map: SourceMapV3, lineNumber: number, columnNumber: number): void {
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
    const names = map.names || [];
    const stringCharIterator = new TextSourceMap.StringCharIterator(map.mappings);
    let sourceURL: string|(string | undefined) = sources && sources[sourceIndex];

    while (true) {
      if (stringCharIterator.peek() === ',') {
        stringCharIterator.next();
      } else {
        while (stringCharIterator.peek() === ';') {
          lineNumber += 1;
          columnNumber = 0;
          stringCharIterator.next();
        }
        if (!stringCharIterator.hasNext()) {
          break;
        }
      }

      columnNumber += this.decodeVLQ(stringCharIterator);
      if (!stringCharIterator.hasNext() || this.isSeparator(stringCharIterator.peek())) {
        this.mappings().push(new SourceMapEntry(lineNumber, columnNumber));
        continue;
      }

      const sourceIndexDelta = this.decodeVLQ(stringCharIterator);
      if (sourceIndexDelta) {
        sourceIndex += sourceIndexDelta;
        if (sources) {
          sourceURL = sources[sourceIndex];
        }
      }
      sourceLineNumber += this.decodeVLQ(stringCharIterator);
      sourceColumnNumber += this.decodeVLQ(stringCharIterator);

      if (!stringCharIterator.hasNext() || this.isSeparator(stringCharIterator.peek())) {
        this.mappings().push(
            new SourceMapEntry(lineNumber, columnNumber, sourceURL, sourceLineNumber, sourceColumnNumber));
        continue;
      }

      nameIndex += this.decodeVLQ(stringCharIterator);
      this.mappings().push(new SourceMapEntry(
          lineNumber, columnNumber, sourceURL, sourceLineNumber, sourceColumnNumber, names[nameIndex]));
    }

    // As per spec, mappings are not necessarily sorted.
    this.mappings().sort(SourceMapEntry.compare);
  }

  private isSeparator(char: string): boolean {
    return char === ',' || char === ';';
  }

  private decodeVLQ(stringCharIterator: TextSourceMap.StringCharIterator): number {
    // Read unsigned value.
    let result = 0;
    let shift = 0;
    let digit: number = TextSourceMap._VLQ_CONTINUATION_MASK;
    while (digit & TextSourceMap._VLQ_CONTINUATION_MASK) {
      digit = base64Map.get(stringCharIterator.next()) || 0;
      result += (digit & TextSourceMap._VLQ_BASE_MASK) << shift;
      shift += TextSourceMap._VLQ_BASE_SHIFT;
    }

    // Fix the sign.
    const negative = result & 1;
    result >>= 1;
    return negative ? -result : result;
  }

  reverseMapTextRange(url: string, textRange: TextUtils.TextRange.TextRange): TextUtils.TextRange.TextRange|null {
    function comparator(
        position: {
          lineNumber: number,
          columnNumber: number,
        },
        mappingIndex: number): number {
      if (position.lineNumber !== mappings[mappingIndex].sourceLineNumber) {
        return position.lineNumber - mappings[mappingIndex].sourceLineNumber;
      }

      return position.columnNumber - mappings[mappingIndex].sourceColumnNumber;
    }

    const reverseMappings = this.reversedMappings(url);
    const mappings = this.mappings();
    if (!reverseMappings.length) {
      return null;
    }
    const startIndex = Platform.ArrayUtilities.lowerBound(
        reverseMappings, {lineNumber: textRange.startLine, columnNumber: textRange.startColumn}, comparator);
    const endIndex = Platform.ArrayUtilities.upperBound(
        reverseMappings, {lineNumber: textRange.endLine, columnNumber: textRange.endColumn}, comparator);

    if (endIndex >= reverseMappings.length) {
      return null;
    }

    const startMapping = mappings[reverseMappings[startIndex]];
    const endMapping = mappings[reverseMappings[endIndex]];
    return new TextUtils.TextRange.TextRange(
        startMapping.lineNumber, startMapping.columnNumber, endMapping.lineNumber, endMapping.columnNumber);
  }

  mapsOrigin(): boolean {
    const mappings = this.mappings();
    if (mappings.length > 0) {
      const firstEntry = mappings[0];
      return firstEntry?.lineNumber === 0 || firstEntry.columnNumber === 0;
    }
    return false;
  }
}

export namespace TextSourceMap {
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  export const _VLQ_BASE_SHIFT = 5;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  export const _VLQ_BASE_MASK = (1 << 5) - 1;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  export const _VLQ_CONTINUATION_MASK = 1 << 5;

  export class StringCharIterator {
    private readonly string: string;
    private position: number;

    constructor(string: string) {
      this.string = string;
      this.position = 0;
    }

    next(): string {
      return this.string.charAt(this.position++);
    }

    peek(): string {
      return this.string.charAt(this.position);
    }

    hasNext(): boolean {
      return this.position < this.string.length;
    }
  }

  export class SourceInfo {
    content: string|null;
    reverseMappings: number[]|null;

    constructor(content: string|null, reverseMappings: number[]|null) {
      this.content = content;
      this.reverseMappings = reverseMappings;
    }
  }
}

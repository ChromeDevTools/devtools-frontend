import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as ScopesCodec from '../../third_party/source-map-scopes-codec/source-map-scopes-codec.js';
import * as Platform from '../platform/platform.js';
import type { CallFrame, ScopeChainEntry } from './DebuggerModel.js';
import type { Script } from './Script.js';
import { type NamedFunctionRange } from './SourceMapFunctionRanges.js';
import { type TranslatedFrame } from './SourceMapScopesInfo.js';
/**
 * Type of the base source map JSON object, which contains the sources and the mappings at the very least, plus
 * some additional fields.
 *
 * @see {@link SourceMapV3}
 * @see {@link https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k Source Map Revision 3 Proposal}
 */
export interface SourceMapV3Object {
    version: number;
    sources: string[];
    mappings: string;
    file?: string;
    sourceRoot?: string;
    sourcesContent?: Array<string | null>;
    names?: string[];
    ignoreList?: number[];
    scopes?: string;
    debugId?: string;
    x_google_linecount?: number;
    x_google_ignoreList?: number[];
    x_com_bloomberg_sourcesFunctionMappings?: string[];
}
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
export type SourceMapV3 = SourceMapV3Object | {
    version: number;
    sections: Array<{
        offset: {
            line: number;
            column: number;
        };
        map: SourceMapV3Object;
    } | {
        offset: {
            line: number;
            column: number;
        };
        url: string;
    }>;
    file?: string;
};
/**
 * Parses the {@link content} as JSON, ignoring BOM markers in the beginning, and
 * also handling the CORB bypass prefix correctly.
 *
 * @param content the string representation of a sourcemap.
 * @returns the {@link SourceMapV3} representation of the {@link content}.
 */
export declare function parseSourceMap(content: string): SourceMapV3;
export type DebugId = Platform.Brand.Brand<string, 'DebugId'>;
export declare class SourceMapEntry {
    readonly lineNumber: number;
    readonly columnNumber: number;
    readonly sourceIndex?: number;
    readonly sourceURL: Platform.DevToolsPath.UrlString | undefined;
    readonly sourceLineNumber: number;
    readonly sourceColumnNumber: number;
    readonly name: string | undefined;
    constructor(lineNumber: number, columnNumber: number, sourceIndex?: number, sourceURL?: Platform.DevToolsPath.UrlString, sourceLineNumber?: number, sourceColumnNumber?: number, name?: string);
    static compare(entry1: SourceMapEntry, entry2: SourceMapEntry): number;
}
export declare class SourceMap {
    #private;
    static retainRawSourceMaps: boolean;
    scopesFallbackPromiseForTest?: Promise<unknown>;
    /**
     * Implements Source Map V3 model. See https://github.com/google/closure-compiler/wiki/Source-Maps
     * for format description.
     */
    constructor(compiledURL: Platform.DevToolsPath.UrlString, sourceMappingURL: Platform.DevToolsPath.UrlString, payload: SourceMapV3, script?: Script);
    json(): SourceMapV3 | null;
    augmentWithScopes(scriptUrl: Platform.DevToolsPath.UrlString, ranges: NamedFunctionRange[]): void;
    compiledURL(): Platform.DevToolsPath.UrlString;
    url(): Platform.DevToolsPath.UrlString;
    debugId(): DebugId | null;
    sourceURLForSourceIndex(index: number): Platform.DevToolsPath.UrlString | undefined;
    sourceURLs(): Platform.DevToolsPath.UrlString[];
    embeddedContentByURL(sourceURL: Platform.DevToolsPath.UrlString): string | null;
    hasScopeInfo(): boolean;
    findEntry(lineNumber: number, columnNumber: number, inlineFrameIndex?: number): SourceMapEntry | null;
    /** Returns the entry at the given position but only if an entry exists for that exact position */
    findEntryExact(lineNumber: number, columnNumber: number): SourceMapEntry | null;
    findEntryRanges(lineNumber: number, columnNumber: number): {
        range: TextUtils.TextRange.TextRange;
        sourceRange: TextUtils.TextRange.TextRange;
        sourceURL: Platform.DevToolsPath.UrlString;
    } | null;
    sourceLineMapping(sourceURL: Platform.DevToolsPath.UrlString, lineNumber: number, columnNumber: number): SourceMapEntry | null;
    private findReverseIndices;
    findReverseEntries(sourceURL: Platform.DevToolsPath.UrlString, lineNumber: number, columnNumber: number): SourceMapEntry[];
    findReverseRanges(sourceURL: Platform.DevToolsPath.UrlString, lineNumber: number, columnNumber: number): TextUtils.TextRange.TextRange[];
    mappings(): SourceMapEntry[];
    private reversedMappings;
    private eachSection;
    private parseSources;
    private parseMap;
    private parseBloombergScopes;
    private isSeparator;
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
    reverseMapTextRanges(url: Platform.DevToolsPath.UrlString, textRange: TextUtils.TextRange.TextRange): TextUtils.TextRange.TextRange[];
    mapsOrigin(): boolean;
    hasIgnoreListHint(sourceURL: Platform.DevToolsPath.UrlString): boolean;
    /**
     * Returns a list of ranges in the generated script for original sources that
     * match a predicate. Each range is a [begin, end) pair, meaning that code at
     * the beginning location, up to but not including the end location, matches
     * the predicate.
     */
    findRanges(predicate: (sourceURL: Platform.DevToolsPath.UrlString) => boolean, options?: {
        isStartMatching: boolean;
    }): TextUtils.TextRange.TextRange[];
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
    compatibleForURL(sourceURL: Platform.DevToolsPath.UrlString, other: SourceMap): boolean;
    expandCallFrame(frame: CallFrame): CallFrame[];
    resolveScopeChain(frame: CallFrame): ScopeChainEntry[] | null;
    findOriginalFunctionName(position: ScopesCodec.Position): string | null;
    findOriginalFunctionScope(position: ScopesCodec.Position): {
        scope: ScopesCodec.OriginalScope;
        url?: Platform.DevToolsPath.UrlString;
    } | null;
    isOutlinedFrame(generatedLine: number, generatedColumn: number): boolean;
    hasInlinedFrames(generatedLine: number, generatedColumn: number): boolean;
    translateCallSite(generatedLine: number, generatedColumn: number): TranslatedFrame[];
}
export declare class TokenIterator {
    #private;
    constructor(string: string);
    next(): string;
    /** Returns the unicode value of the next character and advances the iterator  */
    nextCharCode(): number;
    peek(): string;
    hasNext(): boolean;
    nextVLQ(): number;
    /**
     * @returns the next VLQ number without iterating further. Or returns null if
     * the iterator is at the end or it's not a valid number.
     */
    peekVLQ(): null | number;
}

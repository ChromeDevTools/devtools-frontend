// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import * as TextUtils from '../../../core/text_utils/text_utils.js';
import * as Bindings from '../../bindings/bindings.js';
import type * as Workspace from '../../workspace/workspace.js';

import {formatSourceName, ListSourcesTool} from './ListSources.js';
import {
  type DataHandlerResult,
  type OriginLockCapability,
  type OriginLockState,
  resolveOriginFromLock,
  type ToolErrorResult,
} from './Tool.js';

const MAX_TOTAL_MATCHES = 50;
const MAX_MATCHES_PER_FILE = 5;
const MAX_CONCURRENT_FILE_SEARCHES = 20;
const PREVIEW_PREFIX_LENGTH = 40;
const PREVIEW_MAX_LENGTH = 120;

export interface SearchSingleSourceOptions {
  id: number;
  query: string;
  caseSensitive: boolean;
  context: OriginLockCapability;
  originLock: OriginLockState;
  establishedOrigin: SDK.SecurityOrigin.SecurityOrigin;
  signal?: AbortSignal;
}

export interface SearchWorkspaceSourcesOptions {
  query: string;
  caseSensitive: boolean;
  context: OriginLockCapability;
  originLock: OriginLockState;
  establishedOrigin: SDK.SecurityOrigin.SecurityOrigin;
  signal?: AbortSignal;
}

/**
 * Outcome of loading and searching a single `UISourceCode`:
 * - `interrupted`: the run was aborted (`AbortSignal`) or blocked by mid-scan cross-origin
 *   navigation; callers must halt immediately and return `error`.
 * - `load-error`: `requestContentData()` failed for this file.
 * - `non-text`: the loaded working copy is binary rather than searchable text.
 * - `ok`: the active text working copy and its literal matches.
 */
type FileSearchResult =
    |{status: 'interrupted', error: ToolErrorResult}|{status: 'load-error', error: string}|{status: 'non-text'}|{
      status: 'ok',
      workingCopy: TextUtils.ContentData.ContentData,
      matches: TextUtils.ContentProvider.SearchMatch[],
    };

/**
 * Searches a single registered source file by numeric ID, returning grouped
 * `line;offset;preview` matches with 0-based offsets aligned to `getSourceContent`.
 */
export async function searchSingleSource(options: SearchSingleSourceOptions): Promise<DataHandlerResult<string>> {
  const file = ListSourcesTool.getSourceById(options.id, options.originLock);
  if (!file) {
    return {error: 'Unable to find file.'};
  }

  const fileResult = await searchFileContent({
    file,
    query: options.query,
    caseSensitive: options.caseSensitive,
    context: options.context,
    signal: options.signal,
  });
  switch (fileResult.status) {
    case 'interrupted':
      return fileResult.error;
    case 'load-error':
      return {error: `Failed to load file content: ${fileResult.error}`};
    case 'non-text':
      return {error: 'File content is not text.'};
    case 'ok':
      break;
  }

  if (fileResult.matches.length === 0) {
    return formatSearchOutput([]);
  }

  const selectedMatches = fileResult.matches.slice(0, MAX_TOTAL_MATCHES);
  const omitted = fileResult.matches.length - selectedMatches.length;
  const footerLines = omitted > 0 ?
      [
        `(Omitted ${omitted} additional matches after reaching the ${MAX_TOTAL_MATCHES}-match cap; ` +
            'refine query or read from the last offset with getSourceContent.)',
      ] :
      [];
  return formatSearchOutput(
      formatFileMatchLines(options.id, file, options.establishedOrigin, fileResult.workingCopy, selectedMatches),
      footerLines,
  );
}

/**
 * Searches all readable text workspace sources for the locked origin in bounded concurrent
 * chunks, prioritizing source-mapped files and skipping unloaded external source maps.
 */
export async function searchWorkspaceSources(
    options: SearchWorkspaceSourcesOptions,
    ): Promise<DataHandlerResult<string>> {
  const {files} = ListSourcesTool.getUISourceCodes(options.originLock);
  if (files.length === 0) {
    return {result: 'No source files found for the current origin.'};
  }

  const {searchableFiles, skippedExternalSourceMapFiles} = partitionSearchableFiles(files);

  const matchLines: string[] = [];
  let totalMatches = 0;
  let omittedByPerFileCap = 0;
  let omittedByTotalCap = 0;
  let unscannedFiles = 0;

  for (let chunkStart = 0; chunkStart < searchableFiles.length && totalMatches < MAX_TOTAL_MATCHES;
       chunkStart += MAX_CONCURRENT_FILE_SEARCHES) {
    const chunk = searchableFiles.slice(chunkStart, chunkStart + MAX_CONCURRENT_FILE_SEARCHES);
    // Pre-filter unloaded files in parallel so non-matching files skip loading their full text.
    const hasCandidateMatch = await Promise.all(chunk.map(file => {
      if (file.isDirty() || file.contentLoaded()) {
        // Already in memory; Phase 2 searches the working copy directly (including unsaved edits).
        return true;
      }
      // Backend search returns line hits without character offsets, so use it only to find matching files.
      return file.searchInContent(options.query, options.caseSensitive, /* isRegex=*/ false)
          .then(hits => hits.length > 0, () => false);
    }));
    const phase1Interrupted = checkSearchInterrupted(options.context, options.signal);
    if (phase1Interrupted) {
      return phase1Interrupted;
    }

    // Phase 2 resolves full working copies sequentially in deterministic partitioned order
    // and stops immediately at `MAX_TOTAL_MATCHES` so excess matching files avoid loading.
    for (let indexInChunk = 0; indexInChunk < chunk.length; indexInChunk++) {
      if (!hasCandidateMatch[indexInChunk]) {
        continue;
      }

      const file = chunk[indexInChunk];
      const fileResult = await searchFileContent({
        file,
        query: options.query,
        caseSensitive: options.caseSensitive,
        context: options.context,
        signal: options.signal,
      });
      if (fileResult.status === 'interrupted') {
        return fileResult.error;
      }
      if (fileResult.status !== 'ok' || fileResult.matches.length === 0) {
        continue;
      }

      const id = ListSourcesTool.registerSource(file);
      if (id === null) {
        continue;
      }

      const perFileSelected = Math.min(fileResult.matches.length, MAX_MATCHES_PER_FILE);
      const limit = Math.min(perFileSelected, MAX_TOTAL_MATCHES - totalMatches);
      const selectedMatches = fileResult.matches.slice(0, limit);
      omittedByPerFileCap += fileResult.matches.length - perFileSelected;
      omittedByTotalCap += perFileSelected - selectedMatches.length;
      totalMatches += selectedMatches.length;

      matchLines.push(
          ...formatFileMatchLines(id, file, options.establishedOrigin, fileResult.workingCopy, selectedMatches));

      if (totalMatches >= MAX_TOTAL_MATCHES) {
        unscannedFiles = searchableFiles.length - (chunkStart + indexInChunk + 1);
        break;
      }
    }
  }

  const footerLines: string[] = [];
  if (omittedByPerFileCap > 0) {
    footerLines.push(
        `(Omitted ${omittedByPerFileCap} additional matches from files exceeding ${MAX_MATCHES_PER_FILE} ` +
        'matches each; pass id to search a specific file or refine query.)');
  }
  if (unscannedFiles > 0 || omittedByTotalCap > 0) {
    const details: string[] = [];
    if (omittedByTotalCap > 0) {
      details.push(`omitted ${omittedByTotalCap} additional matches in the last matched file`);
    }
    if (unscannedFiles > 0) {
      details.push(`${unscannedFiles} remaining files were not scanned`);
    }
    footerLines.push(`(Stopped after reaching ${MAX_TOTAL_MATCHES} total matches; ${details.join(' and ')}. ` +
        'Refine query or pass id to search a specific file.)');
  }
  if (skippedExternalSourceMapFiles > 0) {
    footerLines.push(`(Skipped ${skippedExternalSourceMapFiles} unloaded external source-map files; ` +
        'pass their id from listSources to search a specific file.)');
  }

  return formatSearchOutput(matchLines, footerLines);
}

/**
 * Loads `file` if needed and searches its active working copy so 0-based match offsets
 * match the buffer sliced by `FileFormatter` and `getSourceContent`.
 */
async function searchFileContent(options: {
  file: Workspace.UISourceCode.UISourceCode,
  query: string,
  caseSensitive: boolean,
  context: OriginLockCapability,
  signal?: AbortSignal,
}): Promise<FileSearchResult> {
  if (!options.file.isDirty() && !options.file.contentLoaded()) {
    const contentData = await options.file.requestContentData().catch((error: unknown) => ({error: String(error)}));
    const interrupted = checkSearchInterrupted(options.context, options.signal);
    if (interrupted) {
      return {status: 'interrupted', error: interrupted};
    }
    if (TextUtils.ContentData.ContentData.isError(contentData)) {
      return {status: 'load-error', error: contentData.error};
    }
  } else if (!options.file.isDirty()) {
    const loadError = options.file.loadError();
    if (loadError) {
      return {status: 'load-error', error: loadError};
    }
  }

  const workingCopy = options.file.workingCopyContentData();
  if (!workingCopy.isTextContent) {
    return {status: 'non-text'};
  }

  const matches = TextUtils.TextUtils.performSearchInContentData(workingCopy, options.query, options.caseSensitive,
                                                                 /* isRegex=*/ false);
  return {status: 'ok', workingCopy, matches};
}

function checkSearchInterrupted(
    context: OriginLockCapability,
    signal?: AbortSignal,
    ): ToolErrorResult|null {
  if (signal?.aborted) {
    return {error: 'Aborted'};
  }
  const originResult = resolveOriginFromLock(context.getOriginLock());
  return 'error' in originResult ? originResult : null;
}

function formatSearchOutput(matchLines: string[], footerLines: string[] = []): DataHandlerResult<string> {
  if (matchLines.length === 0) {
    return {result: ['No matches found.', ...footerLines].join('\n')};
  }
  return {result: ['line;offset;preview', ...matchLines, ...footerLines].join('\n')};
}

/**
 * Checks whether `file` is an unloaded, non-dirty file backed by an external source-map provider.
 * Checks `instanceof CompilerSourceMappingContentProvider` rather than `isFromSourceMap()` because
 * inline source maps use an in-memory `StaticContentProvider`, whereas
 * `CompilerSourceMappingContentProvider#searchInContent()` calls `PageResourceLoader#loadResource()`
 * over HTTP and logs 404 errors.
 */
function isUnloadedExternalSourceMap(file: Workspace.UISourceCode.UISourceCode): boolean {
  if (file.isDirty() || file.contentLoaded()) {
    return false;
  }
  const project = file.project();
  if (!(project instanceof Bindings.ContentProviderBasedProject.ContentProviderBasedProject)) {
    return false;
  }
  return project.contentProviderForUISourceCode(file) instanceof
      SDK.CompilerSourceMappingContentProvider.CompilerSourceMappingContentProvider;
}

/**
 * Filters out unloaded external source-map files and partitions remaining files so
 * authored source-mapped files scan before deployed files and fill `MAX_TOTAL_MATCHES`
 * ahead of minified bundles while preserving relative order.
 */
function partitionSearchableFiles(files: Workspace.UISourceCode.UISourceCode[]): {
  searchableFiles: Workspace.UISourceCode.UISourceCode[],
  skippedExternalSourceMapFiles: number,
} {
  const sourceMappedFiles: Workspace.UISourceCode.UISourceCode[] = [];
  const deployedFiles: Workspace.UISourceCode.UISourceCode[] = [];
  let skippedExternalSourceMapFiles = 0;

  for (const file of files) {
    if (isUnloadedExternalSourceMap(file)) {
      skippedExternalSourceMapFiles++;
      continue;
    }
    if (file.contentType().isFromSourceMap()) {
      sourceMappedFiles.push(file);
    } else {
      deployedFiles.push(file);
    }
  }

  return {
    searchableFiles: [...sourceMappedFiles, ...deployedFiles],
    skippedExternalSourceMapFiles,
  };
}

function formatFileMatchLines(
    id: number,
    file: Workspace.UISourceCode.UISourceCode,
    establishedOrigin: SDK.SecurityOrigin.SecurityOrigin,
    workingCopy: TextUtils.ContentData.ContentData,
    matches: TextUtils.ContentProvider.SearchMatch[],
    ): string[] {
  const text = workingCopy.textObj;
  return [
    `# ${id};${formatSourceName(file, establishedOrigin)}`,
    ...matches.map(match => {
      const line = match.lineNumber + 1;
      const offset = text.offsetFromPosition(match.lineNumber, match.columnNumber);
      const preview = formatMatchPreview(match.lineContent, match.columnNumber);
      return `${line};${offset};${preview}`;
    }),
  ];
}

/**
 * Formats a bounded single-line preview around `columnNumber`.
 * Stops `trimmedStart` at `columnNumber` to preserve matches starting with whitespace,
 * prepends `…` only when slicing drops non-indentation characters before the match,
 * and strips `[\r\n]` so embedded line breaks cannot break the line-delimited output.
 */
function formatMatchPreview(lineContent: string, columnNumber: number): string {
  let trimmedStart = 0;
  while (trimmedStart < columnNumber && /\s/.test(lineContent[trimmedStart])) {
    trimmedStart++;
  }
  const start = Math.max(trimmedStart, columnNumber - PREVIEW_PREFIX_LENGTH);
  const end = Math.min(lineContent.length, start + PREVIEW_MAX_LENGTH);
  const snippet = lineContent.slice(start, end).replace(/[\r\n]/g, '');
  const prefix = start > trimmedStart ? '…' : '';
  const suffix = end < lineContent.length ? '…' : '';
  return `${prefix}${snippet}${suffix}`;
}

// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Types from '../types/types.js';

import {data as metaHandlerData, type MetaHandlerData} from './MetaHandler.js';
import {data as networkRequestsHandlerData} from './NetworkRequestsHandler.js';
import type {FinalizeOptions, HandlerName} from './types.js';

export interface ScriptsData {
  /** Note: this is only populated when the "Enhanced Traces" feature is enabled. */
  scripts: Script[];
}

export interface Script {
  isolate: string;
  scriptId: Protocol.Runtime.ScriptId;
  frame: string;
  ts: Types.Timing.Micro;
  inline: boolean;
  url?: string;
  sourceUrl?: string;
  content?: string;
  /**
   * Note: this is the literal text given as the sourceMappingURL value. It has not been resolved relative to the script url.
   * Since M138, data urls are never set here.
   */
  sourceMapUrl?: string;
  /** If true, the source map url was a data URL, so it got removed from the trace event. */
  sourceMapUrlElided?: boolean;
  sourceMap?: SDK.SourceMap.SourceMap;
  request?: Types.Events.SyntheticNetworkRequest;
  /** Lazily generated - use getScriptGeneratedSizes to access. */
  sizes?: GeneratedFileSizes;
}

type GeneratedFileSizes = {
  errorMessage: string,
}|{files: Record<string, number>, unmappedBytes: number, totalBytes: number};

const scriptById = new Map<string, Script>();

export function deps(): HandlerName[] {
  return ['Meta', 'NetworkRequests'];
}

export function reset(): void {
  scriptById.clear();
}

export function handleEvent(event: Types.Events.Event): void {
  const getOrMakeScript = (isolate: string, scriptIdAsNumber: number): Script => {
    const scriptId = String(scriptIdAsNumber) as Protocol.Runtime.ScriptId;
    const key = `${isolate}.${scriptId}`;
    return Platform.MapUtilities.getWithDefault(
        scriptById, key, () => ({isolate, scriptId, frame: '', ts: 0} as Script));
  };

  if (Types.Events.isTargetRundownEvent(event) && event.args.data) {
    const {isolate, scriptId, frame} = event.args.data;
    const script = getOrMakeScript(isolate, scriptId);
    script.frame = frame;
    script.ts = event.ts;

    return;
  }

  if (Types.Events.isV8SourceRundownEvent(event)) {
    const {isolate, scriptId, url, sourceUrl, sourceMapUrl, sourceMapUrlElided} = event.args.data;
    const script = getOrMakeScript(isolate, scriptId);
    script.url = url;
    if (sourceUrl) {
      script.sourceUrl = sourceUrl;
    }

    // Older traces may have data source map urls. Those can be very large, so a change
    // was made to elide them from the trace.
    // If elided, a fresh trace will fetch the source map from the Script model
    // (see TimelinePanel getExistingSourceMap). If not fresh, the source map is resolved
    // instead in this handler via `findCachedRawSourceMap`.
    if (sourceMapUrlElided) {
      script.sourceMapUrlElided = true;
    } else if (sourceMapUrl) {
      script.sourceMapUrl = sourceMapUrl;
    }
    return;
  }

  if (Types.Events.isV8SourceRundownSourcesScriptCatchupEvent(event)) {
    const {isolate, scriptId, sourceText} = event.args.data;
    const script = getOrMakeScript(isolate, scriptId);
    script.content = sourceText;
    return;
  }

  if (Types.Events.isV8SourceRundownSourcesLargeScriptCatchupEvent(event)) {
    const {isolate, scriptId, sourceText} = event.args.data;
    const script = getOrMakeScript(isolate, scriptId);
    script.content = (script.content ?? '') + sourceText;
    return;
  }
}

function findFrame(meta: MetaHandlerData, frameId: string): Types.Events.TraceFrame|null {
  for (const frames of meta.frameByProcessId?.values()) {
    const frame = frames.get(frameId);
    if (frame) {
      return frame;
    }
  }

  return null;
}

function findNetworkRequest(networkRequests: Types.Events.SyntheticNetworkRequest[], script: Script):
    Types.Events.SyntheticNetworkRequest|null {
  if (!script.url) {
    return null;
  }

  return networkRequests.find(request => request.args.data.url === script.url) ?? null;
}

function computeMappingEndColumns(map: SDK.SourceMap.SourceMap): Map<SDK.SourceMap.SourceMapEntry, number> {
  const result = new Map<SDK.SourceMap.SourceMapEntry, number>();

  const mappings = map.mappings();
  for (let i = 0; i < mappings.length - 1; i++) {
    const mapping = mappings[i];
    const nextMapping = mappings[i + 1];
    if (mapping.lineNumber === nextMapping.lineNumber) {
      result.set(mapping, nextMapping.columnNumber);
    }
  }

  // Now, all but the last mapping on each line will have a value in this map.
  return result;
}

/**
 * Using a script's contents and source map, attribute every generated byte to an authored source file.
 */
function computeGeneratedFileSizes(script: Script): GeneratedFileSizes {
  if (!script.sourceMap) {
    throw new Error('expected source map');
  }

  const map = script.sourceMap;
  const content = script.content ?? '';
  const contentLength = content.length;
  const lines = content.split('\n');
  const files: Record<string, number> = {};
  const totalBytes = contentLength;
  let unmappedBytes = totalBytes;

  const mappingEndCols = computeMappingEndColumns(script.sourceMap);

  for (const mapping of map.mappings()) {
    const source = mapping.sourceURL;
    const lineNum = mapping.lineNumber;
    const colNum = mapping.columnNumber;
    const lastColNum = mappingEndCols.get(mapping);

    // Webpack sometimes emits null mappings.
    // https://github.com/mozilla/source-map/pull/303
    if (!source) {
      continue;
    }

    // Lines and columns are zero-based indices. Visually, lines are shown as a 1-based index.

    const line = lines[lineNum];
    if (line === null || line === undefined) {
      const errorMessage = `${map.url()} mapping for line out of bounds: ${lineNum + 1}`;
      return {errorMessage};
    }

    if (colNum > line.length) {
      const errorMessage = `${map.url()} mapping for column out of bounds: ${lineNum + 1}:${colNum}`;
      return {errorMessage};
    }

    let mappingLength = 0;
    if (lastColNum !== undefined) {
      if (lastColNum > line.length) {
        const errorMessage = `${map.url()} mapping for last column out of bounds: ${lineNum + 1}:${lastColNum}`;
        return {errorMessage};
      }
      mappingLength = lastColNum - colNum;
    } else {
      // Add +1 to account for the newline.
      mappingLength = line.length - colNum + 1;
    }
    files[source] = (files[source] || 0) + mappingLength;
    unmappedBytes -= mappingLength;
  }

  return {
    files,
    unmappedBytes,
    totalBytes,
  };
}

export function getScriptGeneratedSizes(script: Script): GeneratedFileSizes|null {
  if (script.sourceMap && !script.sizes) {
    script.sizes = computeGeneratedFileSizes(script);
  }

  return script.sizes ?? null;
}

function findCachedRawSourceMap(script: Script, options: Types.Configuration.ParseOptions): SDK.SourceMap.SourceMapV3|
    undefined {
  if (options.isFreshRecording || !options.metadata?.sourceMaps) {
    // Exit if this is not a loaded trace w/ source maps in the metadata.
    return;
  }

  // For elided data url source maps, search the metadata source maps by script url.
  if (script.sourceMapUrlElided) {
    if (!script.url) {
      return;
    }

    const cachedSourceMap = options.metadata.sourceMaps.find(m => m.url === script.url);
    if (cachedSourceMap) {
      return cachedSourceMap.sourceMap;
    }

    return;
  }

  if (!script.sourceMapUrl) {
    return;
  }

  // Otherwise, search by source map url.
  // Note: early enhanced traces may have this field set for data urls. Ignore those,
  // as they were never stored in metadata sourcemap.
  const isDataUrl = script.sourceMapUrl.startsWith('data:');
  if (!isDataUrl) {
    const cachedSourceMap = options.metadata.sourceMaps.find(m => m.sourceMapUrl === script.sourceMapUrl);
    if (cachedSourceMap) {
      return cachedSourceMap.sourceMap;
    }
  }

  return;
}

export async function finalize(options: FinalizeOptions): Promise<void> {
  const meta = metaHandlerData();
  const networkRequests = [...networkRequestsHandlerData().byId.values()];

  const documentUrls = new Set<string>();
  for (const frames of meta.frameByProcessId.values()) {
    for (const frame of frames.values()) {
      documentUrls.add(frame.url);
    }
  }

  for (const script of scriptById.values()) {
    script.request = findNetworkRequest(networkRequests, script) ?? undefined;
    script.inline = !!script.url && documentUrls.has(script.url);
  }

  if (!options.resolveSourceMap) {
    return;
  }

  const promises = [];
  for (const script of scriptById.values()) {
    // No frame or url means the script came from somewhere we don't care about.
    // Note: scripts from inline <SCRIPT> elements use the url of the HTML document,
    // so aren't ignored.
    if (!script.frame || !script.url || (!script.sourceMapUrl && !script.sourceMapUrlElided)) {
      continue;
    }

    const frameUrl = findFrame(meta, script.frame)?.url as Platform.DevToolsPath.UrlString | undefined;
    if (!frameUrl) {
      continue;
    }

    // If there is a `sourceURL` magic comment, resolve the compiledUrl against the frame url.
    // example: `// #sourceURL=foo.js` for target frame https://www.example.com/home -> https://www.example.com/home/foo.js
    let sourceUrl = script.url;
    if (script.sourceUrl) {
      sourceUrl = Common.ParsedURL.ParsedURL.completeURL(frameUrl, script.sourceUrl) ?? script.sourceUrl;
    }

    let sourceMapUrl;
    if (script.sourceMapUrl) {
      // Resolve the source map url. The value given by v8 may be relative, so resolve it here.
      // This process should match the one in `SourceMapManager.attachSourceMap`.
      sourceMapUrl =
          Common.ParsedURL.ParsedURL.completeURL(sourceUrl as Platform.DevToolsPath.UrlString, script.sourceMapUrl);
      if (!sourceMapUrl) {
        continue;
      }

      script.sourceMapUrl = sourceMapUrl;
    }

    const params: Types.Configuration.ResolveSourceMapParams = {
      scriptId: script.scriptId,
      scriptUrl: script.url as Platform.DevToolsPath.UrlString,
      sourceUrl: sourceUrl as Platform.DevToolsPath.UrlString,
      sourceMapUrl: sourceMapUrl ?? '' as Platform.DevToolsPath.UrlString,
      frame: script.frame as Protocol.Page.FrameId,
      cachedRawSourceMap: findCachedRawSourceMap(script, options),
    };
    const promise = options.resolveSourceMap(params).then(sourceMap => {
      if (sourceMap) {
        script.sourceMap = sourceMap;
      }
    });
    promises.push(promise.catch(e => {
      console.error('Uncaught error when resolving source map', params, e);
    }));
  }
  await Promise.all(promises);
}

export function data(): ScriptsData {
  return {
    scripts: [...scriptById.values()],
  };
}

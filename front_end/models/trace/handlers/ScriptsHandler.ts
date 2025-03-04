// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
// eslint-disable-next-line rulesdir/no-imports-in-directory
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Types from '../types/types.js';

import {data as metaHandlerData, type MetaHandlerData} from './MetaHandler.js';
import {data as networkRequestsHandlerData} from './NetworkRequestsHandler.js';
import type {HandlerName} from './types.js';

export interface ScriptsData {
  /** Note: this is only populated when the "Enhanced Traces" feature is enabled. */
  scripts: Script[];
}

export interface Script {
  isolate: string;
  scriptId: Protocol.Runtime.ScriptId;
  frame: string;
  ts: Types.Timing.Micro;
  url?: string;
  sourceUrl?: string;
  content?: string;
  /** Note: this is the literal text given as the sourceMappingURL value. It has not been resolved relative to the script url. */
  sourceMapUrl?: string;
  sourceMap?: SDK.SourceMap.SourceMap;
  request?: Types.Events.SyntheticNetworkRequest;
}

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
    const {isolate, scriptId, url, sourceUrl, sourceMapUrl} = event.args.data;
    const script = getOrMakeScript(isolate, scriptId);
    script.url = url;
    if (sourceUrl) {
      script.sourceUrl = sourceUrl;
    }
    if (sourceMapUrl) {
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
  return networkRequests.find(request => request.args.data.url === script.url) ?? null;
}

export async function finalize(options: Types.Configuration.ParseOptions): Promise<void> {
  const networkRequests = [...networkRequestsHandlerData().byId.values()];
  for (const script of scriptById.values()) {
    script.request = findNetworkRequest(networkRequests, script) ?? undefined;
  }

  if (!options.resolveSourceMap) {
    return;
  }

  const meta = metaHandlerData();

  const promises = [];
  for (const script of scriptById.values()) {
    // No frame or url means the script came from somewhere we don't care about.
    // Note: scripts from inline <SCRIPT> elements use the url of the HTML document,
    // so aren't ignored.
    if (!script.frame || !script.url || !script.sourceMapUrl) {
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

    // Resolve the source map url. The value given by v8 may be relative, so resolve it here.
    // This process should match the one in `SourceMapManager.attachSourceMap`.
    const sourceMapUrl =
        Common.ParsedURL.ParsedURL.completeURL(sourceUrl as Platform.DevToolsPath.UrlString, script.sourceMapUrl);
    if (!sourceMapUrl) {
      continue;
    }

    script.sourceMapUrl = sourceMapUrl;

    const params: Types.Configuration.ResolveSourceMapParams = {
      scriptId: script.scriptId,
      scriptUrl: sourceUrl as Platform.DevToolsPath.UrlString,
      sourceMapUrl: sourceMapUrl as Platform.DevToolsPath.UrlString,
      frame: script.frame as Protocol.Page.FrameId,
    };
    const promise = options.resolveSourceMap(params).then(sourceMap => {
      if (sourceMap) {
        script.sourceMap = sourceMap;
      }
    });
    promises.push(promise);
  }
  await Promise.all(promises);
}

export function data(): ScriptsData {
  return {
    scripts: [...scriptById.values()],
  };
}

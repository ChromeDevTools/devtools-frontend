// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
// eslint-disable-next-line rulesdir/no-imports-in-directory
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Types from '../types/types.js';

export interface ScriptsData {
  /** Note: this is only populated when the "Enhanced Traces" feature is enabled. */
  scripts: Map<Protocol.Runtime.ScriptId, Script>;
}

export interface Script {
  scriptId: Protocol.Runtime.ScriptId;
  frame: string;
  ts: Types.Timing.Micro;
  url?: string;
  content?: string;
  sourceMapUrl?: string;
  sourceMap?: SDK.SourceMap.SourceMap;
}

const scriptById = new Map<Protocol.Runtime.ScriptId, Script>();

export function reset(): void {
  scriptById.clear();
}

export function handleEvent(event: Types.Events.Event): void {
  const getOrMakeScript = (scriptId: Protocol.Runtime.ScriptId): Script =>
      Platform.MapUtilities.getWithDefault(scriptById, scriptId, () => ({scriptId, frame: '', ts: 0} as Script));

  if (Types.Events.isTargetRundownEvent(event) && event.args.data) {
    const {scriptId, frame} = event.args.data;
    const script = getOrMakeScript(scriptId);
    script.frame = frame;
    script.ts = event.ts;

    return;
  }

  if (Types.Events.isV8SourceRundownEvent(event)) {
    const {scriptId, url, sourceMapUrl} = event.args.data;
    const script = getOrMakeScript(scriptId);
    script.url = url;
    if (sourceMapUrl) {
      script.sourceMapUrl = sourceMapUrl;
    }
    return;
  }

  if (Types.Events.isV8SourceRundownSourcesScriptCatchupEvent(event)) {
    const {scriptId, sourceText} = event.args.data;
    const script = getOrMakeScript(scriptId);
    script.content = sourceText;
    return;
  }

  if (Types.Events.isV8SourceRundownSourcesLargeScriptCatchupEvent(event)) {
    const {scriptId, sourceText} = event.args.data;
    const script = getOrMakeScript(scriptId);
    script.content = (script.content ?? '') + sourceText;
    return;
  }
}

export async function finalize(options: Types.Configuration.ParseOptions): Promise<void> {
  if (!options.resolveSourceMap) {
    return;
  }

  const promises = [];
  for (const script of scriptById.values()) {
    if (script.sourceMapUrl) {
      promises.push(options.resolveSourceMap(script.sourceMapUrl).then(sourceMap => {
        script.sourceMap = sourceMap;
      }));
    }
  }
  await Promise.all(promises);
}

export function data(): ScriptsData {
  return {
    scripts: scriptById,
  };
}

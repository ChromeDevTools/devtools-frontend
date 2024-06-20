// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Types from '../types/types.js';

import {HandlerState} from './types.js';

export const EnhancedTracesVersion: number = 1;

export interface Script {
  scriptId: number;
  isolate: string;
  url: string;
  executionContextId: number;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  hash: string;
  isModule?: boolean;
  hasSourceUrl?: boolean;
  sourceMapUrl?: string;
  length?: number;
  sourceText?: string;
}

export interface ExecutionContextAuxData {
  frameId?: string;
  isDefault?: boolean;
  type?: string;
}

export interface ExecutionContext {
  id: number;
  origin: string;
  v8Context?: string;
  auxData?: ExecutionContextAuxData;
}

export interface Target {
  id: string;
  type: string;
  url: string;
  pid?: number;
  isolate?: string;
}

export interface EnhancedTracesData {
  targets: Target[];
  executionContexts: ExecutionContext[];
  scripts: Script[];
}

let handlerState = HandlerState.UNINITIALIZED;

const scriptRundownEvents: Types.TraceEvents.TraceEventScriptRundown[] = [];
const scriptToV8Context: Map<string, string> = new Map<string, string>();
const scriptToScriptSource: Map<string, string> = new Map<string, string>();
const scriptToSourceLength: Map<string, number> = new Map<string, number>();
const targets: Target[] = [];
const executionContexts: ExecutionContext[] = [];
const scripts: Script[] = [];

function getScriptIsolateId(isolate: string, scriptId: number): string {
  return scriptId + '@' + isolate;
}

export function initialize(): void {
  if (handlerState !== HandlerState.UNINITIALIZED) {
    throw new Error('Enhanced Traces Handler was not reset');
  }

  handlerState = HandlerState.INITIALIZED;
}

export function reset(): void {
  scriptRundownEvents.length = 0;
  scriptToV8Context.clear();
  scriptToScriptSource.clear();
  scriptToSourceLength.clear();
  targets.length = 0;
  executionContexts.length = 0;
  scripts.length = 0;
  handlerState = HandlerState.UNINITIALIZED;
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Enhanced Traces Handler is not initialized while handling event');
  }
  if (Types.TraceEvents.isTraceEventTargetRundown(event)) {
    // Set up script to v8 context mapping
    const data = event.args?.data;
    scriptToV8Context.set(getScriptIsolateId(data.isolate, data.scriptId), data.v8context);
    // Add target
    if (!targets.find(target => target.id === data.frame)) {
      targets.push({
        id: data.frame,
        type: data.frameType,
        isolate: data.isolate,
        pid: event.pid,
        url: data.url,
      });
    }
    // Add execution context, need to put back execution context id with info from other traces
    if (!executionContexts.find(executionContext => executionContext.v8Context === data.v8context)) {
      executionContexts.push({
        id: -1,
        origin: data.origin,
        v8Context: data.v8context,
        auxData: {
          frameId: data.frame,
          isDefault: data.isDefault,
          type: data.contextType,
        },
      });
    }
  } else if (Types.TraceEvents.isTraceEventScriptRundown(event)) {
    scriptRundownEvents.push(event);
    const data = event.args.data;
    // Add script
    if (!scripts.find(script => script.scriptId === data.scriptId && script.isolate === data.isolate)) {
      scripts.push({
        scriptId: data.scriptId,
        isolate: data.isolate,
        executionContextId: data.executionContextId,
        startLine: data.startLine,
        startColumn: data.startColumn,
        endLine: data.endLine,
        endColumn: data.endColumn,
        hash: data.hash,
        isModule: data.isModule,
        url: data.url,
        hasSourceUrl: data.hasSourceUrl,
        sourceMapUrl: data.sourceMapUrl,
      });
    }
  } else if (Types.TraceEvents.isTraceEventScriptRundownSource(event)) {
    // Set up script to source text and length mapping
    const data = event.args.data;
    const scriptIsolateId = getScriptIsolateId(data.isolate, data.scriptId);
    if (data.sourceText) {
      scriptToScriptSource.set(scriptIsolateId, data.sourceText);
    }
    if (data.length) {
      scriptToSourceLength.set(scriptIsolateId, data.length);
    }
  }
}

export async function finalize(): Promise<void> {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Enhanced Traces Handler is not initialized while being finalized');
  }
  // Put back execution context id
  const v8ContextToExecutionContextId: Map<string, number> = new Map<string, number>();
  scriptRundownEvents.forEach(scriptRundownEvent => {
    const data = scriptRundownEvent.args.data;
    const v8Context = scriptToV8Context.get(getScriptIsolateId(data.isolate, data.scriptId));
    if (v8Context) {
      v8ContextToExecutionContextId.set(v8Context, data.executionContextId);
    }
  });
  executionContexts.forEach(executionContext => {
    if (executionContext.v8Context) {
      const id = v8ContextToExecutionContextId.get(executionContext.v8Context);
      if (id) {
        executionContext.id = id;
      }
    }
  });

  // Put back script source text and length
  scripts.forEach(script => {
    const scriptIsolateId = getScriptIsolateId(script.isolate, script.scriptId);
    script.sourceText = scriptToScriptSource.get(scriptIsolateId);
    script.length = scriptToSourceLength.get(scriptIsolateId);
  });
  handlerState = HandlerState.FINALIZED;
}

export function data(): EnhancedTracesData {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error('Enhanced Traces Handler is not finalized');
  }

  return {
    targets: targets,
    executionContexts: executionContexts,
    scripts: scripts,
  };
}

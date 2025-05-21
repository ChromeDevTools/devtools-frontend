// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';

import type {SourceMapV3} from './SourceMap.js';

export interface RehydratingScript {
  scriptId: Protocol.Runtime.ScriptId;
  isolate: string;
  url: string;
  executionContextId: Protocol.Runtime.ExecutionContextId;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  hash: string;
  isModule?: boolean;
  hasSourceURL?: boolean;
  sourceMapURL?: string;
  sourceURL?: string;
  length?: number;
  sourceText?: string;
  auxData?: RehydratingExecutionContextAuxData;
  pid?: number;
}

export interface RehydratingExecutionContextAuxData {
  frameId?: Protocol.Page.FrameId;
  isDefault?: boolean;
  type?: string;
}

export interface RehydratingExecutionContext {
  id: Protocol.Runtime.ExecutionContextId;
  origin: string;
  v8Context?: string;
  name?: string;
  auxData?: RehydratingExecutionContextAuxData;
  isolate: string;
}

export interface RehydratingTarget {
  targetId: Protocol.Target.TargetID;
  type: string;
  url: string;
  pid?: number;
  isolate?: string;
}

export interface HydratingDataPerTarget {
  target: RehydratingTarget;
  executionContexts: RehydratingExecutionContext[];
  scripts: RehydratingScript[];
}

export interface ProtocolMessage {
  id: number;
  method: string;
  sessionId?: number;
  params?: object;
}

export interface ProtocolEvent {
  method: string;
  params: object;
}

export interface ProtocolResponse {
  id: number;
}

export type ServerMessage = (ProtocolEvent|ProtocolMessage|ProtocolResponse)&Record<string, unknown>;

export interface Session {
  target: RehydratingTarget;
  executionContexts: RehydratingExecutionContext[];
  scripts: RehydratingScript[];
}

// TODO: we need to resolve the inability to use Trace model types inside SDK. For
// now, duplicate a minimal type here.
export interface TraceFile {
  traceEvents: readonly object[];
  metadata: {sourceMaps?: Array<{sourceMapUrl: string, sourceMap: SourceMapV3}>};
}

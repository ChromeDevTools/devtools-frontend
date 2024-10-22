// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import {UserVisibleError} from '../platform/platform.js';

import type {
  HydratingDataPerTarget, RehydratingExecutionContext, RehydratingScript, RehydratingTarget} from
  './RehydratingObject.js';

interface RehydratingTraceBase {
  cat: string;
  pid: number;
}

interface TraceEventTargetRundown extends RehydratingTraceBase {
  cat: 'disabled-by-default-devtools.target-rundown';
  args: {
    data: {
      frame: Protocol.Page.FrameId,
      frameType: string,
      url: string,
      isolate: string,
      v8context: string,
      origin: string,
      scriptId: Protocol.Runtime.ScriptId,
      isDefault?: boolean,
      contextType?: string,
    },
  };
}

interface TraceEventScriptRundown extends RehydratingTraceBase {
  cat: 'disabled-by-default-devtools.v8-source-rundown';
  args: {
    data: {
      isolate: string,
      executionContextId: Protocol.Runtime.ExecutionContextId,
      scriptId: Protocol.Runtime.ScriptId,
      startLine: number,
      startColumn: number,
      endLine: number,
      endColumn: number,
      url: string,
      hash: string,
      isModule: boolean,
      hasSourceUrl: boolean,
      sourceMapUrl?: string,
    },
  };
}

interface TraceEventScriptRundownSource extends RehydratingTraceBase {
  cat: 'disabled-by-default-devtools.v8-source-rundown-sources';
  args: {
    data: {
      isolate: string,
      scriptId: Protocol.Runtime.ScriptId,
      length?: number,
      sourceText?: string,
    },
  };
}

export class EnhancedTracesParser {
  #scriptRundownEvents: TraceEventScriptRundown[] = [];
  #scriptToV8Context: Map<string, string> = new Map<string, string>();
  #scriptToScriptSource: Map<string, string> = new Map<string, string>();
  #largeScriptToScriptSource: Map<string, string[]> = new Map<string, string[]>();
  #scriptToSourceLength: Map<string, number> = new Map<string, number>();
  #targets: RehydratingTarget[] = [];
  #executionContexts: RehydratingExecutionContext[] = [];
  #scripts: RehydratingScript[] = [];
  static readonly enhancedTraceVersion: number = 1;

  constructor(traceEvents: unknown[]) {
    // Initialize with the trace events provided.
    try {
      this.parseEnhancedTrace(traceEvents);
    } catch (e) {
      throw new UserVisibleError.UserVisibleError(e);
    }
  }

  parseEnhancedTrace(traceEvents: unknown[]): void {
    for (const event of traceEvents) {
      if (this.isTargetRundownEvent(event)) {
        // Set up script to v8 context mapping
        const data = event.args?.data;
        this.#scriptToV8Context.set(this.getScriptIsolateId(data.isolate, data.scriptId), data.v8context);
        // Add target
        if (!this.#targets.find(target => target.targetId === data.frame)) {
          this.#targets.push({
            targetId: data.frame,
            type: data.frameType,
            isolate: data.isolate,
            pid: event.pid,
            url: data.url,
          });
        }
        // Add execution context, need to put back execution context id with info from other traces
        if (!this.#executionContexts.find(executionContext => executionContext.v8Context === data.v8context)) {
          this.#executionContexts.push({
            id: -1 as Protocol.Runtime.ExecutionContextId,
            origin: data.origin,
            v8Context: data.v8context,
            auxData: {
              frameId: data.frame,
              isDefault: data.isDefault,
              type: data.contextType,
            },
            isolate: data.isolate,
          });
        }
      } else if (this.isScriptRundownEvent(event)) {
        this.#scriptRundownEvents.push(event);
        const data = event.args.data;
        // Add script
        if (!this.#scripts.find(script => script.scriptId === data.scriptId && script.isolate === data.isolate)) {
          this.#scripts.push({
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
      } else if (this.isScriptRundownSourceEvent(event)) {
        // Set up script to source text and length mapping
        const data = event.args.data;
        const scriptIsolateId = this.getScriptIsolateId(data.isolate, data.scriptId);
        if ('splitIndex' in data && 'splitCount' in data) {
          if (!this.#largeScriptToScriptSource.has(scriptIsolateId)) {
            this.#largeScriptToScriptSource.set(scriptIsolateId, new Array(data.splitCount).fill('') as string[]);
          }
          const splittedSource = this.#largeScriptToScriptSource.get(scriptIsolateId);
          if (splittedSource && data.sourceText) {
            splittedSource[data.splitIndex as number] = data.sourceText;
          }
        } else {
          if (data.sourceText) {
            this.#scriptToScriptSource.set(scriptIsolateId, data.sourceText);
          }
          if (data.length) {
            this.#scriptToSourceLength.set(scriptIsolateId, data.length);
          }
        }
      }
    }
  }

  data(): HydratingDataPerTarget {
    // Put back execution context id
    const v8ContextToExecutionContextId: Map<string, Protocol.Runtime.ExecutionContextId> =
        new Map<string, Protocol.Runtime.ExecutionContextId>();
    this.#scriptRundownEvents.forEach(scriptRundownEvent => {
      const data = scriptRundownEvent.args.data;
      const v8Context = this.#scriptToV8Context.get(this.getScriptIsolateId(data.isolate, data.scriptId));
      if (v8Context) {
        v8ContextToExecutionContextId.set(v8Context, data.executionContextId);
      }
    });
    this.#executionContexts.forEach(executionContext => {
      if (executionContext.v8Context) {
        const id = v8ContextToExecutionContextId.get(executionContext.v8Context);
        if (id) {
          executionContext.id = id;
        }
      }
    });

    // Put back script source text and length
    this.#scripts.forEach(script => {
      const scriptIsolateId = this.getScriptIsolateId(script.isolate, script.scriptId);
      if (this.#scriptToScriptSource.has(scriptIsolateId)) {
        script.sourceText = this.#scriptToScriptSource.get(scriptIsolateId);
        script.length = this.#scriptToSourceLength.get(scriptIsolateId);
      } else if (this.#largeScriptToScriptSource.has(scriptIsolateId)) {
        const splittedSources = this.#largeScriptToScriptSource.get(scriptIsolateId);
        if (splittedSources) {
          script.sourceText = splittedSources.join('');
          script.length = script.sourceText.length;
        }
      }
      // put in the aux data
      script.auxData =
          this.#executionContexts
              .find(context => context.id === script.executionContextId && context.isolate === script.isolate)
              ?.auxData;
    });
    const data = new Map<RehydratingTarget, [RehydratingExecutionContext[], RehydratingScript[]]>();
    for (const target of this.#targets) {
      data.set(target, this.groupContextsAndScriptsUnderTarget(target, this.#executionContexts, this.#scripts));
    }
    return data;
  }

  private getScriptIsolateId(isolate: string, scriptId: Protocol.Runtime.ScriptId): string {
    return scriptId + '@' + isolate;
  }

  private isTraceEvent(event: unknown): event is RehydratingTraceBase {
    return 'cat' in (event as RehydratingTraceBase) && 'pid' in (event as RehydratingTraceBase);
  }

  private isTargetRundownEvent(event: unknown): event is TraceEventTargetRundown {
    return this.isTraceEvent(event) && event.cat === 'disabled-by-default-devtools.target-rundown';
  }

  private isScriptRundownEvent(event: unknown): event is TraceEventScriptRundown {
    return this.isTraceEvent(event) && event.cat === 'disabled-by-default-devtools.v8-source-rundown';
  }

  private isScriptRundownSourceEvent(event: unknown): event is TraceEventScriptRundownSource {
    return this.isTraceEvent(event) && event.cat === 'disabled-by-default-devtools.v8-source-rundown-sources';
  }

  private groupContextsAndScriptsUnderTarget(
      target: RehydratingTarget, executionContexts: RehydratingExecutionContext[],
      scripts: RehydratingScript[]): [RehydratingExecutionContext[], RehydratingScript[]] {
    const filteredExecutionContexts: RehydratingExecutionContext[] = [];
    const filteredScripts: RehydratingScript[] = [];
    for (const executionContext of executionContexts) {
      if (executionContext.auxData?.frameId === target.targetId) {
        filteredExecutionContexts.push(executionContext);
      }
    }
    for (const script of scripts) {
      if (script.auxData === null) {
        console.error(script + ' missing aux data');
      }
      if (script.auxData?.frameId === target.targetId) {
        filteredScripts.push(script);
      }
    }
    return [filteredExecutionContexts, filteredScripts];
  }
}

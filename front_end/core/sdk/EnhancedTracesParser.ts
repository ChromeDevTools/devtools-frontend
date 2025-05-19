// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import * as Common from '../common/common.js';
import type * as Platform from '../platform/platform.js';
import {UserVisibleError} from '../platform/platform.js';

import type {
  HydratingDataPerTarget, RehydratingExecutionContext, RehydratingScript, RehydratingTarget, TraceFile} from
  './RehydratingObject.js';
import type {SourceMapV3} from './SourceMap.js';

interface RehydratingTraceBase {
  cat: string;
  pid: number;
  args: {data: object};
  name: string;
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
      scriptId: number,
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
      scriptId: number,
      // These don't actually get set in v8.
      url: string,
      hash: string,
      isModule: boolean,
      hasSourceUrl: boolean,
      startLine?: number,
      startColumn?: number,
      endLine?: number,
      endColumn?: number,
      sourceUrl?: string,
      sourceMapUrl?: string,
    },
  };
}

interface TraceEventScriptRundownSource extends RehydratingTraceBase {
  cat: 'disabled-by-default-devtools.v8-source-rundown-sources';
  args: {
    data: {
      isolate: string,
      scriptId: number,
      length?: number,
      sourceText?: string,
    },
  };
}

interface TraceEventTracingStartedInBrowser extends RehydratingTraceBase {
  cat: 'disabled-by-default-devtools.timeline';
  args: {
    data: {
      frames: [{
        frame: Protocol.Page.FrameId,
        isInPrimaryMainFrame: boolean,
        isOutermostMainFrame: boolean,
        parent: Protocol.Page.FrameId,
        processId: number,
        url: string,
        pid: number,
      }],
    },
  };
}

interface TraceEventFunctionCall extends RehydratingTraceBase {
  cat: 'devtools.timeline';
  args: {
    data: {
      frame: Protocol.Page.FrameId,
      scriptId: Protocol.Runtime.ScriptId,
      isolate?: string,
    },
  };
}

export class EnhancedTracesParser {
  #trace: TraceFile;
  #scriptRundownEvents: TraceEventScriptRundown[] = [];
  #scriptToV8Context: Map<string, string> = new Map<string, string>();
  #scriptToFrame: Map<string, Protocol.Page.FrameId> = new Map<string, Protocol.Page.FrameId>();
  #scriptToScriptSource: Map<string, string> = new Map<string, string>();
  #largeScriptToScriptSource: Map<string, string[]> = new Map<string, string[]>();
  #scriptToSourceLength: Map<string, number> = new Map<string, number>();
  #targets: RehydratingTarget[] = [];
  #executionContexts: RehydratingExecutionContext[] = [];
  #scripts: RehydratingScript[] = [];
  static readonly enhancedTraceVersion: number = 1;

  constructor(trace: TraceFile) {
    this.#trace = trace;

    // Initialize with the trace provided.
    try {
      this.parseEnhancedTrace();
    } catch (e) {
      throw new UserVisibleError.UserVisibleError(e);
    }
  }

  parseEnhancedTrace(): void {
    for (const event of this.#trace.traceEvents) {
      if (this.isTracingStartInBrowserEvent(event)) {
        // constructs all targets by devtools.timeline TracingStartedInBrowser
        const data = event.args?.data;
        for (const frame of data.frames) {
          if (frame.url === 'about:blank') {
            continue;
          }
          const frameId = frame.frame as string as Protocol.Target.TargetID;
          if (!this.#targets.find(target => target.targetId === frameId)) {
            const frameType = frame.isOutermostMainFrame ? 'page' : 'iframe';
            this.#targets.push({
              targetId: frameId,
              type: frameType,
              pid: frame.processId,
              url: frame.url,
            });
          }
        }
      } else if (this.isFunctionCallEvent(event)) {
        // constructs all script to frame mapping with devtools.timeline FunctionCall
        const data = event.args?.data;
        if (data.isolate) {
          this.#scriptToFrame.set(this.getScriptIsolateId(data.isolate, data.scriptId), data.frame);
        }
      } else if (this.isTargetRundownEvent(event)) {
        // Set up script to v8 context mapping
        const data = event.args?.data;
        this.#scriptToV8Context.set(this.getScriptIsolateId(data.isolate, data.scriptId), data.v8context);
        this.#scriptToFrame.set(this.getScriptIsolateId(data.isolate, data.scriptId), data.frame);
        // All the targets should've been added by the TracingStartedInBrowser event, but just in case we're missing some there
        const frameId = data.frame as string as Protocol.Target.TargetID;
        if (!this.#targets.find(target => target.targetId === frameId)) {
          this.#targets.push({
            targetId: frameId,
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
        if (!this.#scripts.find(
                script => script.scriptId === String(data.scriptId) && script.isolate === data.isolate)) {
          this.#scripts.push({
            scriptId: String(data.scriptId) as Protocol.Runtime.ScriptId,
            isolate: data.isolate,
            executionContextId: data.executionContextId,
            startLine: data.startLine ?? 0,
            startColumn: data.startColumn ?? 0,
            endLine: data.endLine ?? 0,
            endColumn: data.endColumn ?? 0,
            hash: data.hash,
            isModule: data.isModule,
            url: data.url,
            hasSourceURL: data.hasSourceUrl,
            sourceURL: data.sourceUrl,
            sourceMapURL: data.sourceMapUrl,
            pid: event.pid,
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

  data(): HydratingDataPerTarget[] {
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
      const linkedExecutionContext = this.#executionContexts.find(
          context => context.id === script.executionContextId && context.isolate === script.isolate);
      if (linkedExecutionContext) {
        script.auxData = linkedExecutionContext.auxData;
        // If a script successfully mapped to an execution context and aux data, link script to frame
        if (script.auxData?.frameId) {
          this.#scriptToFrame.set(scriptIsolateId, script.auxData?.frameId);
        }
      }
    });

    for (const script of this.#scripts) {
      // Resolve the source map from the provided metadata.
      // If no map is found for a given source map url, no source map is passed to the debugger model.
      // Encoded as a data url so that the debugger model makes no network request.
      // NOTE: consider passing directly as object and hacking `parsedScriptSource` in DebuggerModel.ts to handle
      // this fake event. Would avoid a lot of wasteful (de)serialization. Maybe add SDK.Script.hydratedSourceMap.
      this.resolveSourceMap(script);
    }

    return this.groupContextsAndScriptsUnderTarget(this.#targets, this.#executionContexts, this.#scripts);
  }

  private resolveSourceMap(script: RehydratingScript): void {
    if (script.sourceMapURL?.startsWith('data:')) {
      return;
    }

    const sourceMap = this.getSourceMapFromMetadata(script);
    if (!sourceMap) {
      return;
    }

    // Note: this encoding + re-parsing overhead cost ~10ms per 1MB of JSON on my
    // Mac M1 Pro.
    // See https://crrev.com/c/6490409/comments/f294c12a_69781e24
    const payload = encodeURIComponent(JSON.stringify(sourceMap));
    script.sourceMapURL = `data:application/json;charset=utf-8,${payload}`;
  }

  private getSourceMapFromMetadata(script: RehydratingScript): SourceMapV3|undefined {
    const {hasSourceURL, sourceURL, url, sourceMapURL, isolate, scriptId} = script;

    if (!sourceMapURL || !this.#trace.metadata.sourceMaps) {
      return;
    }

    const frame =
        this.#scriptToFrame.get(this.getScriptIsolateId(isolate, scriptId)) as string as Protocol.Target.TargetID;
    if (!frame) {
      return;
    }

    const target = this.#targets.find(t => t.targetId === frame);
    if (!target) {
      return;
    }

    let resolvedSourceUrl = url;
    if (hasSourceURL && sourceURL) {
      const targetUrl = target.url as Platform.DevToolsPath.UrlString;
      resolvedSourceUrl = Common.ParsedURL.ParsedURL.completeURL(targetUrl, sourceURL) ?? sourceURL;
    }

    // Resolve the source map url. The value given by v8 may be relative, so resolve it here.
    // This process should match the one in `SourceMapManager.attachSourceMap`.
    const resolvedSourceMapUrl =
        Common.ParsedURL.ParsedURL.completeURL(resolvedSourceUrl as Platform.DevToolsPath.UrlString, sourceMapURL);
    if (!resolvedSourceMapUrl) {
      return;
    }

    const {sourceMap} = this.#trace.metadata.sourceMaps.find(m => m.sourceMapUrl === resolvedSourceMapUrl) ?? {};
    return sourceMap;
  }

  private getScriptIsolateId(isolate: string, scriptId: Protocol.Runtime.ScriptId|number): string {
    return scriptId + '@' + isolate;
  }

  private getExecutionContextIsolateId(isolate: string, executionContextId: Protocol.Runtime.ExecutionContextId):
      string {
    return executionContextId + '@' + isolate;
  }

  private isTraceEvent(event: unknown): event is RehydratingTraceBase {
    return 'cat' in (event as RehydratingTraceBase) && 'pid' in (event as RehydratingTraceBase) &&
        'args' in (event as RehydratingTraceBase) && 'data' in (event as RehydratingTraceBase).args;
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

  private isTracingStartInBrowserEvent(event: unknown): event is TraceEventTracingStartedInBrowser {
    return this.isTraceEvent(event) && event.cat === 'disabled-by-default-devtools.timeline' &&
        event.name === 'TracingStartedInBrowser';
  }

  private isFunctionCallEvent(event: unknown): event is TraceEventFunctionCall {
    return this.isTraceEvent(event) && event.cat === 'devtools.timeline' && event.name === 'FunctionCall';
  }

  private groupContextsAndScriptsUnderTarget(
      targets: RehydratingTarget[], executionContexts: RehydratingExecutionContext[],
      scripts: RehydratingScript[]): HydratingDataPerTarget[] {
    const data: HydratingDataPerTarget[] = [];
    const targetIds = new Set<Protocol.Target.TargetID>();
    const targetToExecutionContexts: Map<string, RehydratingExecutionContext[]> =
        new Map<Protocol.Target.TargetID, RehydratingExecutionContext[]>();
    // We want to keep track of how each execution context is linked to targets so we may use this
    // information to link scripts with no target to a target
    const executionContextIsolateToTarget: Map<string, Protocol.Target.TargetID> =
        new Map<string, Protocol.Target.TargetID>();
    const targetToScripts: Map<Protocol.Target.TargetID, RehydratingScript[]> =
        new Map<Protocol.Target.TargetID, RehydratingScript[]>();
    const orphanScripts: RehydratingScript[] = [];

    // Initialize all the mapping needed
    for (const target of targets) {
      targetIds.add(target.targetId);
      targetToExecutionContexts.set(target.targetId, []);
      targetToScripts.set(target.targetId, []);
    }

    // Put all of the known execution contexts under respective targets
    for (const executionContext of executionContexts) {
      const frameId = executionContext.auxData?.frameId as string as Protocol.Target.TargetID;
      if (frameId && targetIds.has(frameId)) {
        targetToExecutionContexts.get(frameId)?.push(executionContext);
        executionContextIsolateToTarget.set(
            this.getExecutionContextIsolateId(executionContext.isolate, executionContext.id), frameId);
      } else {
        console.error('Execution context can\'t be linked to a target', executionContext);
      }
    }

    // Put all of the scripts under respective targets with collected information
    for (const script of scripts) {
      const scriptExecutionContextIsolateId =
          this.getExecutionContextIsolateId(script.isolate, script.executionContextId);
      const scriptFrameId = script.auxData?.frameId as string as Protocol.Target.TargetID;
      if (script.auxData?.frameId && targetIds.has(scriptFrameId)) {
        targetToScripts.get(scriptFrameId)?.push(script);
        executionContextIsolateToTarget.set(scriptExecutionContextIsolateId, scriptFrameId);
      } else if (this.#scriptToFrame.has(this.getScriptIsolateId(script.isolate, script.scriptId))) {
        const targetId = this.#scriptToFrame.get(this.getScriptIsolateId(script.isolate, script.scriptId)) as string as
            Protocol.Target.TargetID;
        if (targetId) {
          targetToScripts.get(targetId)?.push(script);
          executionContextIsolateToTarget.set(scriptExecutionContextIsolateId, targetId);
        }
      } else {
        // These scripts are not linked to any target
        orphanScripts.push(script);
      }
    }

    // If a script is not linked to a target, use executionContext@isolate to link to a target
    // Using PID is the last resort
    for (const orphanScript of orphanScripts) {
      const orphanScriptExecutionContextIsolateId =
          this.getExecutionContextIsolateId(orphanScript.isolate, orphanScript.executionContextId);
      if (orphanScriptExecutionContextIsolateId in executionContextIsolateToTarget) {
        const frameId = executionContextIsolateToTarget.get(orphanScriptExecutionContextIsolateId);
        if (frameId) {
          targetToScripts.get(frameId)?.push(orphanScript);
        }
      } else if (orphanScript.pid) {
        const target = targets.find(target => target.pid === orphanScript.pid);
        if (target) {
          targetToScripts.get(target.targetId)?.push(orphanScript);
        }
      } else {
        console.error('Script can\'t be linked to any target', orphanScript);
      }
    }

    // Now all the scripts are linked to a target, we want to make sure all the scripts are pointing to a valid
    // execution context. If not, we will create an artificial execution context for the script
    for (const target of targets) {
      const targetId = target.targetId;
      const executionContexts = targetToExecutionContexts.get(targetId) || [];
      const scripts = targetToScripts.get(targetId) || [];
      for (const script of scripts) {
        if (!executionContexts.find(context => context.id === script.executionContextId)) {
          const artificialContext: RehydratingExecutionContext = {
            id: script.executionContextId,
            origin: '',
            v8Context: '',
            auxData: {
              frameId: targetId as string as Protocol.Page.FrameId,
              isDefault: false,
              type: 'type',
            },
            isolate: script.isolate,
          };
          executionContexts.push(artificialContext);
        }
      }

      // Finally, we put all the information into the data structure we want to return as.
      data.push({target, executionContexts, scripts});
    }

    return data;
  }
}

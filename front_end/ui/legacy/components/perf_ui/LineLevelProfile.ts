// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../core/sdk/sdk.js';
import * as Bindings from '../../../../models/bindings/bindings.js';
import * as Workspace from '../../../../models/workspace/workspace.js';
import * as SourceFrame from '../source_frame/source_frame.js';
import type * as Platform from '../../../../core/platform/platform.js';
import type * as Protocol from '../../../../generated/protocol.js';

let performanceInstance: Performance;

export class Performance {
  private readonly helper: Helper;

  private constructor() {
    this.helper = new Helper(SourceFrame.SourceFrame.DecoratorType.PERFORMANCE);
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): Performance {
    const {forceNew} = opts;
    if (!performanceInstance || forceNew) {
      performanceInstance = new Performance();
    }

    return performanceInstance;
  }

  reset(): void {
    this.helper.reset();
  }

  private appendLegacyCPUProfile(profile: SDK.CPUProfileDataModel.CPUProfileDataModel): void {
    const target = profile.target();

    const nodesToGo: SDK.CPUProfileDataModel.CPUProfileNode[] = [profile.profileHead];
    const sampleDuration = (profile.profileEndTime - profile.profileStartTime) / profile.totalHitCount;
    while (nodesToGo.length) {
      const nodes: SDK.CPUProfileDataModel.CPUProfileNode[] =
          // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (nodesToGo.pop() as any).children;  // Cast to any because runtime checks assert the props.
      for (let i = 0; i < nodes.length; ++i) {
        const node = nodes[i];
        nodesToGo.push(node);
        if (!node.url || !node.positionTicks) {
          continue;
        }
        for (let j = 0; j < node.positionTicks.length; ++j) {
          const lineInfo = node.positionTicks[j];
          const line = lineInfo.line;
          const time = lineInfo.ticks * sampleDuration;
          this.helper.addLineData(target, node.url, line, time);
        }
      }
    }
  }

  appendCPUProfile(profile: SDK.CPUProfileDataModel.CPUProfileDataModel): void {
    if (!profile.lines) {
      this.appendLegacyCPUProfile(profile);
      this.helper.scheduleUpdate();
      return;
    }
    const target = profile.target();
    if (!profile.samples) {
      return;
    }

    for (let i = 1; i < profile.samples.length; ++i) {
      const line = profile.lines[i];
      if (!line) {
        continue;
      }
      const node = profile.nodeByIndex(i);
      if (!node) {
        continue;
      }
      const scriptIdOrUrl = Number(node.scriptId) || node.url;
      if (!scriptIdOrUrl) {
        continue;
      }
      const time = profile.timestamps[i] - profile.timestamps[i - 1];
      this.helper.addLineData(target, scriptIdOrUrl, line, time);
    }
    this.helper.scheduleUpdate();
  }
}

let memoryInstance: Memory;

export class Memory {
  private readonly helper: Helper;
  private constructor() {
    this.helper = new Helper(SourceFrame.SourceFrame.DecoratorType.MEMORY);
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): Memory {
    const {forceNew} = opts;
    if (!memoryInstance || forceNew) {
      memoryInstance = new Memory();
    }

    return memoryInstance;
  }

  reset(): void {
    this.helper.reset();
  }

  appendHeapProfile(profile: Protocol.HeapProfiler.SamplingHeapProfile, target: SDK.Target.Target|null): void {
    const helper = this.helper;
    processNode(profile.head);
    helper.scheduleUpdate();

    function processNode(node: Protocol.HeapProfiler.SamplingHeapProfileNode): void {
      node.children.forEach(processNode);
      if (!node.selfSize) {
        return;
      }
      const script = Number(node.callFrame.scriptId) || node.callFrame.url as Platform.DevToolsPath.UrlString;
      if (!script) {
        return;
      }
      const line = node.callFrame.lineNumber + 1;
      helper.addLineData(target, script, line, node.selfSize);
    }
  }
}

export class Helper {
  private readonly type: string;
  private readonly locationPool: Bindings.LiveLocation.LiveLocationPool;
  private updateTimer: number|null;
  private lineData!: Map<SDK.Target.Target|null, Map<Platform.DevToolsPath.UrlString|number, Map<number, number>>>;

  constructor(type: string) {
    this.type = type;
    this.locationPool = new Bindings.LiveLocation.LiveLocationPool();
    this.updateTimer = null;
    this.reset();
  }

  reset(): void {
    // The second map uses string keys for script URLs and numbers for scriptId.
    this.lineData = new Map();
    this.scheduleUpdate();
  }

  addLineData(
      target: SDK.Target.Target|null, scriptIdOrUrl: Platform.DevToolsPath.UrlString|number, line: number,
      data: number): void {
    let targetData = this.lineData.get(target);
    if (!targetData) {
      targetData = new Map();
      this.lineData.set(target, targetData);
    }
    let scriptData = targetData.get(scriptIdOrUrl);
    if (!scriptData) {
      scriptData = new Map();
      targetData.set(scriptIdOrUrl, scriptData);
    }
    scriptData.set(line, (scriptData.get(line) || 0) + data);
  }

  scheduleUpdate(): void {
    if (this.updateTimer) {
      return;
    }
    this.updateTimer = window.setTimeout(() => {
      this.updateTimer = null;
      void this.doUpdate();
    }, 0);
  }

  private async doUpdate(): Promise<void> {
    this.locationPool.disposeAll();
    // Map from sources to line->value profile maps.
    const decorationsBySource = new Map<Workspace.UISourceCode.UISourceCode, Map<number, number>>();
    const pending: Promise<void>[] = [];

    for (const [target, scriptToLineMap] of this.lineData) {
      const debuggerModel = target ? target.model(SDK.DebuggerModel.DebuggerModel) : null;
      for (const [scriptIdOrUrl, lineToDataMap] of scriptToLineMap) {
        // debuggerModel is null when the profile is loaded from file.
        // Try to get UISourceCode by the URL in this case.
        const workspace = Workspace.Workspace.WorkspaceImpl.instance();
        if (debuggerModel) {
          const workspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
          for (const lineToData of lineToDataMap) {
            const line = lineToData[0] - 1;
            const data = lineToData[1];
            const rawLocation = typeof scriptIdOrUrl === 'string' ?
                debuggerModel.createRawLocationByURL(scriptIdOrUrl, line, 0) :
                debuggerModel.createRawLocationByScriptId(String(scriptIdOrUrl) as Protocol.Runtime.ScriptId, line, 0);
            if (rawLocation) {
              pending.push(workspaceBinding.rawLocationToUILocation(rawLocation).then((uiLocation): void => {
                if (uiLocation) {
                  let lineMap = decorationsBySource.get(uiLocation.uiSourceCode);
                  if (!lineMap) {
                    lineMap = new Map<number, number>();
                    decorationsBySource.set(uiLocation.uiSourceCode, lineMap);
                  }
                  lineMap.set(uiLocation.lineNumber + 1, data);
                }
              }));
            }
          }
        } else if (typeof scriptIdOrUrl === 'string') {
          const uiSourceCode = workspace.uiSourceCodeForURL(scriptIdOrUrl);
          if (uiSourceCode) {
            decorationsBySource.set(uiSourceCode, lineToDataMap);
          }
        }
      }
      await Promise.all(pending);
      for (const [uiSourceCode, lineMap] of decorationsBySource) {
        uiSourceCode.setDecorationData(this.type, lineMap);
      }
    }
    for (const uiSourceCode of Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodes()) {
      if (!decorationsBySource.has(uiSourceCode)) {
        uiSourceCode.setDecorationData(this.type, undefined);
      }
    }
  }
}

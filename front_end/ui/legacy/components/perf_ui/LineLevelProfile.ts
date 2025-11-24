// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file supports the gutter decorations visible in the Sources panel when a
// performance trace is active, showing either the runtime sample measures or the
// memory sampling (memory is behind the LiveHeapProfile experiment).
//
// When profiles are added, the associated UISourceCodes are given the profile data
// as decorations. The raw profile locations are mapped to original source files in
// this way.
//
// Note, while this is called "LineLevel", it's the profile data is actually granular
// to the column.

import type * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as Bindings from '../../../../models/bindings/bindings.js';
import type * as CPUProfile from '../../../../models/cpu_profile/cpu_profile.js';
import * as Workspace from '../../../../models/workspace/workspace.js';

/** 1-based. line => column => value */
export type LineColumnProfileMap = Map<number, Map<number, number>>;
export type ProfileDataMap = Map<Workspace.UISourceCode.UISourceCode, LineColumnProfileMap>;

let performanceInstance: Performance;

export class Performance {
  private readonly helper: Helper;

  private constructor() {
    this.helper = new Helper(Workspace.UISourceCode.DecoratorType.PERFORMANCE);
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

  initialize(profiles: CPUProfile.CPUProfileDataModel.CPUProfileDataModel[], target: SDK.Target.Target|null): void {
    this.helper.reset();
    for (const profile of profiles) {
      this.appendCPUProfile(profile, target);
    }
    void this.helper.update();
  }

  private appendLegacyCPUProfile(
      profile: CPUProfile.CPUProfileDataModel.CPUProfileDataModel, target: SDK.Target.Target|null): void {
    const nodesToGo: CPUProfile.CPUProfileDataModel.CPUProfileNode[] = [profile.profileHead];
    const sampleDuration = (profile.profileEndTime - profile.profileStartTime) / profile.totalHitCount;
    while (nodesToGo.length) {
      const nodes: CPUProfile.CPUProfileDataModel.CPUProfileNode[] = nodesToGo.pop()?.children ?? [];
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
          // Since no column number is provided by legacy profile, default to 1 (beginning of line).
          this.helper.addLocationData(target, node.url, {line, column: 1}, time);
        }
      }
    }
  }

  private appendCPUProfile(profile: CPUProfile.CPUProfileDataModel.CPUProfileDataModel, target: SDK.Target.Target|null):
      void {
    if (!profile.lines) {
      this.appendLegacyCPUProfile(profile, target);
      return;
    }

    if (!profile.samples || !profile.columns) {
      return;
    }

    for (let i = 1; i < profile.samples.length; ++i) {
      const line = profile.lines[i];
      const column = profile.columns?.[i];
      if (!line || !column) {
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
      this.helper.addLocationData(target, scriptIdOrUrl, {line, column}, time);
    }
  }
}

let memoryInstance: Memory;

// Note: this is used only by LiveHeapProfile (a drawer panel) if the experiment is enabled.
export class Memory {
  private readonly helper: Helper;
  private constructor() {
    this.helper = new Helper(Workspace.UISourceCode.DecoratorType.MEMORY);
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
    void this.helper.update();
  }

  initialize(profilesAndTargets: Array<{
    profile: Protocol.HeapProfiler.SamplingHeapProfile,
    target: SDK.Target.Target,
  }>): void {
    this.helper.reset();
    for (const {profile, target} of profilesAndTargets) {
      this.appendHeapProfile(profile, target);
    }
    void this.helper.update();
  }

  private appendHeapProfile(profile: Protocol.HeapProfiler.SamplingHeapProfile, target: SDK.Target.Target|null): void {
    const helper = this.helper;
    processNode(profile.head);

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
      const column = node.callFrame.columnNumber + 1;
      helper.addLocationData(target, script, {line, column}, node.selfSize);
    }
  }
}

export class Helper {
  private readonly type: Workspace.UISourceCode.DecoratorType;
  private readonly locationPool = new Bindings.LiveLocation.LiveLocationPool();

  /**
   * Given a location in a script (with line and column numbers being 1-based) stores
   * the time spent at that location in a performance profile.
   */
  private locationData =
      new Map<SDK.Target.Target|null, Map<Platform.DevToolsPath.UrlString|number, LineColumnProfileMap>>();
  constructor(type: Workspace.UISourceCode.DecoratorType) {
    this.type = type;
    this.reset();
  }

  reset(): void {
    // The second map uses string keys for script URLs and numbers for scriptId.
    this.locationData = new Map();
  }

  /**
   * Stores the time taken running a given script location (line and column)
   */
  addLocationData(
      target: SDK.Target.Target|null, scriptIdOrUrl: Platform.DevToolsPath.UrlString|number,
      {line, column}: {line: number, column: number}, data: number): void {
    let targetData = this.locationData.get(target);
    if (!targetData) {
      targetData = new Map();
      this.locationData.set(target, targetData);
    }
    let scriptData = targetData.get(scriptIdOrUrl);
    if (!scriptData) {
      scriptData = new Map();
      targetData.set(scriptIdOrUrl, scriptData);
    }
    let lineData = scriptData.get(line);
    if (!lineData) {
      lineData = new Map();
      scriptData.set(line, lineData);
    }
    lineData.set(column, (lineData.get(column) || 0) + data);
  }

  async update(): Promise<void> {
    this.locationPool.disposeAll();
    // Map from sources to line->value profile maps.
    const decorationsBySource: ProfileDataMap = new Map();
    const pending: Array<Promise<void>> = [];
    for (const [target, scriptToLineMap] of this.locationData) {
      const debuggerModel = target ? target.model(SDK.DebuggerModel.DebuggerModel) : null;
      for (const [scriptIdOrUrl, lineToDataMap] of scriptToLineMap) {
        // debuggerModel is null when the profile is loaded from file.
        // Try to get UISourceCode by the URL in this case.
        const workspace = Workspace.Workspace.WorkspaceImpl.instance();
        if (debuggerModel) {
          const workspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
          for (const [lineNumber, lineData] of lineToDataMap) {
            // lineData contains profiling data by column.
            for (const [columnNumber, data] of lineData) {
              const zeroBasedLine = lineNumber - 1;
              const zeroBasedColumn = columnNumber - 1;
              if (target) {
                const rawLocation = typeof scriptIdOrUrl === 'string' ?
                    debuggerModel.createRawLocationByURL(scriptIdOrUrl, zeroBasedLine, zeroBasedColumn || 0) :
                    debuggerModel.createRawLocationByScriptId(
                        String(scriptIdOrUrl) as Protocol.Runtime.ScriptId, zeroBasedLine, zeroBasedColumn || 0);
                if (rawLocation) {
                  pending.push(workspaceBinding.rawLocationToUILocation(rawLocation).then(uiLocation => {
                    if (!uiLocation) {
                      return;
                    }

                    this.addLineColumnData(
                        decorationsBySource, uiLocation.uiSourceCode, uiLocation.lineNumber + 1,
                        (uiLocation.columnNumber ?? 0) + 1, data);

                    // If the above was a source mapped UILocation, then we also need to add it to the generated UILocation.
                    if (uiLocation.uiSourceCode.contentType().isFromSourceMap()) {
                      const script = rawLocation.script();
                      const uiSourceCode = script ? workspaceBinding.uiSourceCodeForScript(script) : null;
                      if (uiSourceCode) {
                        this.addLineColumnData(decorationsBySource, uiSourceCode, lineNumber, columnNumber, data);
                      }
                    }
                  }));
                }
              }
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

  private addLineColumnData(
      decorationsBySource: ProfileDataMap, uiSourceCode: Workspace.UISourceCode.UISourceCode, lineOneIndexed: number,
      columnOneIndexed: number, data: number): void {
    let lineMap = decorationsBySource.get(uiSourceCode);
    if (!lineMap) {
      lineMap = new Map();
      decorationsBySource.set(uiSourceCode, lineMap);
    }

    let columnMap = lineMap.get(lineOneIndexed);
    if (!columnMap) {
      columnMap = new Map();
      lineMap.set(lineOneIndexed, columnMap);
    }

    columnMap.set(columnOneIndexed, (columnMap.get(columnOneIndexed) ?? 0) + data);
  }
}

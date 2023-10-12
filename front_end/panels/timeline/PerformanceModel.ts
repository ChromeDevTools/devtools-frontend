// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as CPUProfile from '../../models/cpu_profile/cpu_profile.js';
import * as SourceMapScopes from '../../models/source_map_scopes/source_map_scopes.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';

import {TimelineUIUtils} from './TimelineUIUtils.js';

const resolveNamesTimeout = 500;

export class PerformanceModel extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private mainTargetInternal: SDK.Target.Target|null;
  private tracingModelInternal: TraceEngine.Legacy.TracingModel|null;
  private filtersInternal: TimelineModel.TimelineModelFilter.TimelineModelFilter[];
  private readonly timelineModelInternal: TimelineModel.TimelineModel.TimelineModelImpl;
  private readonly frameModelInternal: TimelineModel.TimelineFrameModel.TimelineFrameModel;
  private windowInternal: Window;
  private willResolveNames = false;
  private recordStartTimeInternal?: number;
  #activeBreadcrumbWindow?: TraceEngine.Types.Timing.TraceWindow;

  constructor() {
    super();
    this.mainTargetInternal = null;
    this.tracingModelInternal = null;
    this.filtersInternal = [];

    this.timelineModelInternal = new TimelineModel.TimelineModel.TimelineModelImpl();
    this.frameModelInternal = new TimelineModel.TimelineFrameModel.TimelineFrameModel(
        event => TimelineUIUtils.eventStyle(event).category.name);

    this.windowInternal = {left: 0, right: Infinity};

    this.recordStartTimeInternal = undefined;
  }

  setMainTarget(target: SDK.Target.Target): void {
    this.mainTargetInternal = target;
  }

  mainTarget(): SDK.Target.Target|null {
    return this.mainTargetInternal;
  }

  setRecordStartTime(time: number): void {
    this.recordStartTimeInternal = time;
  }

  recordStartTime(): number|undefined {
    return this.recordStartTimeInternal;
  }

  setFilters(filters: TimelineModel.TimelineModelFilter.TimelineModelFilter[]): void {
    this.filtersInternal = filters;
  }

  filters(): TimelineModel.TimelineModelFilter.TimelineModelFilter[] {
    return this.filtersInternal;
  }

  isVisible(event: TraceEngine.Legacy.Event): boolean {
    return this.filtersInternal.every(f => f.accept(event));
  }

  async setTracingModel(model: TraceEngine.Legacy.TracingModel, isFreshRecording = false, options = {
    resolveSourceMaps: true,
    isCpuProfile: false,
  }): Promise<void> {
    this.tracingModelInternal = model;
    this.timelineModelInternal.setEvents(model, isFreshRecording, options.isCpuProfile);
    if (options.resolveSourceMaps) {
      await this.addSourceMapListeners();
    }

    const mainTracks = this.timelineModelInternal.tracks().filter(
        track => track.type === TimelineModel.TimelineModel.TrackType.MainThread && track.forMainFrame &&
            track.events.length);

    const threadData = mainTracks.map(track => {
      const event = track.events[0];
      return {thread: event.thread, time: event.startTime};
    });
    this.frameModelInternal.addTraceEvents(
        this.mainTargetInternal, this.timelineModelInternal.inspectedTargetEvents(), threadData);
  }

  async addSourceMapListeners(): Promise<void> {
    const debuggerModelsToListen = new Set<SDK.DebuggerModel.DebuggerModel>();
    for (const profile of this.timelineModel().cpuProfiles()) {
      for (const node of profile.cpuProfileData.nodes() || []) {
        if (!node) {
          continue;
        }
        const debuggerModelToListen = this.#maybeGetDebuggerModelForNode(node, profile.target);
        if (!debuggerModelToListen) {
          continue;
        }

        debuggerModelsToListen.add(debuggerModelToListen);
      }
    }
    for (const debuggerModel of debuggerModelsToListen) {
      debuggerModel.sourceMapManager().addEventListener(
          SDK.SourceMapManager.Events.SourceMapAttached, this.#onAttachedSourceMap, this);
    }
    await this.#resolveNamesFromCPUProfile();
  }

  // If a node corresponds to a script that has not been parsed or a script
  // that has a source map, we should listen to SourceMapAttached events to
  // attempt a function name resolving.
  #maybeGetDebuggerModelForNode(node: CPUProfile.ProfileTreeModel.ProfileNode, target: SDK.Target.Target|null):
      SDK.DebuggerModel.DebuggerModel|null {
    const debuggerModel = target?.model(SDK.DebuggerModel.DebuggerModel);
    if (!debuggerModel) {
      return null;
    }
    const script = debuggerModel.scriptForId(String(node.callFrame.scriptId));
    const shouldListenToSourceMap = !script || script.sourceMapURL;
    if (shouldListenToSourceMap) {
      return debuggerModel;
    }
    return null;
  }

  async #resolveNamesFromCPUProfile(): Promise<void> {
    for (const profile of this.timelineModel().cpuProfiles()) {
      const target = profile.target;
      if (!target) {
        continue;
      }

      for (const node of profile.cpuProfileData.nodes() || []) {
        const resolvedFunctionName =
            await SourceMapScopes.NamesResolver.resolveProfileFrameFunctionName(node.callFrame, target);
        node.setFunctionName(resolvedFunctionName);
      }
    }
  }

  async #onAttachedSourceMap(): Promise<void> {
    if (!this.willResolveNames) {
      this.willResolveNames = true;
      // Resolving names triggers a repaint of the flame chart. Instead of attempting to resolve
      // names every time a source map is attached, wait for some time once the first source map is
      // attached. This way we allow for other source maps to be parsed before attempting a name
      // resolving using the available source maps. Otherwise the UI is blocked when the number
      // of source maps is particularly large.
      setTimeout(this.resolveNamesAndUpdate.bind(this), resolveNamesTimeout);
    }
  }

  async resolveNamesAndUpdate(): Promise<void> {
    this.willResolveNames = false;
    await this.#resolveNamesFromCPUProfile();
    this.dispatchEventToListeners(Events.NamesResolved);
  }

  tracingModel(): TraceEngine.Legacy.TracingModel {
    if (!this.tracingModelInternal) {
      throw 'call setTracingModel before accessing PerformanceModel';
    }
    return this.tracingModelInternal;
  }

  timelineModel(): TimelineModel.TimelineModel.TimelineModelImpl {
    return this.timelineModelInternal;
  }

  frames(): TimelineModel.TimelineFrameModel.TimelineFrame[] {
    return this.frameModelInternal.getFrames();
  }

  frameModel(): TimelineModel.TimelineFrameModel.TimelineFrameModel {
    return this.frameModelInternal;
  }

  setWindow(window: Window, animate?: boolean, breadcrumb?: TraceEngine.Types.Timing.TraceWindow): void {
    const didWindowOrBreadcrumbChange = this.windowInternal.left !== window.left ||
        this.windowInternal.right !== window.right || (breadcrumb && (this.#activeBreadcrumbWindow !== breadcrumb));
    this.windowInternal = window;
    if (breadcrumb) {
      this.#activeBreadcrumbWindow = breadcrumb;
    }
    if (didWindowOrBreadcrumbChange) {
      this.dispatchEventToListeners(Events.WindowChanged, {window, animate, breadcrumbWindow: breadcrumb});
      TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(
          TraceEngine.Helpers.Timing.traceWindowFromMilliSeconds(
              TraceEngine.Types.Timing.MilliSeconds(window.left),
              TraceEngine.Types.Timing.MilliSeconds(window.right),
              ),
          {shouldAnimate: Boolean(animate)},
      );
      if (breadcrumb) {
        TraceBounds.TraceBounds.BoundsManager.instance().setMiniMapBounds(breadcrumb);
      }
    }
  }

  window(): Window {
    return this.windowInternal;
  }

  minimumRecordTime(): number {
    return this.timelineModelInternal.minimumRecordTime();
  }

  maximumRecordTime(): number {
    return this.timelineModelInternal.maximumRecordTime();
  }

  calculateWindowForMainThreadActivity(): {
    left: TraceEngine.Types.Timing.MilliSeconds,
    right: TraceEngine.Types.Timing.MilliSeconds,
  } {
    const timelineModel = this.timelineModelInternal;
    let tasks: TraceEngine.Legacy.Event[] = [];
    for (const track of timelineModel.tracks()) {
      // Deliberately pick up last main frame's track.
      if (track.type === TimelineModel.TimelineModel.TrackType.MainThread && track.forMainFrame) {
        tasks = track.tasks;
      }
    }
    if (!tasks.length) {
      return {
        left: TraceEngine.Types.Timing.MilliSeconds(timelineModel.minimumRecordTime()),
        right: TraceEngine.Types.Timing.MilliSeconds(timelineModel.maximumRecordTime()),
      };
    }

    /**
     * Calculates regions of low utilization and returns the index of the event
     * that is the first event that should be included.
     **/
    function findLowUtilizationRegion(startIndex: number, stopIndex: number): number {
      const threshold = 0.1;
      let cutIndex = startIndex;
      let cutTime = (tasks[cutIndex].startTime + (tasks[cutIndex].endTime as number)) / 2;
      let usedTime = 0;
      const step = Math.sign(stopIndex - startIndex);
      for (let i = startIndex; i !== stopIndex; i += step) {
        const task = tasks[i];
        const taskTime = (task.startTime + (task.endTime as number)) / 2;
        const interval = Math.abs(cutTime - taskTime);
        if (usedTime < threshold * interval) {
          cutIndex = i;
          cutTime = taskTime;
          usedTime = 0;
        }
        usedTime += (task.duration as number);
      }
      return cutIndex;
    }
    const rightIndex = findLowUtilizationRegion(tasks.length - 1, 0);
    const leftIndex = findLowUtilizationRegion(0, rightIndex);
    let leftTime: number = tasks[leftIndex].startTime;
    let rightTime: number = (tasks[rightIndex].endTime as number);

    const zoomedInSpan = rightTime - leftTime;
    const entireTraceSpan = timelineModel.maximumRecordTime() - timelineModel.minimumRecordTime();

    if (zoomedInSpan < entireTraceSpan * 0.1) {
      // If the area we have chosen to zoom into is less than 10% of the entire
      // span, we bail and show the entire trace. It would not be so useful to
      // the user to zoom in on such a small area; we assume they have
      // purposefully recorded a trace that contains empty periods of time.
      leftTime = timelineModel.minimumRecordTime();
      rightTime = timelineModel.maximumRecordTime();
    } else {
      // Adjust the left time down by 5%, and the right time up by 5%, so that
      // we give the range we want to zoom a bit of breathing space. At the
      // same time, ensure that we do not stray beyond the bounds of the
      // min/max time of the entire trace.
      leftTime = Math.max(leftTime - 0.05 * zoomedInSpan, timelineModel.minimumRecordTime());
      rightTime = Math.min(rightTime + 0.05 * zoomedInSpan, timelineModel.maximumRecordTime());
    }
    return {
      left: TraceEngine.Types.Timing.MilliSeconds(leftTime),
      right: TraceEngine.Types.Timing.MilliSeconds(rightTime),
    };
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  WindowChanged = 'WindowChanged',
  NamesResolved = 'NamesResolved',
}
export interface WindowChangedEvent {
  window: Window;
  animate: boolean|undefined;
  breadcrumbWindow?: TraceEngine.Types.Timing.TraceWindow;
}

export type EventTypes = {
  [Events.WindowChanged]: WindowChangedEvent,
  [Events.NamesResolved]: void,
};

export interface Window {
  left: number;
  right: number;
}

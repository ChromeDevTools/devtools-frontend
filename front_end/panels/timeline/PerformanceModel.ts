// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Bindings from '../../models/bindings/bindings.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';

import {TimelineUIUtils} from './TimelineUIUtils.js';

export class PerformanceModel extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private mainTargetInternal: SDK.Target.Target|null;
  private tracingModelInternal: SDK.TracingModel.TracingModel|null;
  private filtersInternal: TimelineModel.TimelineModelFilter.TimelineModelFilter[];
  private readonly timelineModelInternal: TimelineModel.TimelineModel.TimelineModelImpl;
  private readonly frameModelInternal: TimelineModel.TimelineFrameModel.TimelineFrameModel;
  private filmStripModelInternal: SDK.FilmStripModel.FilmStripModel|null;
  private readonly irModel: TimelineModel.TimelineIRModel.TimelineIRModel;
  private windowInternal: Window;
  private readonly extensionTracingModels: {
    title: string,
    model: SDK.TracingModel.TracingModel,
    timeOffset: number,
  }[];
  private recordStartTimeInternal?: number;

  constructor() {
    super();
    this.mainTargetInternal = null;
    this.tracingModelInternal = null;
    this.filtersInternal = [];

    this.timelineModelInternal = new TimelineModel.TimelineModel.TimelineModelImpl();
    this.frameModelInternal = new TimelineModel.TimelineFrameModel.TimelineFrameModel(
        event => TimelineUIUtils.eventStyle(event).category.name);
    this.filmStripModelInternal = null;
    this.irModel = new TimelineModel.TimelineIRModel.TimelineIRModel();

    this.windowInternal = {left: 0, right: Infinity};

    this.extensionTracingModels = [];
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

  isVisible(event: SDK.TracingModel.Event): boolean {
    return this.filtersInternal.every(f => f.accept(event));
  }

  async setTracingModel(model: SDK.TracingModel.TracingModel): Promise<void> {
    this.tracingModelInternal = model;
    this.timelineModelInternal.setEvents(model);

    let animationEvents: SDK.TracingModel.AsyncEvent[]|null = null;
    for (const track of this.timelineModelInternal.tracks()) {
      if (track.type === TimelineModel.TimelineModel.TrackType.Animation) {
        animationEvents = track.asyncEvents;
      }
    }
    if (animationEvents) {
      this.irModel.populate([], animationEvents || []);
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

    for (const entry of this.extensionTracingModels) {
      entry.model.adjustTime(
          this.tracingModelInternal.minimumRecordTime() + (entry.timeOffset / 1000) -
          (this.recordStartTimeInternal as number));
    }
    this.autoWindowTimes();
  }

  addExtensionEvents(title: string, model: SDK.TracingModel.TracingModel, timeOffset: number): void {
    this.extensionTracingModels.push({model: model, title: title, timeOffset: timeOffset});
    if (!this.tracingModelInternal) {
      return;
    }
    model.adjustTime(
        this.tracingModelInternal.minimumRecordTime() + (timeOffset / 1000) - (this.recordStartTimeInternal as number));
    this.dispatchEventToListeners(Events.ExtensionDataAdded);
  }

  tracingModel(): SDK.TracingModel.TracingModel {
    if (!this.tracingModelInternal) {
      throw 'call setTracingModel before accessing PerformanceModel';
    }
    return this.tracingModelInternal;
  }

  timelineModel(): TimelineModel.TimelineModel.TimelineModelImpl {
    return this.timelineModelInternal;
  }

  filmStripModel(): SDK.FilmStripModel.FilmStripModel {
    if (this.filmStripModelInternal) {
      return this.filmStripModelInternal;
    }
    if (!this.tracingModelInternal) {
      throw 'call setTracingModel before accessing PerformanceModel';
    }
    this.filmStripModelInternal = new SDK.FilmStripModel.FilmStripModel(this.tracingModelInternal);
    return this.filmStripModelInternal;
  }

  frames(): TimelineModel.TimelineFrameModel.TimelineFrame[] {
    return this.frameModelInternal.getFrames();
  }

  frameModel(): TimelineModel.TimelineFrameModel.TimelineFrameModel {
    return this.frameModelInternal;
  }

  interactionRecords(): Common.SegmentedRange.Segment<TimelineModel.TimelineIRModel.Phases>[] {
    return this.irModel.interactionRecords();
  }

  extensionInfo(): {
    title: string,
    model: SDK.TracingModel.TracingModel,
  }[] {
    return this.extensionTracingModels;
  }

  dispose(): void {
    if (this.tracingModelInternal) {
      this.tracingModelInternal.dispose();
    }
    for (const extensionEntry of this.extensionTracingModels) {
      extensionEntry.model.dispose();
    }
  }

  filmStripModelFrame(frame: TimelineModel.TimelineFrameModel.TimelineFrame): SDK.FilmStripModel.Frame|null {
    // For idle frames, look at the state at the beginning of the frame.
    const screenshotTime = frame.idle ? frame.startTime : frame.endTime;
    const filmStripModel = (this.filmStripModelInternal as SDK.FilmStripModel.FilmStripModel);
    const filmStripFrame = filmStripModel.frameByTimestamp(screenshotTime);
    return filmStripFrame && filmStripFrame.timestamp - frame.endTime < 10 ? filmStripFrame : null;
  }

  save(stream: Common.StringOutputStream.OutputStream): Promise<DOMError|null> {
    if (!this.tracingModelInternal) {
      throw 'call setTracingModel before accessing PerformanceModel';
    }
    const backingStorage = (this.tracingModelInternal.backingStorage() as Bindings.TempFile.TempFileBackingStorage);
    return backingStorage.writeToStream(stream);
  }

  setWindow(window: Window, animate?: boolean): void {
    this.windowInternal = window;
    this.dispatchEventToListeners(Events.WindowChanged, {window, animate});
  }

  window(): Window {
    return this.windowInternal;
  }

  private autoWindowTimes(): void {
    const timelineModel = this.timelineModelInternal;
    let tasks: SDK.TracingModel.Event[] = [];
    for (const track of timelineModel.tracks()) {
      // Deliberately pick up last main frame's track.
      if (track.type === TimelineModel.TimelineModel.TrackType.MainThread && track.forMainFrame) {
        tasks = track.tasks;
      }
    }
    if (!tasks.length) {
      this.setWindow({left: timelineModel.minimumRecordTime(), right: timelineModel.maximumRecordTime()});
      return;
    }

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
    const span = rightTime - leftTime;
    const totalSpan = timelineModel.maximumRecordTime() - timelineModel.minimumRecordTime();
    if (span < totalSpan * 0.1) {
      leftTime = timelineModel.minimumRecordTime();
      rightTime = timelineModel.maximumRecordTime();
    } else {
      leftTime = Math.max(leftTime - 0.05 * span, timelineModel.minimumRecordTime());
      rightTime = Math.min(rightTime + 0.05 * span, timelineModel.maximumRecordTime());
    }
    this.setWindow({left: leftTime, right: rightTime});
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  ExtensionDataAdded = 'ExtensionDataAdded',
  WindowChanged = 'WindowChanged',
}

export interface WindowChangedEvent {
  window: Window;
  animate: boolean|undefined;
}

export type EventTypes = {
  [Events.ExtensionDataAdded]: void,
  [Events.WindowChanged]: WindowChangedEvent,
};

export interface Window {
  left: number;
  right: number;
}

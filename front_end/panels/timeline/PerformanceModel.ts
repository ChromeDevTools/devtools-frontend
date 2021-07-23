// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Bindings from '../../models/bindings/bindings.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';

import {TimelineUIUtils} from './TimelineUIUtils.js';

export class PerformanceModel extends Common.ObjectWrapper.ObjectWrapper {
  _mainTarget: SDK.Target.Target|null;
  _tracingModel: SDK.TracingModel.TracingModel|null;
  _filters: TimelineModel.TimelineModelFilter.TimelineModelFilter[];
  _timelineModel: TimelineModel.TimelineModel.TimelineModelImpl;
  _frameModel: TimelineModel.TimelineFrameModel.TimelineFrameModel;
  _filmStripModel: SDK.FilmStripModel.FilmStripModel|null;
  _irModel: TimelineModel.TimelineIRModel.TimelineIRModel;
  _window: Window;
  _extensionTracingModels: {
    title: string,
    model: SDK.TracingModel.TracingModel,
    timeOffset: number,
  }[];
  _recordStartTime?: number;

  constructor() {
    super();
    this._mainTarget = null;
    this._tracingModel = null;
    this._filters = [];

    this._timelineModel = new TimelineModel.TimelineModel.TimelineModelImpl();
    this._frameModel = new TimelineModel.TimelineFrameModel.TimelineFrameModel(
        event => TimelineUIUtils.eventStyle(event).category.name);
    this._filmStripModel = null;
    this._irModel = new TimelineModel.TimelineIRModel.TimelineIRModel();

    this._window = {left: 0, right: Infinity};

    this._extensionTracingModels = [];
    this._recordStartTime = undefined;
  }

  setMainTarget(target: SDK.Target.Target): void {
    this._mainTarget = target;
  }

  mainTarget(): SDK.Target.Target|null {
    return this._mainTarget;
  }

  setRecordStartTime(time: number): void {
    this._recordStartTime = time;
  }

  recordStartTime(): number|undefined {
    return this._recordStartTime;
  }

  setFilters(filters: TimelineModel.TimelineModelFilter.TimelineModelFilter[]): void {
    this._filters = filters;
  }

  filters(): TimelineModel.TimelineModelFilter.TimelineModelFilter[] {
    return this._filters;
  }

  isVisible(event: SDK.TracingModel.Event): boolean {
    return this._filters.every(f => f.accept(event));
  }

  setTracingModel(model: SDK.TracingModel.TracingModel): void {
    this._tracingModel = model;
    this._timelineModel.setEvents(model);

    let inputEvents: SDK.TracingModel.AsyncEvent[]|null = null;
    let animationEvents: SDK.TracingModel.AsyncEvent[]|null = null;
    for (const track of this._timelineModel.tracks()) {
      if (track.type === TimelineModel.TimelineModel.TrackType.Input) {
        inputEvents = track.asyncEvents;
      }
      if (track.type === TimelineModel.TimelineModel.TrackType.Animation) {
        animationEvents = track.asyncEvents;
      }
    }
    if (inputEvents || animationEvents) {
      this._irModel.populate(inputEvents || [], animationEvents || []);
    }

    const mainTracks = this._timelineModel.tracks().filter(
        track => track.type === TimelineModel.TimelineModel.TrackType.MainThread && track.forMainFrame &&
            track.events.length);
    const threadData = mainTracks.map(track => {
      const event = track.events[0];
      return {thread: event.thread, time: event.startTime};
    });
    this._frameModel.addTraceEvents(this._mainTarget, this._timelineModel.inspectedTargetEvents(), threadData);

    for (const entry of this._extensionTracingModels) {
      entry.model.adjustTime(
          this._tracingModel.minimumRecordTime() + (entry.timeOffset / 1000) - (this._recordStartTime as number));
    }
    this._autoWindowTimes();
  }

  addExtensionEvents(title: string, model: SDK.TracingModel.TracingModel, timeOffset: number): void {
    this._extensionTracingModels.push({model: model, title: title, timeOffset: timeOffset});
    if (!this._tracingModel) {
      return;
    }
    model.adjustTime(this._tracingModel.minimumRecordTime() + (timeOffset / 1000) - (this._recordStartTime as number));
    this.dispatchEventToListeners(Events.ExtensionDataAdded);
  }

  tracingModel(): SDK.TracingModel.TracingModel {
    if (!this._tracingModel) {
      throw 'call setTracingModel before accessing PerformanceModel';
    }
    return this._tracingModel;
  }

  timelineModel(): TimelineModel.TimelineModel.TimelineModelImpl {
    return this._timelineModel;
  }

  filmStripModel(): SDK.FilmStripModel.FilmStripModel {
    if (this._filmStripModel) {
      return this._filmStripModel;
    }
    if (!this._tracingModel) {
      throw 'call setTracingModel before accessing PerformanceModel';
    }
    this._filmStripModel = new SDK.FilmStripModel.FilmStripModel(this._tracingModel);
    return this._filmStripModel;
  }

  frames(): TimelineModel.TimelineFrameModel.TimelineFrame[] {
    return this._frameModel.getFrames();
  }

  frameModel(): TimelineModel.TimelineFrameModel.TimelineFrameModel {
    return this._frameModel;
  }

  interactionRecords(): Common.SegmentedRange.Segment<TimelineModel.TimelineIRModel.Phases>[] {
    return this._irModel.interactionRecords();
  }

  extensionInfo(): {
    title: string,
    model: SDK.TracingModel.TracingModel,
  }[] {
    return this._extensionTracingModels;
  }

  dispose(): void {
    if (this._tracingModel) {
      this._tracingModel.dispose();
    }
    for (const extensionEntry of this._extensionTracingModels) {
      extensionEntry.model.dispose();
    }
  }

  filmStripModelFrame(frame: TimelineModel.TimelineFrameModel.TimelineFrame): SDK.FilmStripModel.Frame|null {
    // For idle frames, look at the state at the beginning of the frame.
    const screenshotTime = frame.idle ? frame.startTime : frame.endTime;
    const filmStripModel = (this._filmStripModel as SDK.FilmStripModel.FilmStripModel);
    const filmStripFrame = filmStripModel.frameByTimestamp(screenshotTime);
    return filmStripFrame && filmStripFrame.timestamp - frame.endTime < 10 ? filmStripFrame : null;
  }

  save(stream: Common.StringOutputStream.OutputStream): Promise<DOMError|null> {
    if (!this._tracingModel) {
      throw 'call setTracingModel before accessing PerformanceModel';
    }
    const backingStorage = (this._tracingModel.backingStorage() as Bindings.TempFile.TempFileBackingStorage);
    return backingStorage.writeToStream(stream);
  }

  setWindow(window: Window, animate?: boolean): void {
    this._window = window;
    this.dispatchEventToListeners(Events.WindowChanged, {window, animate});
  }

  window(): Window {
    return this._window;
  }

  _autoWindowTimes(): void {
    const timelineModel = this._timelineModel;
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

export interface Window {
  left: number;
  right: number;
}

/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as TraceEngine from '../trace/trace.js';

export class TimelineModelImpl {
  private inspectedTargetEventsInternal!: TraceEngine.Legacy.Event[];
  private sessionId!: string|null;
  private mainFrameNodeId!: number|null;
  private pageFrames!: Map<Protocol.Page.FrameId, PageFrame>;
  private workerIdByThread!: WeakMap<TraceEngine.Legacy.Thread, string>;
  private requestsFromBrowser!: Map<string, TraceEngine.Legacy.Event>;
  private mainFrame!: PageFrame;
  private minimumRecordTimeInternal: number;
  private lastScheduleStyleRecalculation!: {
    [x: string]: TraceEngine.Types.TraceEvents.TraceEventData,
  };
  private paintImageEventByPixelRefId!: {
    [x: string]: TraceEngine.Legacy.Event,
  };
  private lastPaintForLayer!: {
    [x: string]: TraceEngine.Legacy.Event,
  };
  private currentScriptEvent!: TraceEngine.Legacy.Event|null;
  private eventStack!: TraceEngine.Legacy.Event[];
  private browserFrameTracking!: boolean;
  private persistentIds!: boolean;
  private legacyCurrentPage!: any;
  private currentTaskLayoutAndRecalcEvents: TraceEngine.Legacy.Event[];
  private tracingModelInternal: TraceEngine.Legacy.TracingModel|null;
  private lastRecalculateStylesEvent: TraceEngine.Legacy.Event|null;

  constructor() {
    this.minimumRecordTimeInternal = 0;
    this.reset();
    this.resetProcessingState();

    this.currentTaskLayoutAndRecalcEvents = [];
    this.tracingModelInternal = null;
    this.lastRecalculateStylesEvent = null;
  }

  /**
   * Iterates events in a tree hierarchically, from top to bottom,
   * calling back on every event's start and end in the order
   * dictated by the corresponding timestamp.
   *
   * Events are assumed to be in ascendent order by timestamp.
   *
   * For example, given this tree, the following callbacks
   * are expected to be made in the following order
   * |---------------A---------------|
   *  |------B------||-------D------|
   *    |---C---|
   *
   * 1. Start A
   * 3. Start B
   * 4. Start C
   * 5. End C
   * 6. End B
   * 7. Start D
   * 8. End D
   * 9. End A
   *
   * By default, async events are filtered. This behaviour can be
   * overriden making use of the filterAsyncEvents parameter.
   */
  static forEachEvent(
      events: TraceEngine.Legacy.CompatibleTraceEvent[],
      onStartEvent: (arg0: TraceEngine.Legacy.CompatibleTraceEvent) => void,
      onEndEvent: (arg0: TraceEngine.Legacy.CompatibleTraceEvent) => void,
      onInstantEvent?:
          ((arg0: TraceEngine.Legacy.CompatibleTraceEvent, arg1: TraceEngine.Legacy.CompatibleTraceEvent|null) => void),
      startTime?: number, endTime?: number, filter?: ((arg0: TraceEngine.Legacy.CompatibleTraceEvent) => boolean),
      ignoreAsyncEvents = true): void {
    startTime = startTime || 0;
    endTime = endTime || Infinity;
    const stack: TraceEngine.Legacy.CompatibleTraceEvent[] = [];
    const startEvent = TimelineModelImpl.topLevelEventEndingAfter(events, startTime);
    for (let i = startEvent; i < events.length; ++i) {
      const e = events[i];
      const {endTime: eventEndTime, startTime: eventStartTime, duration: eventDuration} =
          TraceEngine.Legacy.timesForEventInMilliseconds(e);
      const eventPhase = TraceEngine.Legacy.phaseForEvent(e);
      if ((eventEndTime || eventStartTime) < startTime) {
        continue;
      }
      if (eventStartTime >= endTime) {
        break;
      }
      const canIgnoreAsyncEvent = ignoreAsyncEvents && TraceEngine.Types.TraceEvents.isAsyncPhase(eventPhase);
      if (canIgnoreAsyncEvent || TraceEngine.Types.TraceEvents.isFlowPhase(eventPhase)) {
        continue;
      }
      let last = stack[stack.length - 1];
      let lastEventEndTime = last && TraceEngine.Legacy.timesForEventInMilliseconds(last).endTime;
      while (last && lastEventEndTime !== undefined && lastEventEndTime <= eventStartTime) {
        stack.pop();
        onEndEvent(last);
        last = stack[stack.length - 1];
        lastEventEndTime = last && TraceEngine.Legacy.timesForEventInMilliseconds(last).endTime;
      }

      if (filter && !filter(e)) {
        continue;
      }
      if (eventDuration) {
        onStartEvent(e);
        stack.push(e);
      } else {
        onInstantEvent && onInstantEvent(e, stack[stack.length - 1] || null);
      }
    }
    while (stack.length) {
      const last = stack.pop();
      if (last) {
        onEndEvent(last);
      }
    }
  }

  private static topLevelEventEndingAfter(events: TraceEngine.Legacy.CompatibleTraceEvent[], time: number): number {
    let index =
        Platform.ArrayUtilities.upperBound(
            events, time, (time, event) => time - TraceEngine.Legacy.timesForEventInMilliseconds(event).startTime) -
        1;
    while (index > 0 && !TraceEngine.Legacy.TracingModel.isTopLevelEvent(events[index])) {
      index--;
    }
    return Math.max(index, 0);
  }

  static eventFrameId(event: TraceEngine.Legacy.Event): Protocol.Page.FrameId|null {
    const data = event.args['data'] || event.args['beginData'];
    return data && data['frame'] || null;
  }

  setEvents(tracingModel: TraceEngine.Legacy.TracingModel): void {
    this.reset();
    this.resetProcessingState();
    this.tracingModelInternal = tracingModel;

    this.minimumRecordTimeInternal = tracingModel.minimumRecordTime();

    this.processSyncBrowserEvents(tracingModel);
    if (this.browserFrameTracking) {
      this.processThreadsForBrowserFrames(tracingModel);
    } else {
      // The next line is for loading legacy traces recorded before M67.
      // TODO(alph): Drop the support at some point.
      const metadataEvents = this.processMetadataEvents(tracingModel);
      if (metadataEvents) {
        this.processMetadataAndThreads(metadataEvents);
      } else {
        this.processGenericTrace(tracingModel);
      }
    }
    this.inspectedTargetEventsInternal.sort(TraceEngine.Legacy.Event.compareStartTime);
    this.resetProcessingState();
  }

  private processGenericTrace(tracingModel: TraceEngine.Legacy.TracingModel): void {
    let browserMainThread = TraceEngine.Legacy.TracingModel.browserMainThread(tracingModel);
    if (!browserMainThread && tracingModel.sortedProcesses().length) {
      browserMainThread = tracingModel.sortedProcesses()[0].sortedThreads()[0];
    }
    for (const process of tracingModel.sortedProcesses()) {
      for (const thread of process.sortedThreads()) {
        this.processThreadEvents(thread);
      }
    }
  }

  private processMetadataAndThreads(metadataEvents: MetadataEvents): void {
    let startTime = 0;
    for (let i = 0, length = metadataEvents.page.length; i < length; i++) {
      const metaEvent = metadataEvents.page[i];
      const process = metaEvent.thread.process();
      const endTime = i + 1 < length ? metadataEvents.page[i + 1].startTime : Infinity;
      if (startTime === endTime) {
        continue;
      }
      this.legacyCurrentPage = metaEvent.args['data'] && metaEvent.args['data']['page'];
      for (const thread of process.sortedThreads()) {
        if (thread.name() === TimelineModelImpl.WorkerThreadName ||
            thread.name() === TimelineModelImpl.WorkerThreadNameLegacy) {
          const workerMetaEvent = metadataEvents.workers.find(e => {
            if (e.args['data']['workerThreadId'] !== thread.id()) {
              return false;
            }
            // This is to support old traces.
            if (e.args['data']['sessionId'] === this.sessionId) {
              return true;
            }
            const frameId = TimelineModelImpl.eventFrameId(e);
            return frameId ? Boolean(this.pageFrames.get(frameId)) : false;
          });
          if (!workerMetaEvent) {
            continue;
          }
          const workerId = workerMetaEvent.args['data']['workerId'];
          if (workerId) {
            this.workerIdByThread.set(thread, workerId);
          }
        }
        this.processThreadEvents(thread);
      }
      startTime = endTime;
    }
  }

  private processThreadsForBrowserFrames(tracingModel: TraceEngine.Legacy.TracingModel): void {
    const processDataByPid = new Map<number, {
      from: number,
      to: number,
      main: boolean,
      url: Platform.DevToolsPath.UrlString,
    }[]>();
    for (const frame of this.pageFrames.values()) {
      for (let i = 0; i < frame.processes.length; i++) {
        const pid = frame.processes[i].processId;
        let data = processDataByPid.get(pid);
        if (!data) {
          data = [];
          processDataByPid.set(pid, data);
        }
        const to = i === frame.processes.length - 1 ? (frame.deletedTime || Infinity) : frame.processes[i + 1].time;
        data.push({
          from: frame.processes[i].time,
          to: to,
          main: !frame.parent,
          url: frame.processes[i].url,
        });
      }
    }
    const allMetadataEvents = tracingModel.devToolsMetadataEvents();
    for (const process of tracingModel.sortedProcesses()) {
      const processData = processDataByPid.get(process.id());
      if (!processData) {
        continue;
      }
      // Sort ascending by range starts, followed by range ends
      processData.sort((a, b) => a.from - b.from || a.to - b.to);

      for (const thread of process.sortedThreads()) {
        if (thread.name() === TimelineModelImpl.RendererMainThreadName) {
          this.processThreadEvents(thread);
        } else if (
            thread.name() === TimelineModelImpl.WorkerThreadName ||
            thread.name() === TimelineModelImpl.WorkerThreadNameLegacy) {
          const workerMetaEvent = allMetadataEvents.find(e => {
            if (e.name !== TimelineModelImpl.DevToolsMetadataEvent.TracingSessionIdForWorker) {
              return false;
            }
            if (e.thread.process() !== process) {
              return false;
            }
            if (e.args['data']['workerThreadId'] !== thread.id()) {
              return false;
            }
            const frameId = TimelineModelImpl.eventFrameId(e);
            return frameId ? Boolean(this.pageFrames.get(frameId)) : false;
          });
          if (!workerMetaEvent) {
            continue;
          }
          this.workerIdByThread.set(thread, workerMetaEvent.args['data']['workerId'] || '');
          this.processThreadEvents(thread);
        } else {
          this.processThreadEvents(thread);
        }
      }
    }
  }

  private processMetadataEvents(tracingModel: TraceEngine.Legacy.TracingModel): MetadataEvents|null {
    const metadataEvents = tracingModel.devToolsMetadataEvents();

    const pageDevToolsMetadataEvents = [];
    const workersDevToolsMetadataEvents = [];
    for (const event of metadataEvents) {
      if (event.name === TimelineModelImpl.DevToolsMetadataEvent.TracingStartedInPage) {
        pageDevToolsMetadataEvents.push(event);
        if (event.args['data'] && event.args['data']['persistentIds']) {
          this.persistentIds = true;
        }
        const frames = ((event.args['data'] && event.args['data']['frames']) || [] as PageFrame[]);
        frames.forEach((payload: PageFrame) => this.addPageFrame(event, payload));
        this.mainFrame = this.rootFrames()[0];
      } else if (event.name === TimelineModelImpl.DevToolsMetadataEvent.TracingSessionIdForWorker) {
        workersDevToolsMetadataEvents.push(event);
      } else if (event.name === TimelineModelImpl.DevToolsMetadataEvent.TracingStartedInBrowser) {
        console.assert(!this.mainFrameNodeId, 'Multiple sessions in trace');
        this.mainFrameNodeId = event.args['frameTreeNodeId'];
      }
    }
    if (!pageDevToolsMetadataEvents.length) {
      return null;
    }

    const sessionId =
        pageDevToolsMetadataEvents[0].args['sessionId'] || pageDevToolsMetadataEvents[0].args['data']['sessionId'];
    this.sessionId = sessionId;

    const mismatchingIds = new Set<any>();
    function checkSessionId(event: TraceEngine.Legacy.Event): boolean {
      let args = event.args;
      // FIXME: put sessionId into args["data"] for TracingStartedInPage event.
      if (args['data']) {
        args = args['data'];
      }
      const id = args['sessionId'];
      if (id === sessionId) {
        return true;
      }
      mismatchingIds.add(id);
      return false;
    }
    const result = {
      page: pageDevToolsMetadataEvents.filter(checkSessionId).sort(TraceEngine.Legacy.Event.compareStartTime),
      workers: workersDevToolsMetadataEvents.sort(TraceEngine.Legacy.Event.compareStartTime),
    };
    if (mismatchingIds.size) {
      Common.Console.Console.instance().error(
          'Timeline recording was started in more than one page simultaneously. Session id mismatch: ' +
          this.sessionId + ' and ' + [...mismatchingIds] + '.');
    }
    return result;
  }

  private processSyncBrowserEvents(tracingModel: TraceEngine.Legacy.TracingModel): void {
    const browserMain = TraceEngine.Legacy.TracingModel.browserMainThread(tracingModel);
    if (browserMain) {
      browserMain.events().forEach(this.processBrowserEvent, this);
    }
  }

  private resetProcessingState(): void {
    this.lastScheduleStyleRecalculation = {};
    this.paintImageEventByPixelRefId = {};
    this.lastPaintForLayer = {};
    this.currentScriptEvent = null;
    this.eventStack = [];
    this.browserFrameTracking = false;
    this.persistentIds = false;
    this.legacyCurrentPage = null;
  }

  private processThreadEvents(thread: TraceEngine.Legacy.Thread): void {
    const events = thread.events();
    this.eventStack = [];
    const eventStack = this.eventStack;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      let last: TraceEngine.Legacy.Event = eventStack[eventStack.length - 1];
      while (last && last.endTime !== undefined && last.endTime <= event.startTime) {
        eventStack.pop();
        last = eventStack[eventStack.length - 1];
      }
      if (!this.processEvent(event)) {
        continue;
      }
      if (!TraceEngine.Types.TraceEvents.isAsyncPhase(event.phase) && event.duration) {
        if (eventStack.length) {
          const parent = eventStack[eventStack.length - 1];
          if (parent) {
            parent.selfTime -= event.duration;
            if (parent.selfTime < 0) {
              parent.selfTime = 0;
            }
          }
        }
        event.selfTime = event.duration;
        eventStack.push(event);
      }

      this.inspectedTargetEventsInternal.push(event);
    }
  }

  private processEvent(event: TraceEngine.Legacy.Event): boolean {
    const eventStack = this.eventStack;

    if (!eventStack.length) {
      this.currentTaskLayoutAndRecalcEvents = [];
    }

    if (this.currentScriptEvent) {
      if (this.currentScriptEvent.endTime !== undefined && event.startTime > this.currentScriptEvent.endTime) {
        this.currentScriptEvent = null;
      }
    }

    const eventData = event.args['data'] || event.args['beginData'] || {};
    const timelineData = EventOnTimelineData.forEvent(event);
    let pageFrameId = TimelineModelImpl.eventFrameId(event);
    const last = eventStack[eventStack.length - 1];
    if (!pageFrameId && last) {
      pageFrameId = EventOnTimelineData.forEvent(last).frameId;
    }
    timelineData.frameId = pageFrameId || (this.mainFrame && this.mainFrame.frameId) || '';

    switch (event.name) {
      case RecordType.ResourceSendRequest:
      case RecordType.WebSocketCreate: {
        const lastEvent = eventStack[eventStack.length - 1];
        if (!(lastEvent instanceof TraceEngine.Legacy.PayloadEvent)) {
          break;
        }
        timelineData.url = eventData['url'];
        break;
      }

      case RecordType.ScheduleStyleRecalculation: {
        if (!(event instanceof TraceEngine.Legacy.PayloadEvent)) {
          break;
        }
        this.lastScheduleStyleRecalculation[eventData['frame']] = event.rawPayload();
        break;
      }

      case RecordType.UpdateLayoutTree:
      case RecordType.RecalculateStyles: {
        if (this.currentScriptEvent) {
          this.currentTaskLayoutAndRecalcEvents.push(event);
        }
        break;
      }

      case RecordType.Layout: {
        const frameId = event.args?.beginData?.frame;
        if (!frameId) {
          break;
        }
        if (this.currentScriptEvent) {
          this.currentTaskLayoutAndRecalcEvents.push(event);
        }
        break;
      }

      // @ts-ignore fallthrough intended.
      case RecordType.FunctionCall: {
        // Compatibility with old format.
        if (typeof eventData['scriptName'] === 'string') {
          eventData['url'] = eventData['scriptName'];
        }
        if (typeof eventData['scriptLine'] === 'number') {
          eventData['lineNumber'] = eventData['scriptLine'];
        }
      }

      case RecordType.EvaluateScript:
      case RecordType.CompileScript:
      // @ts-ignore fallthrough intended.
      case RecordType.CacheScript: {
        if (typeof eventData['lineNumber'] === 'number') {
          --eventData['lineNumber'];
        }
        if (typeof eventData['columnNumber'] === 'number') {
          --eventData['columnNumber'];
        }
      }

      case RecordType.RunMicrotasks: {
        // Microtasks technically are not necessarily scripts, but for purpose of
        // forced sync style recalc or layout detection they are.
        if (!this.currentScriptEvent) {
          this.currentScriptEvent = event;
        }
        break;
      }

      case RecordType.SetLayerTreeId: {
        // This is to support old traces.
        if (this.sessionId && eventData['sessionId'] && this.sessionId === eventData['sessionId']) {
          break;
        }

        // We currently only show layer tree for the main frame.
        const frameId = TimelineModelImpl.eventFrameId(event);
        const pageFrame = frameId ? this.pageFrames.get(frameId) : null;
        if (!pageFrame || pageFrame.parent) {
          return false;
        }
        break;
      }

      case RecordType.Paint: {
        // Only keep layer paint events, skip paints for subframes that get painted to the same layer as parent.
        if (!eventData['layerId']) {
          break;
        }
        const layerId = eventData['layerId'];
        this.lastPaintForLayer[layerId] = event;
        break;
      }

      case RecordType.PaintImage: {
        timelineData.url = eventData['url'];
        break;
      }

      case RecordType.DecodeImage:
      case RecordType.ResizeImage: {
        let paintImageEvent = this.findAncestorEvent(RecordType.PaintImage);
        if (!paintImageEvent) {
          const decodeLazyPixelRefEvent = this.findAncestorEvent(RecordType.DecodeLazyPixelRef);
          paintImageEvent =
              decodeLazyPixelRefEvent && this.paintImageEventByPixelRefId[decodeLazyPixelRefEvent.args['LazyPixelRef']];
        }
        if (!paintImageEvent) {
          break;
        }
        const paintImageData = EventOnTimelineData.forEvent(paintImageEvent);
        timelineData.url = paintImageData.url;
        break;
      }

      case RecordType.DrawLazyPixelRef: {
        const paintImageEvent = this.findAncestorEvent(RecordType.PaintImage);
        if (!paintImageEvent) {
          break;
        }
        this.paintImageEventByPixelRefId[event.args['LazyPixelRef']] = paintImageEvent;
        const paintImageData = EventOnTimelineData.forEvent(paintImageEvent);
        timelineData.url = paintImageData.url;
        break;
      }

      case RecordType.FrameStartedLoading: {
        if (timelineData.frameId !== event.args['frame']) {
          return false;
        }
        break;
      }

      case RecordType.MarkDOMContent:
      case RecordType.MarkLoad: {
        const frameId = TimelineModelImpl.eventFrameId(event);
        if (!frameId || !this.pageFrames.has(frameId)) {
          return false;
        }
        break;
      }

      case RecordType.CommitLoad: {
        if (this.browserFrameTracking) {
          break;
        }
        const frameId = TimelineModelImpl.eventFrameId(event);
        const isOutermostMainFrame = Boolean(eventData['isOutermostMainFrame'] ?? eventData['isMainFrame']);
        const pageFrame = frameId ? this.pageFrames.get(frameId) : null;
        if (pageFrame) {
          pageFrame.update(event.startTime, eventData);
        } else {
          // We should only have one main frame which has persistent id,
          // unless it's an old trace without 'persistentIds' flag.
          if (!this.persistentIds) {
            if (eventData['page'] && eventData['page'] !== this.legacyCurrentPage) {
              return false;
            }
          } else if (isOutermostMainFrame) {
            return false;
          } else if (!this.addPageFrame(event, eventData)) {
            return false;
          }
        }
        if (isOutermostMainFrame && frameId) {
          const frame = this.pageFrames.get(frameId);
          if (frame) {
            this.mainFrame = frame;
          }
        }
        break;
      }

      case RecordType.SelectorStats: {
        this.lastRecalculateStylesEvent?.addArgs(event.args);
        break;
      }
    }
    return true;
  }

  private processBrowserEvent(event: TraceEngine.Legacy.Event): void {
    if (event.name === RecordType.ResourceWillSendRequest) {
      const requestId = event.args?.data?.requestId;
      if (typeof requestId === 'string') {
        this.requestsFromBrowser.set(requestId, event);
      }
      return;
    }

    if (event.hasCategory(TraceEngine.Legacy.DevToolsMetadataEventCategory) && event.args['data']) {
      const data = event.args['data'];
      if (event.name === TimelineModelImpl.DevToolsMetadataEvent.TracingStartedInBrowser) {
        if (!data['persistentIds']) {
          return;
        }
        this.browserFrameTracking = true;
        this.mainFrameNodeId = data['frameTreeNodeId'];
        const frames: any[] = data['frames'] || [];
        frames.forEach(payload => {
          const parent = payload['parent'] && this.pageFrames.get(payload['parent']);
          if (payload['parent'] && !parent) {
            return;
          }
          let frame = this.pageFrames.get(payload['frame']);
          if (!frame) {
            frame = new PageFrame(payload);
            this.pageFrames.set(frame.frameId, frame);
            if (parent) {
              parent.addChild(frame);
            } else {
              this.mainFrame = frame;
            }
          }
          // TODO(dgozman): this should use event.startTime, but due to races between tracing start
          // in different processes we cannot do this yet.
          frame.update(this.minimumRecordTimeInternal, payload);
        });
        return;
      }
      if (event.name === TimelineModelImpl.DevToolsMetadataEvent.FrameCommittedInBrowser && this.browserFrameTracking) {
        let frame = this.pageFrames.get(data['frame']);
        if (!frame) {
          const parent = data['parent'] && this.pageFrames.get(data['parent']);
          frame = new PageFrame(data);
          this.pageFrames.set(frame.frameId, frame);
          if (parent) {
            parent.addChild(frame);
          }
        }
        frame.update(event.startTime, data);
        return;
      }
      if (event.name === TimelineModelImpl.DevToolsMetadataEvent.ProcessReadyInBrowser && this.browserFrameTracking) {
        const frame = this.pageFrames.get(data['frame']);
        if (frame) {
          frame.processReady(data['processPseudoId'], data['processId']);
        }
        return;
      }
      if (event.name === TimelineModelImpl.DevToolsMetadataEvent.FrameDeletedInBrowser && this.browserFrameTracking) {
        const frame = this.pageFrames.get(data['frame']);
        if (frame) {
          frame.deletedTime = event.startTime;
        }
        return;
      }
    }
  }

  private findAncestorEvent(name: string): TraceEngine.Legacy.Event|null {
    for (let i = this.eventStack.length - 1; i >= 0; --i) {
      const event = this.eventStack[i];
      if (event.name === name) {
        return event;
      }
    }
    return null;
  }

  private addPageFrame(event: TraceEngine.Legacy.Event, payload: any): boolean {
    const parent = payload['parent'] && this.pageFrames.get(payload['parent']);
    if (payload['parent'] && !parent) {
      return false;
    }
    const pageFrame = new PageFrame(payload);
    this.pageFrames.set(pageFrame.frameId, pageFrame);
    pageFrame.update(event.startTime, payload);
    if (parent) {
      parent.addChild(pageFrame);
    }
    return true;
  }

  private reset(): void {
    this.inspectedTargetEventsInternal = [];
    this.sessionId = null;
    this.mainFrameNodeId = null;
    this.workerIdByThread = new WeakMap();
    this.pageFrames = new Map();
    this.requestsFromBrowser = new Map();

    this.minimumRecordTimeInternal = 0;
  }

  tracingModel(): TraceEngine.Legacy.TracingModel|null {
    return this.tracingModelInternal;
  }

  inspectedTargetEvents(): TraceEngine.Legacy.Event[] {
    return this.inspectedTargetEventsInternal;
  }

  rootFrames(): PageFrame[] {
    return Array.from(this.pageFrames.values()).filter(frame => !frame.parent);
  }

  pageURL(): Platform.DevToolsPath.UrlString {
    return this.mainFrame && this.mainFrame.url || Platform.DevToolsPath.EmptyUrlString;
  }

  pageFrameById(frameId: Protocol.Page.FrameId): PageFrame|null {
    return frameId ? this.pageFrames.get(frameId) || null : null;
  }

  static findRecalculateStyleEvents(
      events: TraceEngine.Types.TraceEvents.TraceEventData[], startTime: number = 0,
      endTime: number = Infinity): TraceEngine.Legacy.Event[] {
    const stack: TraceEngine.Legacy.Event[] = [];
    const startEvent = TimelineModelImpl.topLevelEventEndingAfter(events, startTime);
    const startTimeInMicroSec =
        TraceEngine.Helpers.Timing.millisecondsToMicroseconds(TraceEngine.Types.Timing.MilliSeconds(startTime));
    const endTimeInMicroSec =
        TraceEngine.Helpers.Timing.millisecondsToMicroseconds(TraceEngine.Types.Timing.MilliSeconds(endTime));
    for (let i = startEvent; i < events.length; ++i) {
      const e = events[i] as unknown as TraceEngine.Types.TraceEvents.TraceEventComplete;
      if (e.name !== TraceEngine.Types.TraceEvents.KnownEventName.RecalculateStyles &&
          e.name !== TraceEngine.Types.TraceEvents.KnownEventName.UpdateLayoutTree) {
        continue;
      }
      if (!e.dur || e.ts + e.dur < startTimeInMicroSec) {
        continue;
      }
      if (e.ts >= endTimeInMicroSec) {
        break;
      }
      stack.push(e as unknown as TraceEngine.Legacy.Event);
    }
    return stack;
  }
}

export enum RecordType {
  Task = 'RunTask',
  Program = 'Program',
  EventDispatch = 'EventDispatch',

  GPUTask = 'GPUTask',

  Animation = 'Animation',
  RequestMainThreadFrame = 'RequestMainThreadFrame',
  BeginFrame = 'BeginFrame',
  NeedsBeginFrameChanged = 'NeedsBeginFrameChanged',
  BeginMainThreadFrame = 'BeginMainThreadFrame',
  ActivateLayerTree = 'ActivateLayerTree',
  DrawFrame = 'DrawFrame',
  DroppedFrame = 'DroppedFrame',
  HitTest = 'HitTest',
  ScheduleStyleRecalculation = 'ScheduleStyleRecalculation',
  RecalculateStyles = 'RecalculateStyles',
  UpdateLayoutTree = 'UpdateLayoutTree',
  InvalidateLayout = 'InvalidateLayout',
  Layerize = 'Layerize',
  Layout = 'Layout',
  LayoutShift = 'LayoutShift',
  UpdateLayer = 'UpdateLayer',
  UpdateLayerTree = 'UpdateLayerTree',
  PaintSetup = 'PaintSetup',
  Paint = 'Paint',
  PaintImage = 'PaintImage',
  PrePaint = 'PrePaint',
  Rasterize = 'Rasterize',
  RasterTask = 'RasterTask',
  ScrollLayer = 'ScrollLayer',
  Commit = 'Commit',
  CompositeLayers = 'CompositeLayers',
  ComputeIntersections = 'IntersectionObserverController::computeIntersections',
  InteractiveTime = 'InteractiveTime',

  ParseHTML = 'ParseHTML',
  ParseAuthorStyleSheet = 'ParseAuthorStyleSheet',

  TimerInstall = 'TimerInstall',
  TimerRemove = 'TimerRemove',
  TimerFire = 'TimerFire',

  XHRReadyStateChange = 'XHRReadyStateChange',
  XHRLoad = 'XHRLoad',
  CompileScript = 'v8.compile',
  CompileCode = 'V8.CompileCode',
  OptimizeCode = 'V8.OptimizeCode',
  EvaluateScript = 'EvaluateScript',
  CacheScript = 'v8.produceCache',
  CompileModule = 'v8.compileModule',
  EvaluateModule = 'v8.evaluateModule',
  CacheModule = 'v8.produceModuleCache',
  WasmStreamFromResponseCallback = 'v8.wasm.streamFromResponseCallback',
  WasmCompiledModule = 'v8.wasm.compiledModule',
  WasmCachedModule = 'v8.wasm.cachedModule',
  WasmModuleCacheHit = 'v8.wasm.moduleCacheHit',
  WasmModuleCacheInvalid = 'v8.wasm.moduleCacheInvalid',

  FrameStartedLoading = 'FrameStartedLoading',
  CommitLoad = 'CommitLoad',
  MarkLoad = 'MarkLoad',
  MarkDOMContent = 'MarkDOMContent',
  MarkFirstPaint = 'firstPaint',
  MarkFCP = 'firstContentfulPaint',
  MarkLCPCandidate = 'largestContentfulPaint::Candidate',
  MarkLCPInvalidate = 'largestContentfulPaint::Invalidate',
  NavigationStart = 'navigationStart',

  TimeStamp = 'TimeStamp',
  ConsoleTime = 'ConsoleTime',
  UserTiming = 'UserTiming',
  EventTiming = 'EventTiming',

  ResourceWillSendRequest = 'ResourceWillSendRequest',
  ResourceSendRequest = 'ResourceSendRequest',
  ResourceReceiveResponse = 'ResourceReceiveResponse',
  ResourceReceivedData = 'ResourceReceivedData',
  ResourceFinish = 'ResourceFinish',
  ResourceMarkAsCached = 'ResourceMarkAsCached',

  RunMicrotasks = 'RunMicrotasks',
  FunctionCall = 'FunctionCall',
  GCEvent = 'GCEvent',
  MajorGC = 'MajorGC',
  MinorGC = 'MinorGC',

  // The following types are used for CPUProfile.
  // JSRoot is used for the root node.
  // JSIdleFrame and JSIdleSample are used for idle nodes.
  // JSSystemFrame and JSSystemSample are used for other system nodes.
  // JSFrame and JSSample are used for other nodes, and will be categorized as |scripting|.
  JSFrame = 'JSFrame',
  JSSample = 'JSSample',
  JSIdleFrame = 'JSIdleFrame',
  JSIdleSample = 'JSIdleSample',
  JSSystemFrame = 'JSSystemFrame',
  JSSystemSample = 'JSSystemSample',
  JSRoot = 'JSRoot',

  // V8Sample events are coming from tracing and contain raw stacks with function addresses.
  // After being processed with help of JitCodeAdded and JitCodeMoved events they
  // get translated into function infos and stored as stacks in JSSample events.
  V8Sample = 'V8Sample',
  JitCodeAdded = 'JitCodeAdded',
  JitCodeMoved = 'JitCodeMoved',
  StreamingCompileScript = 'v8.parseOnBackground',
  StreamingCompileScriptWaiting = 'v8.parseOnBackgroundWaiting',
  StreamingCompileScriptParsing = 'v8.parseOnBackgroundParsing',
  BackgroundDeserialize = 'v8.deserializeOnBackground',
  FinalizeDeserialization = 'V8.FinalizeDeserialization',
  V8Execute = 'V8.Execute',

  UpdateCounters = 'UpdateCounters',

  RequestAnimationFrame = 'RequestAnimationFrame',
  CancelAnimationFrame = 'CancelAnimationFrame',
  FireAnimationFrame = 'FireAnimationFrame',

  RequestIdleCallback = 'RequestIdleCallback',
  CancelIdleCallback = 'CancelIdleCallback',
  FireIdleCallback = 'FireIdleCallback',

  WebSocketCreate = 'WebSocketCreate',
  WebSocketSendHandshakeRequest = 'WebSocketSendHandshakeRequest',
  WebSocketReceiveHandshakeResponse = 'WebSocketReceiveHandshakeResponse',
  WebSocketDestroy = 'WebSocketDestroy',

  EmbedderCallback = 'EmbedderCallback',

  SetLayerTreeId = 'SetLayerTreeId',
  TracingStartedInPage = 'TracingStartedInPage',
  TracingSessionIdForWorker = 'TracingSessionIdForWorker',
  StartProfiling = 'CpuProfiler::StartProfiling',

  DecodeImage = 'Decode Image',
  ResizeImage = 'Resize Image',
  DrawLazyPixelRef = 'Draw LazyPixelRef',
  DecodeLazyPixelRef = 'Decode LazyPixelRef',

  LazyPixelRef = 'LazyPixelRef',
  LayerTreeHostImplSnapshot = 'cc::LayerTreeHostImpl',
  PictureSnapshot = 'cc::Picture',
  DisplayItemListSnapshot = 'cc::DisplayItemList',
  InputLatencyMouseMove = 'InputLatency::MouseMove',
  InputLatencyMouseWheel = 'InputLatency::MouseWheel',
  ImplSideFling = 'InputHandlerProxy::HandleGestureFling::started',
  GCCollectGarbage = 'BlinkGC.AtomicPhase',

  CryptoDoEncrypt = 'DoEncrypt',
  CryptoDoEncryptReply = 'DoEncryptReply',
  CryptoDoDecrypt = 'DoDecrypt',
  CryptoDoDecryptReply = 'DoDecryptReply',
  CryptoDoDigest = 'DoDigest',
  CryptoDoDigestReply = 'DoDigestReply',
  CryptoDoSign = 'DoSign',
  CryptoDoSignReply = 'DoSignReply',
  CryptoDoVerify = 'DoVerify',
  CryptoDoVerifyReply = 'DoVerifyReply',

  // CpuProfile is a virtual event created on frontend to support
  // serialization of CPU Profiles within tracing timeline data.
  CpuProfile = 'CpuProfile',
  Profile = 'Profile',

  AsyncTask = 'AsyncTask',

  SelectorStats = 'SelectorStats',
}

export namespace TimelineModelImpl {
  export const Category = {
    Console: 'blink.console',
    UserTiming: 'blink.user_timing',
    Loading: 'loading',
  };

  export const WorkerThreadName = 'DedicatedWorker thread';
  export const WorkerThreadNameLegacy = 'DedicatedWorker Thread';
  export const RendererMainThreadName = 'CrRendererMain';
  export const BrowserMainThreadName = 'CrBrowserMain';
  // The names of threads before M111 were exactly this, but afterwards have
  // it a suffix after the exact role.
  export const UtilityMainThreadNameSuffix = 'CrUtilityMain';

  export const DevToolsMetadataEvent = {
    TracingStartedInBrowser: 'TracingStartedInBrowser',
    TracingStartedInPage: 'TracingStartedInPage',
    TracingSessionIdForWorker: 'TracingSessionIdForWorker',
    FrameCommittedInBrowser: 'FrameCommittedInBrowser',
    ProcessReadyInBrowser: 'ProcessReadyInBrowser',
    FrameDeletedInBrowser: 'FrameDeletedInBrowser',
  };

  export const Thresholds = {
    LongTask: 50,
    Handler: 150,
    RecurringHandler: 50,
    ForcedLayout: 30,
    IdleCallbackAddon: 5,
  };
}

export class PageFrame {
  frameId: any;
  url: any;
  name: any;
  children: PageFrame[];
  parent: PageFrame|null;
  processes: {
    time: number,
    processId: number,
    processPseudoId: string|null,
    url: Platform.DevToolsPath.UrlString,
  }[];
  deletedTime: number|null;
  ownerNode: SDK.DOMModel.DeferredDOMNode|null;
  constructor(payload: any) {
    this.frameId = payload['frame'];
    this.url = payload['url'] || Platform.DevToolsPath.EmptyUrlString;
    this.name = payload['name'];
    this.children = [];
    this.parent = null;
    this.processes = [];
    this.deletedTime = null;
    // TODO(dgozman): figure this out.
    // this.ownerNode = target && payload['nodeId'] ? new SDK.DOMModel.DeferredDOMNode(target, payload['nodeId']) : null;
    this.ownerNode = null;
  }

  update(time: number, payload: any): void {
    this.url = payload['url'] || '';
    this.name = payload['name'];
    if (payload['processId']) {
      this.processes.push(
          {time: time, processId: payload['processId'], processPseudoId: '', url: payload['url'] || ''});
    } else {
      this.processes.push(
          {time: time, processId: -1, processPseudoId: payload['processPseudoId'], url: payload['url'] || ''});
    }
  }

  processReady(processPseudoId: string, processId: number): void {
    for (const process of this.processes) {
      if (process.processPseudoId === processPseudoId) {
        process.processPseudoId = '';
        process.processId = processId;
      }
    }
  }

  addChild(child: PageFrame): void {
    this.children.push(child);
    child.parent = this;
  }
}

export class EventOnTimelineData {
  url: Platform.DevToolsPath.UrlString|null;
  frameId: Protocol.Page.FrameId|null;

  constructor() {
    this.url = null;
    this.frameId = null;
  }

  static forEvent(event: TraceEngine.Legacy.CompatibleTraceEvent): EventOnTimelineData {
    if (event instanceof TraceEngine.Legacy.PayloadEvent) {
      return EventOnTimelineData.forTraceEventData(event.rawPayload());
    }
    if (!(event instanceof TraceEngine.Legacy.Event)) {
      return EventOnTimelineData.forTraceEventData(event);
    }
    return getOrCreateEventData(event);
  }

  static forTraceEventData(event: TraceEngine.Types.TraceEvents.TraceEventData): EventOnTimelineData {
    return getOrCreateEventData(event);
  }
}

function getOrCreateEventData(event: TraceEngine.Legacy.ConstructedEvent|
                              TraceEngine.Types.TraceEvents.TraceEventData): EventOnTimelineData {
  let data = eventToData.get(event);
  if (!data) {
    data = new EventOnTimelineData();
    eventToData.set(event, data);
  }
  return data;
}

const eventToData =
    new Map<TraceEngine.Legacy.ConstructedEvent|TraceEngine.Types.TraceEvents.TraceEventData, EventOnTimelineData>();

export interface MetadataEvents {
  page: TraceEngine.Legacy.Event[];
  workers: TraceEngine.Legacy.Event[];
}

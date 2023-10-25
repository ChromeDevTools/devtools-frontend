/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
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

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import {type TimelineCategory} from './EventUICategory.js';
import {type PerformanceModel} from './PerformanceModel.js';
import {TimelineUIUtils} from './TimelineUIUtils.js';

const UIStrings = {
  /**
   *@description Short for Network. Label for the network requests section of the Performance panel.
   */
  net: 'NET',
  /**
   *@description Text in Timeline Event Overview of the Performance panel
   */
  cpu: 'CPU',
  /**
   *@description Text in Timeline Event Overview of the Performance panel
   */
  heap: 'HEAP',
  /**
   *@description Heap size label text content in Timeline Event Overview of the Performance panel
   *@example {10 MB} PH1
   *@example {30 MB} PH2
   */
  sSDash: '{PH1} – {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineEventOverview.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export abstract class TimelineEventOverview extends PerfUI.TimelineOverviewPane.TimelineOverviewBase {
  constructor(id: string, title: string|null) {
    super();
    this.element.id = 'timeline-overview-' + id;
    this.element.classList.add('overview-strip');
    if (title) {
      this.element.createChild('div', 'timeline-overview-strip-title').textContent = title;
    }
  }

  renderBar(begin: number, end: number, position: number, height: number, color: string): void {
    const x = begin;
    const width = end - begin;
    const ctx = this.context();
    ctx.fillStyle = color;
    ctx.fillRect(x, position, width, height);
  }
}

function filterEventsWithinVisibleWindow(
    events: TraceEngine.Legacy.Event[], start?: TraceEngine.Types.Timing.MilliSeconds,
    end?: TraceEngine.Types.Timing.MilliSeconds): TraceEngine.Legacy.Event[] {
  if (!start && !end) {
    return events;
  }

  return events.filter(
      event => (!start || event.startTime >= start) && (!end || !event.endTime || event.endTime <= end));
}

const HIGH_NETWORK_PRIORITIES = new Set<TraceEngine.Types.TraceEvents.Priority>([
  'VeryHigh',
  'High',
  'Medium',
]);

export class TimelineEventOverviewNetwork extends TimelineEventOverview {
  #traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData;
  constructor(traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData) {
    super('network', i18nString(UIStrings.net));
    this.#traceParsedData = traceParsedData;
  }

  override update(start?: TraceEngine.Types.Timing.MilliSeconds, end?: TraceEngine.Types.Timing.MilliSeconds): void {
    super.update();
    this.#renderWithTraceParsedData(start, end);
  }

  #renderWithTraceParsedData(
      start?: TraceEngine.Types.Timing.MilliSeconds, end?: TraceEngine.Types.Timing.MilliSeconds): void {
    if (!this.#traceParsedData) {
      return;
    }

    // Because the UI is in milliseconds, we work with milliseconds through
    // this function to get the right scale and sizing
    const traceBoundsMilli = (start && end) ?
        {
          min: start,
          max: end,
          range: end - start,
        } :
        TraceEngine.Helpers.Timing.traceWindowMilliSeconds(this.#traceParsedData.Meta.traceBounds);

    // We draw two paths, so each can take up half the height
    const pathHeight = this.height() / 2;

    const canvasWidth = this.width();
    const scale = canvasWidth / traceBoundsMilli.range;

    // We draw network requests in two chunks:
    // Requests with a priority of Medium or higher go onto the first path
    // Other requests go onto the second path.
    const highPath = new Path2D();
    const lowPath = new Path2D();

    for (const request of this.#traceParsedData.NetworkRequests.byTime) {
      const path = HIGH_NETWORK_PRIORITIES.has(request.args.data.priority) ? highPath : lowPath;
      const {startTime, endTime} = TraceEngine.Helpers.Timing.eventTimingsMilliSeconds(request);
      const rectStart = Math.max(Math.floor((startTime - traceBoundsMilli.min) * scale), 0);
      const rectEnd = Math.min(Math.ceil((endTime - traceBoundsMilli.min) * scale + 1), canvasWidth);

      path.rect(rectStart, 0, rectEnd - rectStart, pathHeight - 1);
    }

    const ctx = this.context();
    ctx.save();
    // Draw the high path onto the canvas.
    ctx.fillStyle = 'hsl(214, 60%, 60%)';
    ctx.fill(highPath);
    // Now jump down by the height of the high path, and then draw the low path.
    ctx.translate(0, pathHeight);
    ctx.fillStyle = 'hsl(214, 80%, 80%)';
    ctx.fill(lowPath);
    ctx.restore();
  }
}

const categoryToIndex = new WeakMap<TimelineCategory, number>();

export class TimelineEventOverviewCPUActivity extends TimelineEventOverview {
  private backgroundCanvas: HTMLCanvasElement;
  #performanceModel: PerformanceModel|null = null;
  #traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData|null;

  constructor(model: PerformanceModel|null, traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData|null) {
    // During the sync tracks migration this component can use either legacy
    // Performance Model data or the new engine's data. Once the migration is
    // complete this will be updated to only use the new engine and mentions of
    // the PerformanceModel will be removed.
    super('cpu-activity', i18nString(UIStrings.cpu));
    this.#performanceModel = model;
    this.#traceParsedData = traceParsedData;
    this.backgroundCanvas = (this.element.createChild('canvas', 'fill background') as HTMLCanvasElement);
  }

  override resetCanvas(): void {
    super.resetCanvas();
    this.backgroundCanvas.width = this.element.clientWidth * window.devicePixelRatio;
    this.backgroundCanvas.height = this.element.clientHeight * window.devicePixelRatio;
  }

  #drawWithNewEngine(
      traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData,
      customStart?: TraceEngine.Types.Timing.MilliSeconds, customEnd?: TraceEngine.Types.Timing.MilliSeconds): void {
    const traceBoundsMilli = TraceEngine.Helpers.Timing.traceWindowMilliSeconds(traceParsedData.Meta.traceBounds);
    if (!traceParsedData.Renderer || !traceParsedData.Samples) {
      return;
    }

    const quantSizePx = 4 * window.devicePixelRatio;
    const width = this.width();
    const height = this.height();
    const baseLine = height;
    const timeStart = customStart ?? traceBoundsMilli.min;
    const timeRange = (customStart && customEnd) ? customEnd - customStart : traceBoundsMilli.max - timeStart;
    const scale = width / timeRange;
    const quantTime = quantSizePx / scale;
    const categories = TimelineUIUtils.categories();
    const categoryOrder = TimelineUIUtils.getTimelineMainEventCategories();
    const otherIndex = categoryOrder.indexOf('other');
    const idleIndex = 0;
    console.assert(idleIndex === categoryOrder.indexOf('idle'));
    for (let i = 0; i < categoryOrder.length; ++i) {
      categoryToIndex.set(categories[categoryOrder[i]], i);
    }

    const backgroundContext = (this.backgroundCanvas.getContext('2d') as CanvasRenderingContext2D | null);
    if (!backgroundContext) {
      throw new Error('Could not find 2d canvas');
    }

    const threads = TraceEngine.Handlers.Threads.threadsInTrace(traceParsedData);
    const mainThreadContext = this.context();
    for (const thread of threads) {
      // We treat CPU_PROFILE as main thread because in a CPU Profile trace there is only ever one thread.
      const isMainThread = thread.type === TraceEngine.Handlers.Threads.ThreadType.MAIN_THREAD ||
          thread.type === TraceEngine.Handlers.Threads.ThreadType.CPU_PROFILE;
      if (isMainThread) {
        drawThreadEntries(mainThreadContext, thread);
      } else {
        drawThreadEntries(backgroundContext, thread);
      }
    }

    function applyPattern(ctx: CanvasRenderingContext2D): void {
      const step = 4 * window.devicePixelRatio;
      ctx.save();
      ctx.lineWidth = step / Math.sqrt(8);
      for (let x = 0.5; x < width + height; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x - height, height);
      }
      ctx.globalCompositeOperation = 'destination-out';
      ctx.stroke();
      ctx.restore();
    }

    applyPattern(backgroundContext);

    function drawThreadEntries(
        context: CanvasRenderingContext2D, threadData: TraceEngine.Handlers.Threads.ThreadData): void {
      const quantizer = new Quantizer(timeStart, quantTime, drawSample);
      let x = 0;
      const categoryIndexStack: number[] = [];
      const paths: Path2D[] = [];
      const lastY: number[] = [];
      for (let i = 0; i < categoryOrder.length; ++i) {
        paths[i] = new Path2D();
        paths[i].moveTo(0, height);
        lastY[i] = height;
      }

      function drawSample(counters: number[]): void {
        let y = baseLine;
        for (let i = idleIndex + 1; i < categoryOrder.length; ++i) {
          const h = (counters[i] || 0) / quantTime * height;
          y -= h;
          paths[i].bezierCurveTo(x, lastY[i], x, y, x + quantSizePx / 2, y);
          lastY[i] = y;
        }
        x += quantSizePx;
      }

      function onEntryStart(entry: TraceEngine.Types.TraceEvents.TraceEntry): void {
        const {startTime} = TraceEngine.Helpers.Timing.eventTimingsMilliSeconds(entry);
        const index = categoryIndexStack.length ? categoryIndexStack[categoryIndexStack.length - 1] : idleIndex;
        quantizer.appendInterval(startTime, index);
        const category = TimelineUIUtils.eventStyle(entry).category;
        if (category.name === 'idle') {
          // Idle event won't show in CPU activity, so just skip them.
          return;
        }
        const categoryIndex = categoryOrder.indexOf(category.name);
        categoryIndexStack.push(categoryIndex || otherIndex);
      }

      function onEntryEnd(entry: TraceEngine.Types.TraceEvents.TraceEntry): void {
        const {endTime} = TraceEngine.Helpers.Timing.eventTimingsMilliSeconds(entry);
        const lastCategoryIndex = categoryIndexStack.pop();
        if (endTime !== undefined && lastCategoryIndex) {
          quantizer.appendInterval(endTime, lastCategoryIndex);
        }
      }

      const bounds = {...traceParsedData.Meta.traceBounds};
      if (customStart) {
        bounds.min = TraceEngine.Helpers.Timing.millisecondsToMicroseconds(customStart);
      }
      if (customEnd) {
        bounds.max = TraceEngine.Helpers.Timing.millisecondsToMicroseconds(customEnd);
      }
      bounds.range = TraceEngine.Types.Timing.MicroSeconds(bounds.max - bounds.min);

      TraceEngine.Helpers.TreeHelpers.walkEntireTree(
          threadData.entryToNode, threadData.tree, onEntryStart, onEntryEnd, bounds);

      quantizer.appendInterval(timeStart + timeRange + quantTime, idleIndex);  // Kick drawing the last bucket.
      for (let i = categoryOrder.length - 1; i > 0; --i) {
        paths[i].lineTo(width, height);
        const computedColorValue = categories[categoryOrder[i]].getComputedValue();
        context.fillStyle = computedColorValue;
        context.fill(paths[i]);
        context.strokeStyle = 'white';
        context.lineWidth = 1;
        context.stroke(paths[i]);
      }
    }
  }

  override update(start?: TraceEngine.Types.Timing.MilliSeconds, end?: TraceEngine.Types.Timing.MilliSeconds): void {
    super.update();
    // Whilst the sync tracks migration is in process, we only use the new
    // engine if the Renderer data is present. Once that migratin is complete,
    // the Renderer data will always be present and we can remove this check.
    if (this.#traceParsedData) {
      this.#drawWithNewEngine(this.#traceParsedData, start, end);
      return;
    }

    if (!this.#performanceModel) {
      return;
    }
    const timelineModel = this.#performanceModel.timelineModel();
    const quantSizePx = 4 * window.devicePixelRatio;
    const width = this.width();
    const height = this.height();
    const baseLine = height;
    const timeOffset = (start) ? start : timelineModel.minimumRecordTime();
    const timeSpan = (start && end) ? end - start : timelineModel.maximumRecordTime() - timeOffset;
    const scale = width / timeSpan;
    const quantTime = quantSizePx / scale;
    const categories = TimelineUIUtils.categories();
    const categoryOrder = TimelineUIUtils.getTimelineMainEventCategories();
    const otherIndex = categoryOrder.indexOf('other');
    const idleIndex = 0;
    console.assert(idleIndex === categoryOrder.indexOf('idle'));
    for (let i = 0; i < categoryOrder.length; ++i) {
      categoryToIndex.set(categories[categoryOrder[i]], i);
    }

    const backgroundContext = (this.backgroundCanvas.getContext('2d') as CanvasRenderingContext2D | null);
    if (!backgroundContext) {
      throw new Error('Could not find 2d canvas');
    }
    for (const track of timelineModel.tracks()) {
      if (track.type === TimelineModel.TimelineModel.TrackType.MainThread && track.forMainFrame) {
        drawThreadEvents(this.context(), track.events);
      } else {
        drawThreadEvents(backgroundContext, track.events);
      }
    }

    applyPattern(backgroundContext);

    function drawThreadEvents(ctx: CanvasRenderingContext2D, events: TraceEngine.Legacy.Event[]): void {
      const quantizer = new Quantizer(timeOffset, quantTime, drawSample);
      let x = 0;
      const categoryIndexStack: number[] = [];
      const paths: Path2D[] = [];
      const lastY: number[] = [];
      for (let i = 0; i < categoryOrder.length; ++i) {
        paths[i] = new Path2D();
        paths[i].moveTo(0, height);
        lastY[i] = height;
      }

      function drawSample(counters: number[]): void {
        let y = baseLine;
        for (let i = idleIndex + 1; i < categoryOrder.length; ++i) {
          const h = (counters[i] || 0) / quantTime * height;
          y -= h;
          paths[i].bezierCurveTo(x, lastY[i], x, y, x + quantSizePx / 2, y);
          lastY[i] = y;
        }
        x += quantSizePx;
      }

      function onEventStart(e: TraceEngine.Legacy.CompatibleTraceEvent): void {
        const {startTime} = TraceEngine.Legacy.timesForEventInMilliseconds(e);
        const index = categoryIndexStack.length ? categoryIndexStack[categoryIndexStack.length - 1] : idleIndex;
        quantizer.appendInterval(startTime, (index as number));
        const categoryIndex = categoryToIndex.get(TimelineUIUtils.eventStyle(e).category);
        if (categoryIndex === idleIndex) {
          // Idle event won't show in CPU activity, so just skip them.
          return;
        }
        categoryIndexStack.push(categoryIndex !== undefined ? categoryIndex : otherIndex);
      }

      function onEventEnd(e: TraceEngine.Legacy.CompatibleTraceEvent): void {
        const {endTime} = TraceEngine.Legacy.timesForEventInMilliseconds(e);
        const lastCategoryIndex = categoryIndexStack.pop();
        if (endTime !== undefined && lastCategoryIndex) {
          quantizer.appendInterval(endTime, lastCategoryIndex);
        }
      }

      TimelineModel.TimelineModel.TimelineModelImpl.forEachEvent(
          filterEventsWithinVisibleWindow(events), onEventStart, onEventEnd);
      quantizer.appendInterval(timeOffset + timeSpan + quantTime, idleIndex);  // Kick drawing the last bucket.
      for (let i = categoryOrder.length - 1; i > 0; --i) {
        paths[i].lineTo(width, height);
        const computedColorValue = categories[categoryOrder[i]].getComputedValue();
        ctx.fillStyle = computedColorValue;
        ctx.fill(paths[i]);

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke(paths[i]);
      }
    }

    function applyPattern(ctx: CanvasRenderingContext2D): void {
      const step = 4 * window.devicePixelRatio;
      ctx.save();
      ctx.lineWidth = step / Math.sqrt(8);
      for (let x = 0.5; x < width + height; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x - height, height);
      }
      ctx.globalCompositeOperation = 'destination-out';
      ctx.stroke();
      ctx.restore();
    }
  }
}

export class TimelineEventOverviewResponsiveness extends TimelineEventOverview {
  #traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData;
  constructor(traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData) {
    super('responsiveness', null);
    this.#traceParsedData = traceParsedData;
  }

  #gatherEventsWithRelevantWarnings(): Set<TraceEngine.Types.TraceEvents.TraceEventData> {
    const {topLevelRendererIds} = this.#traceParsedData.Meta;

    // All the warnings that we care about regarding responsiveness and want to represent on the overview.
    const warningsForResponsiveness = new Set<TraceEngine.Handlers.ModelHandlers.Warnings.Warning>([
      'LONG_TASK',
      'FORCED_STYLE',
      'IDLE_CALLBACK_OVER_TIME',
      'FORCED_LAYOUT',
    ]);

    const allWarningEvents = new Set<TraceEngine.Types.TraceEvents.TraceEventData>();
    for (const warning of warningsForResponsiveness) {
      const eventsForWarning = this.#traceParsedData.Warnings.perWarning.get(warning);
      if (!eventsForWarning) {
        continue;
      }

      for (const event of eventsForWarning) {
        // Only keep events whose PID is a top level renderer, which means it
        // was on the main thread. This avoids showing issues from iframes or
        // other sub-frames in the minimap overview.
        if (topLevelRendererIds.has(event.pid)) {
          allWarningEvents.add(event);
        }
      }
    }
    return allWarningEvents;
  }

  override update(start?: TraceEngine.Types.Timing.MilliSeconds, end?: TraceEngine.Types.Timing.MilliSeconds): void {
    super.update();

    const height = this.height();
    const visibleTimeWindow = !(start && end) ? this.#traceParsedData.Meta.traceBounds : {
      min: TraceEngine.Helpers.Timing.millisecondsToMicroseconds(start),
      max: TraceEngine.Helpers.Timing.millisecondsToMicroseconds(end),
      range: TraceEngine.Helpers.Timing.millisecondsToMicroseconds(TraceEngine.Types.Timing.MilliSeconds(end - start)),
    };
    const timeSpan = visibleTimeWindow.range;
    const scale = this.width() / timeSpan;
    const ctx = this.context();
    const fillPath = new Path2D();
    const markersPath = new Path2D();

    const eventsWithWarning = this.#gatherEventsWithRelevantWarnings();
    for (const event of eventsWithWarning) {
      paintWarningDecoration(event);
    }

    ctx.fillStyle = 'hsl(0, 80%, 90%)';
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2 * window.devicePixelRatio;
    ctx.fill(fillPath);
    ctx.stroke(markersPath);

    function paintWarningDecoration(event: TraceEngine.Types.TraceEvents.TraceEventData): void {
      const {startTime, duration} = TraceEngine.Helpers.Timing.eventTimingsMicroSeconds(event);
      const x = Math.round(scale * (startTime - visibleTimeWindow.min));
      const width = Math.round(scale * duration);
      fillPath.rect(x, 0, width, height);
      markersPath.moveTo(x + width, 0);
      markersPath.lineTo(x + width, height);
    }
  }
}

export class TimelineFilmStripOverview extends TimelineEventOverview {
  private frameToImagePromise: Map<TraceEngine.Extras.FilmStrip.Frame, Promise<HTMLImageElement>>;
  private lastFrame: TraceEngine.Extras.FilmStrip.Frame|null = null;
  private lastElement: Element|null;
  private drawGeneration?: symbol;
  private emptyImage?: HTMLImageElement;
  #filmStrip: TraceEngine.Extras.FilmStrip.Data|null = null;

  constructor(filmStrip: TraceEngine.Extras.FilmStrip.Data) {
    super('filmstrip', null);
    this.frameToImagePromise = new Map();
    this.#filmStrip = filmStrip;
    this.lastFrame = null;
    this.lastElement = null;
    this.reset();
  }

  override update(): void {
    super.update();
    const frames = this.#filmStrip ? this.#filmStrip.frames : [];
    if (!frames.length) {
      return;
    }

    if (this.height() === 0) {
      // Height of 0 causes the maths below to get off and generate very large
      // negative numbers that cause an extremely long loop when attempting to
      // draw images by frame. Rather than that, let's warn and exist early.
      console.warn('TimelineFilmStrip could not be drawn as its canvas height is 0');
      return;
    }

    const drawGeneration = Symbol('drawGeneration');
    this.drawGeneration = drawGeneration;
    void this.imageByFrame(frames[0]).then(image => {
      if (this.drawGeneration !== drawGeneration) {
        return;
      }
      if (!image || !image.naturalWidth || !image.naturalHeight) {
        return;
      }
      const imageHeight = this.height() - 2 * TimelineFilmStripOverview.Padding;
      const imageWidth = Math.ceil(imageHeight * image.naturalWidth / image.naturalHeight);
      const popoverScale = Math.min(200 / image.naturalWidth, 1);
      this.emptyImage = new Image(image.naturalWidth * popoverScale, image.naturalHeight * popoverScale);
      this.drawFrames(imageWidth, imageHeight);
    });
  }

  private async imageByFrame(frame: TraceEngine.Extras.FilmStrip.Frame): Promise<HTMLImageElement|null> {
    let imagePromise: Promise<HTMLImageElement|null>|undefined = this.frameToImagePromise.get(frame);
    if (!imagePromise) {
      const data = frame.screenshotAsString;
      imagePromise = UI.UIUtils.loadImageFromData(data);
      this.frameToImagePromise.set(frame, (imagePromise as Promise<HTMLImageElement>));
    }
    return imagePromise;
  }

  private drawFrames(imageWidth: number, imageHeight: number): void {
    if (!imageWidth) {
      return;
    }
    if (!this.#filmStrip || this.#filmStrip.frames.length < 1) {
      return;
    }
    const padding = TimelineFilmStripOverview.Padding;
    const width = this.width();
    const zeroTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(this.#filmStrip.zeroTime);
    const spanTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(this.#filmStrip.spanTime);
    const scale = spanTime / width;
    const context = this.context();
    const drawGeneration = this.drawGeneration;

    context.beginPath();
    for (let x = padding; x < width; x += imageWidth + 2 * padding) {
      const time = TraceEngine.Types.Timing.MilliSeconds(zeroTime + (x + imageWidth / 2) * scale);
      const timeMicroSeconds = TraceEngine.Helpers.Timing.millisecondsToMicroseconds(time);
      const frame = TraceEngine.Extras.FilmStrip.frameClosestToTimestamp(this.#filmStrip, timeMicroSeconds);
      if (!frame) {
        continue;
      }
      context.rect(x - 0.5, 0.5, imageWidth + 1, imageHeight + 1);
      void this.imageByFrame(frame).then(drawFrameImage.bind(this, x));
    }
    context.strokeStyle = '#ddd';
    context.stroke();

    function drawFrameImage(this: TimelineFilmStripOverview, x: number, image: HTMLImageElement|null): void {
      // Ignore draws deferred from a previous update call.
      if (this.drawGeneration !== drawGeneration || !image) {
        return;
      }
      context.drawImage(image, x, 1, imageWidth, imageHeight);
    }
  }

  override async overviewInfoPromise(x: number): Promise<Element|null> {
    if (!this.#filmStrip || this.#filmStrip.frames.length === 0) {
      return null;
    }

    const calculator = this.calculator();
    if (!calculator) {
      return null;
    }
    const timeMilliSeconds = TraceEngine.Types.Timing.MilliSeconds(calculator.positionToTime(x));
    const timeMicroSeconds = TraceEngine.Helpers.Timing.millisecondsToMicroseconds(timeMilliSeconds);
    const frame = TraceEngine.Extras.FilmStrip.frameClosestToTimestamp(this.#filmStrip, timeMicroSeconds);
    if (frame === this.lastFrame) {
      return this.lastElement;
    }
    const imagePromise = frame ? this.imageByFrame(frame) : Promise.resolve(this.emptyImage);
    const image = await imagePromise;
    const element = document.createElement('div');
    element.classList.add('frame');
    if (image) {
      element.createChild('div', 'thumbnail').appendChild(image);
    }
    this.lastFrame = frame;
    this.lastElement = element;
    return element;
  }

  override reset(): void {
    this.lastFrame = null;
    this.lastElement = null;
    this.frameToImagePromise = new Map();
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly Padding = 2;
}

export class TimelineEventOverviewMemory extends TimelineEventOverview {
  private heapSizeLabel: HTMLElement;
  #traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData;

  constructor(traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData) {
    super('memory', i18nString(UIStrings.heap));
    this.heapSizeLabel = this.element.createChild('div', 'memory-graph-label');
    this.#traceParsedData = traceParsedData;
  }

  resetHeapSizeLabels(): void {
    this.heapSizeLabel.textContent = '';
  }

  override update(start?: TraceEngine.Types.Timing.MilliSeconds, end?: TraceEngine.Types.Timing.MilliSeconds): void {
    super.update();
    const ratio = window.devicePixelRatio;

    if (this.#traceParsedData.Memory.updateCountersByProcess.size === 0) {
      this.resetHeapSizeLabels();
      return;
    }

    const mainRendererIds = Array.from(this.#traceParsedData.Meta.topLevelRendererIds);
    const counterEventsPerTrack =
        mainRendererIds.map(pid => this.#traceParsedData.Memory.updateCountersByProcess.get(pid) || [])
            .filter(eventsPerRenderer => eventsPerRenderer.length > 0);

    const lowerOffset = 3 * ratio;
    let maxUsedHeapSize = 0;
    let minUsedHeapSize = 100000000000;

    const boundsMs = (start && end) ?
        {
          min: start,
          max: end,
          range: end - start,
        } :
        TraceEngine.Helpers.Timing.traceWindowMilliSeconds(this.#traceParsedData.Meta.traceBounds);
    const minTime = boundsMs.min;
    const maxTime = boundsMs.max;

    function calculateMinMaxSizes(event: TraceEngine.Types.TraceEvents.TraceEventUpdateCounters): void {
      const counters = event.args.data;
      if (!counters || !counters.jsHeapSizeUsed) {
        return;
      }
      maxUsedHeapSize = Math.max(maxUsedHeapSize, counters.jsHeapSizeUsed);
      minUsedHeapSize = Math.min(minUsedHeapSize, counters.jsHeapSizeUsed);
    }

    for (let i = 0; i < counterEventsPerTrack.length; i++) {
      counterEventsPerTrack[i].forEach(calculateMinMaxSizes);
    }

    minUsedHeapSize = Math.min(minUsedHeapSize, maxUsedHeapSize);

    const lineWidth = 1;
    const width = this.width();
    const height = this.height() - lowerOffset;
    const xFactor = width / (maxTime - minTime);
    const yFactor = (height - lineWidth) / Math.max(maxUsedHeapSize - minUsedHeapSize, 1);

    const histogram = new Array(width);

    function buildHistogram(event: TraceEngine.Types.TraceEvents.TraceEventUpdateCounters): void {
      const counters = event.args.data;
      if (!counters || !counters.jsHeapSizeUsed) {
        return;
      }
      const {startTime} = TraceEngine.Helpers.Timing.eventTimingsMilliSeconds(event);
      const x = Math.round((startTime - minTime) * xFactor);
      const y = Math.round((counters.jsHeapSizeUsed - minUsedHeapSize) * yFactor);
      histogram[x] = Math.max(histogram[x] || 0, y);
    }
    for (let i = 0; i < counterEventsPerTrack.length; i++) {
      counterEventsPerTrack[i].forEach(buildHistogram);
    }

    const ctx = this.context();
    const heightBeyondView = height + lowerOffset + lineWidth;

    ctx.translate(0.5, 0.5);
    ctx.beginPath();
    ctx.moveTo(-lineWidth, heightBeyondView);
    let y = 0;
    let isFirstPoint = true;
    let lastX = 0;
    for (let x = 0; x < histogram.length; x++) {
      if (typeof histogram[x] === 'undefined') {
        continue;
      }
      if (isFirstPoint) {
        isFirstPoint = false;
        y = histogram[x];
        ctx.lineTo(-lineWidth, height - y);
      }
      const nextY = histogram[x];
      if (Math.abs(nextY - y) > 2 && Math.abs(x - lastX) > 1) {
        ctx.lineTo(x, height - y);
      }
      y = nextY;
      ctx.lineTo(x, height - y);
      lastX = x;
    }
    ctx.lineTo(width + lineWidth, height - y);
    ctx.lineTo(width + lineWidth, heightBeyondView);
    ctx.closePath();

    ctx.fillStyle = 'hsla(220, 90%, 70%, 0.2)';
    ctx.fill();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = 'hsl(220, 90%, 70%)';
    ctx.stroke();

    this.heapSizeLabel.textContent = i18nString(UIStrings.sSDash, {
      PH1: Platform.NumberUtilities.bytesToString(minUsedHeapSize),
      PH2: Platform.NumberUtilities.bytesToString(maxUsedHeapSize),
    });
  }
}

export class Quantizer {
  private lastTime: number;
  private quantDuration: number;
  private readonly callback: (arg0: Array<number>) => void;
  private counters: number[];
  private remainder: number;
  constructor(startTime: number, quantDuration: number, callback: (arg0: Array<number>) => void) {
    this.lastTime = startTime;
    this.quantDuration = quantDuration;
    this.callback = callback;
    this.counters = [];
    this.remainder = quantDuration;
  }

  appendInterval(time: number, group: number): void {
    let interval = time - this.lastTime;
    if (interval <= this.remainder) {
      this.counters[group] = (this.counters[group] || 0) + interval;
      this.remainder -= interval;
      this.lastTime = time;
      return;
    }
    this.counters[group] = (this.counters[group] || 0) + this.remainder;
    this.callback(this.counters);
    interval -= this.remainder;
    while (interval >= this.quantDuration) {
      const counters = [];
      counters[group] = this.quantDuration;
      this.callback(counters);
      interval -= this.quantDuration;
    }
    this.counters = [];
    this.counters[group] = interval;
    this.lastTime = time;
    this.remainder = this.quantDuration - interval;
  }
}

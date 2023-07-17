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
import * as Protocol from '../../generated/protocol.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import {type PerformanceModel} from './PerformanceModel.js';

import {TimelineUIUtils, type TimelineCategory} from './TimelineUIUtils.js';

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
export class TimelineEventOverview extends PerfUI.TimelineOverviewPane.TimelineOverviewBase {
  protected model: PerformanceModel|null;
  constructor(id: string, title: string|null) {
    super();
    this.element.id = 'timeline-overview-' + id;
    this.element.classList.add('overview-strip');
    this.model = null;
    if (title) {
      this.element.createChild('div', 'timeline-overview-strip-title').textContent = title;
    }
  }

  setModel(model: PerformanceModel|null): void {
    this.model = model;
  }

  renderBar(begin: number, end: number, position: number, height: number, color: string): void {
    const x = begin;
    const width = end - begin;
    const ctx = this.context();
    ctx.fillStyle = color;
    ctx.fillRect(x, position, width, height);
  }
}

export class TimelineEventOverviewNetwork extends TimelineEventOverview {
  constructor() {
    super('network', i18nString(UIStrings.net));
  }

  override update(): void {
    super.update();
    if (!this.model) {
      return;
    }
    const timelineModel = this.model.timelineModel();
    const bandHeight = this.height() / 2;
    const timeOffset = timelineModel.minimumRecordTime();
    const timeSpan = timelineModel.maximumRecordTime() - timeOffset;
    const canvasWidth = this.width();
    const scale = canvasWidth / timeSpan;
    const highPath = new Path2D();
    const lowPath = new Path2D();
    const highPrioritySet = new Set([
      Protocol.Network.ResourcePriority.VeryHigh,
      Protocol.Network.ResourcePriority.High,
      Protocol.Network.ResourcePriority.Medium,
    ]);
    for (const request of timelineModel.networkRequests()) {
      const path = highPrioritySet.has(request.priority) ? highPath : lowPath;
      const s = Math.max(Math.floor((request.startTime - timeOffset) * scale), 0);
      const e = Math.min(Math.ceil((request.endTime - timeOffset) * scale + 1), canvasWidth);
      path.rect(s, 0, e - s, bandHeight - 1);
    }
    const ctx = this.context();
    ctx.save();
    ctx.fillStyle = 'hsl(214, 60%, 60%)';
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx.fill((highPath as any));
    ctx.translate(0, bandHeight);
    ctx.fillStyle = 'hsl(214, 80%, 80%)';
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx.fill((lowPath as any));
    ctx.restore();
  }
}

const categoryToIndex = new WeakMap<TimelineCategory, number>();

export class TimelineEventOverviewCPUActivity extends TimelineEventOverview {
  private backgroundCanvas: HTMLCanvasElement;
  constructor() {
    super('cpu-activity', i18nString(UIStrings.cpu));
    this.backgroundCanvas = (this.element.createChild('canvas', 'fill background') as HTMLCanvasElement);
  }

  override resetCanvas(): void {
    super.resetCanvas();
    this.backgroundCanvas.width = this.element.clientWidth * window.devicePixelRatio;
    this.backgroundCanvas.height = this.element.clientHeight * window.devicePixelRatio;
  }

  override update(): void {
    super.update();
    if (!this.model) {
      return;
    }
    const timelineModel = this.model.timelineModel();
    const quantSizePx = 4 * window.devicePixelRatio;
    const width = this.width();
    const height = this.height();
    const baseLine = height;
    const timeOffset = timelineModel.minimumRecordTime();
    const timeSpan = timelineModel.maximumRecordTime() - timeOffset;
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

      TimelineModel.TimelineModel.TimelineModelImpl.forEachEvent(events, onEventStart, onEventEnd);
      quantizer.appendInterval(timeOffset + timeSpan + quantTime, idleIndex);  // Kick drawing the last bucket.
      for (let i = categoryOrder.length - 1; i > 0; --i) {
        paths[i].lineTo(width, height);
        ctx.fillStyle = categories[categoryOrder[i]].color;
        ctx.fill(paths[i]);
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
  constructor() {
    super('responsiveness', null);
  }

  override update(): void {
    super.update();
    if (!this.model) {
      return;
    }
    const height = this.height();

    const timeOffset = this.model.timelineModel().minimumRecordTime();
    const timeSpan = this.model.timelineModel().maximumRecordTime() - timeOffset;
    const scale = this.width() / timeSpan;
    const frames = this.model.frames();
    const ctx = this.context();
    const fillPath = new Path2D();
    const markersPath = new Path2D();
    for (let i = 0; i < frames.length; ++i) {
      const frame = frames[i];
      if (!frame.hasWarnings()) {
        continue;
      }
      paintWarningDecoration(frame.startTime, frame.duration);
    }

    for (const track of this.model.timelineModel().tracks()) {
      const events = track.events;
      for (let i = 0; i < events.length; ++i) {
        if (!TimelineModel.TimelineModel.EventOnTimelineData.forEvent(events[i]).warning) {
          continue;
        }
        const duration = events[i].duration;
        if (duration !== undefined) {
          paintWarningDecoration(events[i].startTime, duration);
        }
      }
    }

    ctx.fillStyle = 'hsl(0, 80%, 90%)';
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2 * window.devicePixelRatio;
    ctx.fill(fillPath);
    ctx.stroke(markersPath);

    function paintWarningDecoration(time: number, duration: number): void {
      const x = Math.round(scale * (time - timeOffset));
      const w = Math.round(scale * duration);
      fillPath.rect(x, 0, w, height);
      markersPath.moveTo(x + w, 0);
      markersPath.lineTo(x + w, height);
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
  constructor() {
    super('memory', i18nString(UIStrings.heap));
    this.heapSizeLabel = this.element.createChild('div', 'memory-graph-label');
  }

  resetHeapSizeLabels(): void {
    this.heapSizeLabel.textContent = '';
  }

  override update(): void {
    super.update();
    const ratio = window.devicePixelRatio;

    if (!this.model) {
      this.resetHeapSizeLabels();
      return;
    }

    const tracks = this.model.timelineModel().tracks().filter(
        track => track.type === TimelineModel.TimelineModel.TrackType.MainThread && track.forMainFrame);
    const trackEvents = tracks.map(track => track.events);

    const lowerOffset = 3 * ratio;
    let maxUsedHeapSize = 0;
    let minUsedHeapSize = 100000000000;
    const minTime = this.model.timelineModel().minimumRecordTime();
    const maxTime = this.model.timelineModel().maximumRecordTime();

    function isUpdateCountersEvent(event: TraceEngine.Legacy.Event): boolean {
      return event.name === TimelineModel.TimelineModel.RecordType.UpdateCounters;
    }
    for (let i = 0; i < trackEvents.length; i++) {
      trackEvents[i] = trackEvents[i].filter(isUpdateCountersEvent);
    }

    function calculateMinMaxSizes(event: TraceEngine.Legacy.Event): void {
      const counters = event.args.data;
      if (!counters || !counters.jsHeapSizeUsed) {
        return;
      }
      maxUsedHeapSize = Math.max(maxUsedHeapSize, counters.jsHeapSizeUsed);
      minUsedHeapSize = Math.min(minUsedHeapSize, counters.jsHeapSizeUsed);
    }
    for (let i = 0; i < trackEvents.length; i++) {
      trackEvents[i].forEach(calculateMinMaxSizes);
    }
    minUsedHeapSize = Math.min(minUsedHeapSize, maxUsedHeapSize);

    const lineWidth = 1;
    const width = this.width();
    const height = this.height() - lowerOffset;
    const xFactor = width / (maxTime - minTime);
    const yFactor = (height - lineWidth) / Math.max(maxUsedHeapSize - minUsedHeapSize, 1);

    const histogram = new Array(width);

    function buildHistogram(event: TraceEngine.Legacy.Event): void {
      const counters = event.args.data;
      if (!counters || !counters.jsHeapSizeUsed) {
        return;
      }
      const x = Math.round((event.startTime - minTime) * xFactor);
      const y = Math.round((counters.jsHeapSizeUsed - minUsedHeapSize) * yFactor);
      // TODO(alph): use sum instead of max.
      histogram[x] = Math.max(histogram[x] || 0, y);
    }
    for (let i = 0; i < trackEvents.length; i++) {
      trackEvents[i].forEach(buildHistogram);
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

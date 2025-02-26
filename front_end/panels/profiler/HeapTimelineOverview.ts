// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

export class HeapTimelineOverview extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(
    UI.Widget.VBox) {
  readonly overviewCalculator: OverviewCalculator;
  overviewContainer: HTMLElement;
  overviewGrid: PerfUI.OverviewGrid.OverviewGrid;
  overviewCanvas: HTMLCanvasElement;
  windowLeftRatio: number;
  windowRightRatio: number;
  readonly yScale: SmoothScale;
  readonly xScale: SmoothScale;
  profileSamples: Samples;
  running?: boolean;
  updateOverviewCanvas?: boolean;
  updateGridTimerId?: number;
  updateTimerId?: number|null;
  windowWidthRatio?: number;
  constructor() {
    super();
    this.element.id = 'heap-recording-view';
    this.element.classList.add('heap-tracking-overview');
    this.element.setAttribute('jslog', `${VisualLogging.section('heap-tracking-overview')}`);

    this.overviewCalculator = new OverviewCalculator();
    this.overviewContainer = this.element.createChild('div', 'heap-overview-container');
    this.overviewGrid = new PerfUI.OverviewGrid.OverviewGrid('heap-recording', this.overviewCalculator);
    this.overviewGrid.element.classList.add('fill');
    this.overviewCanvas = this.overviewContainer.createChild('canvas', 'heap-recording-overview-canvas');
    this.overviewContainer.appendChild(this.overviewGrid.element);
    this.overviewGrid.addEventListener(PerfUI.OverviewGrid.Events.WINDOW_CHANGED, this.onWindowChanged, this);

    this.windowLeftRatio = 0.0;
    this.windowRightRatio = 1.0;
    this.overviewGrid.setWindowRatio(this.windowLeftRatio, this.windowRightRatio);
    this.yScale = new SmoothScale();
    this.xScale = new SmoothScale();

    this.profileSamples = new Samples();

    ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, () => this.update());
  }

  start(): void {
    this.running = true;
    const drawFrame = (): void => {
      this.update();
      if (this.running) {
        this.element.window().requestAnimationFrame(drawFrame);
      }
    };
    drawFrame();
  }

  stop(): void {
    this.running = false;
  }

  setSamples(samples: Samples): void {
    this.profileSamples = samples;
    if (!this.running) {
      this.update();
    }
  }

  drawOverviewCanvas(width: number, height: number): void {
    if (!this.profileSamples) {
      return;
    }
    const profileSamples = this.profileSamples;
    const sizes = profileSamples.sizes;
    const topSizes = profileSamples.max;
    const timestamps = profileSamples.timestamps;
    const startTime = timestamps[0];

    const scaleFactor = this.xScale.nextScale(width / profileSamples.totalTime);
    let maxSize = 0;
    function aggregateAndCall(sizes: number[], callback: (arg0: number, arg1: number) => void): void {
      let size = 0;
      let currentX = 0;
      for (let i = 1; i < timestamps.length; ++i) {
        const x = Math.floor((timestamps[i] - startTime) * scaleFactor);
        if (x !== currentX) {
          if (size) {
            callback(currentX, size);
          }
          size = 0;
          currentX = x;
        }
        size += sizes[i];
      }
      callback(currentX, size);
    }

    function maxSizeCallback(x: number, size: number): void {
      maxSize = Math.max(maxSize, size);
    }

    aggregateAndCall(sizes, maxSizeCallback);

    const yScaleFactor = this.yScale.nextScale(maxSize ? height / (maxSize * 1.1) : 0.0);

    this.overviewCanvas.width = width * window.devicePixelRatio;
    this.overviewCanvas.height = height * window.devicePixelRatio;
    this.overviewCanvas.style.width = width + 'px';
    this.overviewCanvas.style.height = height + 'px';

    const maybeContext = this.overviewCanvas.getContext('2d');
    if (!maybeContext) {
      throw new Error('Failed to get canvas context');
    }
    const context = maybeContext;
    context.scale(window.devicePixelRatio, window.devicePixelRatio);

    if (this.running) {
      context.beginPath();
      context.lineWidth = 2;
      context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-neutral-outline');
      const currentX = (Date.now() - startTime) * scaleFactor;
      context.moveTo(currentX, height - 1);
      context.lineTo(currentX, 0);
      context.stroke();
      context.closePath();
    }

    let gridY = 0;
    let gridValue;
    const gridLabelHeight = 14;
    if (yScaleFactor) {
      const maxGridValue = (height - gridLabelHeight) / yScaleFactor;
      // The round value calculation is a bit tricky, because
      // it has a form k*10^n*1024^m, where k=[1,5], n=[0..3], m is an integer,
      // e.g. a round value 10KB is 10240 bytes.
      gridValue = Math.pow(1024, Math.floor(Math.log(maxGridValue) / Math.log(1024)));
      gridValue *= Math.pow(10, Math.floor(Math.log(maxGridValue / gridValue) / Math.LN10));
      if (gridValue * 5 <= maxGridValue) {
        gridValue *= 5;
      }
      gridY = Math.round(height - gridValue * yScaleFactor - 0.5) + 0.5;
      context.beginPath();
      context.lineWidth = 1;
      context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-on-surface-subtle');
      context.moveTo(0, gridY);
      context.lineTo(width, gridY);
      context.stroke();
      context.closePath();
    }

    function drawBarCallback(x: number, size: number): void {
      context.moveTo(x, height - 1);
      context.lineTo(x, Math.round(height - size * yScaleFactor - 1));
    }

    context.beginPath();
    context.lineWidth = 2;
    context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-neutral-outline');
    aggregateAndCall(topSizes, drawBarCallback);
    context.stroke();
    context.closePath();

    context.beginPath();
    context.lineWidth = 2;
    context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-primary-bright');
    aggregateAndCall(sizes, drawBarCallback);
    context.stroke();
    context.closePath();

    if (gridValue) {
      const label = i18n.ByteUtilities.bytesToString(gridValue);
      const labelPadding = 4;
      const labelX = 0;
      const labelY = gridY - 0.5;
      const labelWidth = 2 * labelPadding + context.measureText(label).width;
      context.beginPath();
      context.textBaseline = 'bottom';
      context.font = '10px ' + window.getComputedStyle(this.element, null).getPropertyValue('font-family');
      // Background behind text for better contrast. Some opacity so canvas can still bleed through
      context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background-opacity-80');
      context.fillRect(labelX, labelY - gridLabelHeight, labelWidth, gridLabelHeight);
      context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-on-surface-subtle');
      context.fillText(label, labelX + labelPadding, labelY);
      context.fill();
      context.closePath();
    }
  }

  override onResize(): void {
    this.updateOverviewCanvas = true;
    this.scheduleUpdate();
  }

  onWindowChanged(): void {
    if (!this.updateGridTimerId) {
      this.updateGridTimerId = window.setTimeout(this.updateGrid.bind(this), 10);
    }
  }

  scheduleUpdate(): void {
    if (this.updateTimerId) {
      return;
    }
    this.updateTimerId = window.setTimeout(this.update.bind(this), 10);
  }

  updateBoundaries(): void {
    this.windowLeftRatio = this.overviewGrid.windowLeftRatio();
    this.windowRightRatio = this.overviewGrid.windowRightRatio();
    this.windowWidthRatio = this.windowRightRatio - this.windowLeftRatio;
  }

  update(): void {
    this.updateTimerId = null;
    if (!this.isShowing()) {
      return;
    }
    this.updateBoundaries();
    this.overviewCalculator.updateBoundaries(this);
    this.overviewGrid.updateDividers(this.overviewCalculator);
    this.drawOverviewCanvas(this.overviewContainer.clientWidth, this.overviewContainer.clientHeight - 20);
  }

  updateGrid(): void {
    this.updateGridTimerId = 0;
    this.updateBoundaries();
    const ids = this.profileSamples.ids;
    if (!ids.length) {
      return;
    }
    const timestamps = this.profileSamples.timestamps;
    const sizes = this.profileSamples.sizes;
    const startTime = timestamps[0];
    const totalTime = this.profileSamples.totalTime;
    const timeLeft = startTime + totalTime * this.windowLeftRatio;
    const timeRight = startTime + totalTime * this.windowRightRatio;
    const minIndex =
        Platform.ArrayUtilities.lowerBound(timestamps, timeLeft, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
    const maxIndex =
        Platform.ArrayUtilities.upperBound(timestamps, timeRight, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
    let size = 0;
    for (let i = minIndex; i < maxIndex; ++i) {
      size += sizes[i];
    }
    const minId = minIndex > 0 ? ids[minIndex - 1] : 0;
    const maxId = maxIndex < ids.length ? ids[maxIndex] : Infinity;

    this.dispatchEventToListeners(Events.IDS_RANGE_CHANGED, {minId, maxId, size});
  }
}

export const enum Events {
  IDS_RANGE_CHANGED = 'IdsRangeChanged',
}

export interface IdsRangeChangedEvent {
  minId: number;
  maxId: number;
  size: number;
}

export interface EventTypes {
  [Events.IDS_RANGE_CHANGED]: IdsRangeChangedEvent;
}

export class SmoothScale {
  lastUpdate: number;
  currentScale: number;
  constructor() {
    this.lastUpdate = 0;
    this.currentScale = 0.0;
  }

  nextScale(target: number): number {
    target = target || this.currentScale;
    if (this.currentScale) {
      const now = Date.now();
      const timeDeltaMs = now - this.lastUpdate;
      this.lastUpdate = now;
      const maxChangePerSec = 20;
      const maxChangePerDelta = Math.pow(maxChangePerSec, timeDeltaMs / 1000);
      const scaleChange = target / this.currentScale;
      this.currentScale *= Platform.NumberUtilities.clamp(scaleChange, 1 / maxChangePerDelta, maxChangePerDelta);
    } else {
      this.currentScale = target;
    }
    return this.currentScale;
  }
}

export class Samples {
  sizes: number[];
  ids: number[];
  timestamps: number[];
  max: number[];
  totalTime: number;
  constructor() {
    this.sizes = [];
    this.ids = [];
    this.timestamps = [];
    this.max = [];
    this.totalTime = 30000;
  }
}

export class OverviewCalculator implements PerfUI.TimelineGrid.Calculator {
  maximumBoundaries: number;
  minimumBoundaries: number;
  xScaleFactor: number;
  constructor() {
    this.maximumBoundaries = 0;
    this.minimumBoundaries = 0;
    this.xScaleFactor = 0;
  }

  updateBoundaries(chart: HeapTimelineOverview): void {
    this.minimumBoundaries = 0;
    this.maximumBoundaries = chart.profileSamples.totalTime;
    this.xScaleFactor = chart.overviewContainer.clientWidth / this.maximumBoundaries;
  }

  computePosition(time: number): number {
    return (time - this.minimumBoundaries) * this.xScaleFactor;
  }

  formatValue(value: number, precision?: number): string {
    return i18n.TimeUtilities.secondsToString(value / 1000, Boolean(precision));
  }

  maximumBoundary(): number {
    return this.maximumBoundaries;
  }

  minimumBoundary(): number {
    return this.minimumBoundaries;
  }

  zeroTime(): number {
    return this.minimumBoundaries;
  }

  boundarySpan(): number {
    return this.maximumBoundaries - this.minimumBoundaries;
  }
}

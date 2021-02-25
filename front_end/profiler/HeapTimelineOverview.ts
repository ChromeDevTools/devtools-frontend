// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as PerfUI from '../perf_ui/perf_ui.js';
import * as Platform from '../platform/platform.js';
import * as UI from '../ui/ui.js';

export class HeapTimelineOverview extends UI.Widget.VBox {
  _overviewCalculator: OverviewCalculator;
  _overviewContainer: HTMLElement;
  _overviewGrid: PerfUI.OverviewGrid.OverviewGrid;
  _overviewCanvas: HTMLCanvasElement;
  _windowLeft: number;
  _windowRight: number;
  _yScale: SmoothScale;
  _xScale: SmoothScale;
  _profileSamples: Samples;
  _running?: boolean;
  _updateOverviewCanvas?: boolean;
  _updateGridTimerId?: number;
  _updateTimerId?: number|null;
  _windowWidth?: number;
  constructor() {
    super();
    this.element.id = 'heap-recording-view';
    this.element.classList.add('heap-tracking-overview');

    this._overviewCalculator = new OverviewCalculator();
    this._overviewContainer = this.element.createChild('div', 'heap-overview-container');
    this._overviewGrid = new PerfUI.OverviewGrid.OverviewGrid('heap-recording', this._overviewCalculator);
    this._overviewGrid.element.classList.add('fill');
    this._overviewCanvas =
        (this._overviewContainer.createChild('canvas', 'heap-recording-overview-canvas') as HTMLCanvasElement);
    this._overviewContainer.appendChild(this._overviewGrid.element);
    this._overviewGrid.addEventListener(PerfUI.OverviewGrid.Events.WindowChanged, this._onWindowChanged, this);

    this._windowLeft = 0.0;
    this._windowRight = 1.0;
    this._overviewGrid.setWindow(this._windowLeft, this._windowRight);
    this._yScale = new SmoothScale();
    this._xScale = new SmoothScale();

    this._profileSamples = new Samples();
  }

  start(): void {
    this._running = true;
    const drawFrame = (): void => {
      this.update();
      if (this._running) {
        this.element.window().requestAnimationFrame(drawFrame);
      }
    };
    drawFrame();
  }

  stop(): void {
    this._running = false;
  }

  setSamples(samples: Samples): void {
    this._profileSamples = samples;
    if (!this._running) {
      this.update();
    }
  }

  _drawOverviewCanvas(width: number, height: number): void {
    if (!this._profileSamples) {
      return;
    }
    const profileSamples = this._profileSamples;
    const sizes = profileSamples.sizes;
    const topSizes = profileSamples.max;
    const timestamps = profileSamples.timestamps;
    const startTime = timestamps[0];

    const scaleFactor = this._xScale.nextScale(width / profileSamples.totalTime);
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

    const yScaleFactor = this._yScale.nextScale(maxSize ? height / (maxSize * 1.1) : 0.0);

    this._overviewCanvas.width = width * window.devicePixelRatio;
    this._overviewCanvas.height = height * window.devicePixelRatio;
    this._overviewCanvas.style.width = width + 'px';
    this._overviewCanvas.style.height = height + 'px';

    const maybeContext = this._overviewCanvas.getContext('2d');
    if (!maybeContext) {
      throw new Error('Failed to get canvas context');
    }
    const context = maybeContext;
    context.scale(window.devicePixelRatio, window.devicePixelRatio);

    if (this._running) {
      context.beginPath();
      context.lineWidth = 2;
      context.strokeStyle = 'rgba(192, 192, 192, 0.6)';
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
      context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
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
    context.strokeStyle = 'rgba(192, 192, 192, 0.6)';
    aggregateAndCall(topSizes, drawBarCallback);
    context.stroke();
    context.closePath();

    context.beginPath();
    context.lineWidth = 2;
    context.strokeStyle = 'rgba(0, 0, 192, 0.8)';
    aggregateAndCall(sizes, drawBarCallback);
    context.stroke();
    context.closePath();

    if (gridValue) {
      const label = Platform.NumberUtilities.bytesToString(gridValue);
      const labelPadding = 4;
      const labelX = 0;
      const labelY = gridY - 0.5;
      const labelWidth = 2 * labelPadding + context.measureText(label).width;
      context.beginPath();
      context.textBaseline = 'bottom';
      context.font = '10px ' + window.getComputedStyle(this.element, null).getPropertyValue('font-family');
      context.fillStyle = 'rgba(255, 255, 255, 0.75)';
      context.fillRect(labelX, labelY - gridLabelHeight, labelWidth, gridLabelHeight);
      context.fillStyle = 'rgb(64, 64, 64)';
      context.fillText(label, labelX + labelPadding, labelY);
      context.fill();
      context.closePath();
    }
  }

  onResize(): void {
    this._updateOverviewCanvas = true;
    this._scheduleUpdate();
  }

  _onWindowChanged(): void {
    if (!this._updateGridTimerId) {
      this._updateGridTimerId = setTimeout(this.updateGrid.bind(this), 10);
    }
  }

  _scheduleUpdate(): void {
    if (this._updateTimerId) {
      return;
    }
    this._updateTimerId = setTimeout(this.update.bind(this), 10);
  }

  _updateBoundaries(): void {
    this._windowLeft = this._overviewGrid.windowLeft();
    this._windowRight = this._overviewGrid.windowRight();
    this._windowWidth = this._windowRight - this._windowLeft;
  }

  update(): void {
    this._updateTimerId = null;
    if (!this.isShowing()) {
      return;
    }
    this._updateBoundaries();
    this._overviewCalculator._updateBoundaries(this);
    this._overviewGrid.updateDividers(this._overviewCalculator);
    this._drawOverviewCanvas(this._overviewContainer.clientWidth, this._overviewContainer.clientHeight - 20);
  }

  updateGrid(): void {
    this._updateGridTimerId = 0;
    this._updateBoundaries();
    const ids = this._profileSamples.ids;
    if (!ids.length) {
      return;
    }
    const timestamps = this._profileSamples.timestamps;
    const sizes = this._profileSamples.sizes;
    const startTime = timestamps[0];
    const totalTime = this._profileSamples.totalTime;
    const timeLeft = startTime + totalTime * this._windowLeft;
    const timeRight = startTime + totalTime * this._windowRight;
    const minIndex =
        Platform.ArrayUtilities.lowerBound(timestamps, timeLeft, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
    const maxIndex =
        Platform.ArrayUtilities.upperBound(timestamps, timeRight, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
    let size = 0;
    for (let i = minIndex; i <= maxIndex; ++i) {
      size += sizes[i];
    }
    const minId = minIndex > 0 ? ids[minIndex - 1] : 0;
    const maxId = maxIndex < ids.length ? ids[maxIndex] : Infinity;

    this.dispatchEventToListeners(IdsRangeChanged, {minId, maxId, size});
  }
}

export const IdsRangeChanged = Symbol('IdsRangeChanged');

export class SmoothScale {
  _lastUpdate: number;
  _currentScale: number;
  constructor() {
    this._lastUpdate = 0;
    this._currentScale = 0.0;
  }

  nextScale(target: number): number {
    target = target || this._currentScale;
    if (this._currentScale) {
      const now = Date.now();
      const timeDeltaMs = now - this._lastUpdate;
      this._lastUpdate = now;
      const maxChangePerSec = 20;
      const maxChangePerDelta = Math.pow(maxChangePerSec, timeDeltaMs / 1000);
      const scaleChange = target / this._currentScale;
      this._currentScale *= Platform.NumberUtilities.clamp(scaleChange, 1 / maxChangePerDelta, maxChangePerDelta);
    } else {
      this._currentScale = target;
    }
    return this._currentScale;
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
  _maximumBoundaries: number;
  _minimumBoundaries: number;
  _xScaleFactor: number;
  constructor() {
    this._maximumBoundaries = 0;
    this._minimumBoundaries = 0;
    this._xScaleFactor = 0;
  }

  _updateBoundaries(chart: HeapTimelineOverview): void {
    this._minimumBoundaries = 0;
    this._maximumBoundaries = chart._profileSamples.totalTime;
    this._xScaleFactor = chart._overviewContainer.clientWidth / this._maximumBoundaries;
  }

  computePosition(time: number): number {
    return (time - this._minimumBoundaries) * this._xScaleFactor;
  }

  formatValue(value: number, precision?: number): string {
    return Number.secondsToString(value / 1000, Boolean(precision));
  }

  maximumBoundary(): number {
    return this._maximumBoundaries;
  }

  minimumBoundary(): number {
    return this._minimumBoundaries;
  }

  zeroTime(): number {
    return this._minimumBoundaries;
  }

  boundarySpan(): number {
    return this._maximumBoundaries - this._minimumBoundaries;
  }
}

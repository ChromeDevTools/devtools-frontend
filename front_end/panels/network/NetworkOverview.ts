// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import * as Trace from '../../models/trace/trace.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import {NetworkLogView} from './NetworkLogView.js';

export class NetworkOverview extends PerfUI.TimelineOverviewPane.TimelineOverviewBase {
  private selectedFilmStripTime: number;
  private numBands: number;
  private highlightedRequest: SDK.NetworkRequest.NetworkRequest|null;
  private loadEvents!: number[];
  private domContentLoadedEvents!: number[];
  private nextBand!: number;
  private bandMap!: Map<string, number>;
  private requestsList!: SDK.NetworkRequest.NetworkRequest[];
  private requestsSet!: Set<SDK.NetworkRequest.NetworkRequest>;
  private span!: number;
  private lastBoundary?: NetworkTimeCalculator.NetworkTimeBoundary|null;

  constructor() {
    super();
    this.selectedFilmStripTime = -1;
    this.element.classList.add('network-overview');

    this.numBands = 1;
    this.highlightedRequest = null;

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.Load, this.loadEventFired, this,
        {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.DOMContentLoaded,
        this.domContentLoadedEventFired, this, {scoped: true});

    this.reset();
  }

  setHighlightedRequest(request: SDK.NetworkRequest.NetworkRequest|null): void {
    this.highlightedRequest = request;
    this.scheduleUpdate();
  }

  selectFilmStripFrame(time: number): void {
    this.selectedFilmStripTime = time;
    this.scheduleUpdate();
  }

  clearFilmStripFrame(): void {
    this.selectedFilmStripTime = -1;
    this.scheduleUpdate();
  }

  private loadEventFired(
      event: Common.EventTarget
          .EventTargetEvent<{resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel, loadTime: number}>): void {
    const time = event.data.loadTime;
    if (time) {
      this.loadEvents.push(time * 1000);
    }
    this.scheduleUpdate();
  }

  private domContentLoadedEventFired(event: Common.EventTarget.EventTargetEvent<number>): void {
    const {data} = event;
    if (data) {
      this.domContentLoadedEvents.push(data * 1000);
    }
    this.scheduleUpdate();
  }

  private bandId(connectionId: string): number {
    if (!connectionId || connectionId === '0') {
      return -1;
    }
    if (this.bandMap.has(connectionId)) {
      return this.bandMap.get(connectionId) as number;
    }
    const result = this.nextBand++;
    this.bandMap.set(connectionId, result);
    return result;
  }

  updateRequest(request: SDK.NetworkRequest.NetworkRequest): void {
    if (!this.requestsSet.has(request)) {
      this.requestsSet.add(request);
      this.requestsList.push(request);
    }
    this.scheduleUpdate();
  }

  override wasShown(): void {
    this.onResize();
  }

  override calculator(): PerfUI.TimelineOverviewCalculator.TimelineOverviewCalculator {
    return super.calculator() as PerfUI.TimelineOverviewCalculator.TimelineOverviewCalculator;
  }

  override onResize(): void {
    const width = this.element.offsetWidth;
    const height = this.element.offsetHeight;
    this.calculator().setDisplayWidth(width);
    this.resetCanvas();
    const numBands = (((height - PADDING - 1) / BAND_HEIGHT) - 1) | 0;
    this.numBands = (numBands > 0) ? numBands : 1;
    this.scheduleUpdate();
  }

  override reset(): void {
    this.span = 1;
    this.lastBoundary = null;
    this.nextBand = 0;
    this.bandMap = new Map();
    this.requestsList = [];
    this.requestsSet = new Set();
    this.loadEvents = [];
    this.domContentLoadedEvents = [];

    // Clear screen.
    this.resetCanvas();
  }

  scheduleUpdate(): void {
    if (!this.isShowing()) {
      return;
    }
    void RenderCoordinator.write('NetworkOverview.render', this.update.bind(this));
  }

  override update(): void {
    const calculator = this.calculator();

    const newBoundary =
        new NetworkTimeCalculator.NetworkTimeBoundary(calculator.minimumBoundary(), calculator.maximumBoundary());
    if (!this.lastBoundary || !newBoundary.equals(this.lastBoundary)) {
      const span = calculator.boundarySpan();
      while (this.span < span) {
        this.span *= 1.25;
      }

      calculator.setBounds(
          calculator.minimumBoundary(), Trace.Types.Timing.Milli(calculator.minimumBoundary() + this.span));

      this.lastBoundary =
          new NetworkTimeCalculator.NetworkTimeBoundary(calculator.minimumBoundary(), calculator.maximumBoundary());
    }

    const context = this.context();
    const linesByType = new Map<string, number[]>();
    const paddingTop = PADDING;

    function drawLines(type: string): void {
      const lines = linesByType.get(type);
      if (!lines) {
        return;
      }
      const n = lines.length;
      context.beginPath();
      context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background-opacity-80');
      context.lineWidth = BORDER_WIDTH;
      context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue(RequestTimeRangeNameToColor[type]);
      for (let i = 0; i < n;) {
        const y = lines[i++] * BAND_HEIGHT + paddingTop;
        const startTime = lines[i++];
        let endTime: number = lines[i++];
        if (endTime === Number.MAX_VALUE) {
          endTime = calculator.maximumBoundary();
        }
        const startX = calculator.computePosition(Trace.Types.Timing.Milli(startTime));
        const endX = calculator.computePosition(Trace.Types.Timing.Milli(endTime)) + 1;
        context.fillRect(startX, y, Math.max(endX - startX, MIN_BAND_WIDTH), BAND_HEIGHT);
        context.strokeRect(startX, y, Math.max(endX - startX, MIN_BAND_WIDTH), BAND_HEIGHT);
      }
    }

    function addLine(type: string, y: number, start: number, end: number): void {
      let lines = linesByType.get(type);
      if (!lines) {
        lines = [];
        linesByType.set(type, lines);
      }
      lines.push(y, start, end);
    }

    const requests = this.requestsList;
    const n = requests.length;
    for (let i = 0; i < n; ++i) {
      const request = requests[i];
      const band = this.bandId(request.connectionId);
      const y = (band === -1) ? 0 : (band % this.numBands + 1);
      const timeRanges = NetworkTimeCalculator.calculateRequestTimeRanges(request, this.calculator().minimumBoundary());
      for (let j = 0; j < timeRanges.length; ++j) {
        const type = timeRanges[j].name;
        if (band !== -1 || type === NetworkTimeCalculator.RequestTimeRangeNames.TOTAL) {
          addLine(type, y, timeRanges[j].start * 1000, timeRanges[j].end * 1000);
        }
      }
    }

    context.clearRect(0, 0, this.width(), this.height());
    context.save();
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
    context.lineWidth = 2;
    drawLines(NetworkTimeCalculator.RequestTimeRangeNames.TOTAL);
    drawLines(NetworkTimeCalculator.RequestTimeRangeNames.BLOCKING);
    drawLines(NetworkTimeCalculator.RequestTimeRangeNames.CONNECTING);
    drawLines(NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER);
    drawLines(NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_PREPARATION);
    drawLines(NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_RESPOND_WITH);
    drawLines(NetworkTimeCalculator.RequestTimeRangeNames.PUSH);
    drawLines(NetworkTimeCalculator.RequestTimeRangeNames.PROXY);
    drawLines(NetworkTimeCalculator.RequestTimeRangeNames.DNS);
    drawLines(NetworkTimeCalculator.RequestTimeRangeNames.SSL);
    drawLines(NetworkTimeCalculator.RequestTimeRangeNames.SENDING);
    drawLines(NetworkTimeCalculator.RequestTimeRangeNames.WAITING);
    drawLines(NetworkTimeCalculator.RequestTimeRangeNames.RECEIVING);

    if (this.highlightedRequest) {
      const size = 5;
      const borderSize = 2;

      const request = this.highlightedRequest;
      const band = this.bandId(request.connectionId);
      const y = ((band === -1) ? 0 : (band % this.numBands + 1)) * BAND_HEIGHT + paddingTop;
      const timeRanges = NetworkTimeCalculator.calculateRequestTimeRanges(request, this.calculator().minimumBoundary());

      context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-tonal-container');

      // The network overview works in seconds, but the calcululator deals in
      // milliseconds, hence the multiplication by 1000.
      const start = Trace.Types.Timing.Milli(timeRanges[0].start * 1000);
      const end = Trace.Types.Timing.Milli(timeRanges[0].end * 1000);
      context.fillRect(
          calculator.computePosition(start) - borderSize, y - size / 2 - borderSize,
          calculator.computePosition(end) - calculator.computePosition(start) + 1 + 2 * borderSize, size * borderSize);

      for (let j = 0; j < timeRanges.length; ++j) {
        const type = timeRanges[j].name;
        if (band !== -1 || type === NetworkTimeCalculator.RequestTimeRangeNames.TOTAL) {
          context.beginPath();
          context.strokeStyle =
              ThemeSupport.ThemeSupport.instance().getComputedValue(RequestTimeRangeNameToColor[type]);
          context.lineWidth = size;

          const start = Trace.Types.Timing.Milli(timeRanges[j].start * 1000);
          const end = Trace.Types.Timing.Milli(timeRanges[j].end * 1000);
          context.moveTo(Number(calculator.computePosition(start)) - 0, y);
          context.lineTo(Number(calculator.computePosition(end)) + 1, y);
          context.stroke();
        }
      }
    }

    const height = this.element.offsetHeight;
    context.lineWidth = 1;
    context.beginPath();
    context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue(NetworkLogView.getDCLEventColor());
    for (let i = this.domContentLoadedEvents.length - 1; i >= 0; --i) {
      const position = calculator.computePosition(Trace.Types.Timing.Milli(this.domContentLoadedEvents[i]));
      const x = Math.round(position) + 0.5;
      context.moveTo(x, 0);
      context.lineTo(x, height);
    }
    context.stroke();

    context.beginPath();
    context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue(NetworkLogView.getLoadEventColor());
    for (let i = this.loadEvents.length - 1; i >= 0; --i) {
      const position = calculator.computePosition(Trace.Types.Timing.Milli(this.loadEvents[i]));
      const x = Math.round(position) + 0.5;
      context.moveTo(x, 0);
      context.lineTo(x, height);
    }
    context.stroke();

    if (this.selectedFilmStripTime !== -1) {
      context.lineWidth = 2;
      context.beginPath();
      context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--network-frame-divider-color');
      const timeInMilliseconds = Trace.Types.Timing.Milli(this.selectedFilmStripTime);
      const x = Math.round(calculator.computePosition(timeInMilliseconds));
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    context.restore();
  }
}

export const RequestTimeRangeNameToColor = {
  [NetworkTimeCalculator.RequestTimeRangeNames.TOTAL]: '--network-overview-total',
  [NetworkTimeCalculator.RequestTimeRangeNames.BLOCKING]: '--network-overview-blocking',
  [NetworkTimeCalculator.RequestTimeRangeNames.CONNECTING]: '--network-overview-connecting',
  [NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER]: '--network-overview-service-worker',
  [NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_PREPARATION]: '--network-overview-service-worker',
  [NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_RESPOND_WITH]:
      '--network-overview-service-worker-respond-with',
  [NetworkTimeCalculator.RequestTimeRangeNames.PUSH]: '--network-overview-push',
  [NetworkTimeCalculator.RequestTimeRangeNames.PROXY]: '--override-network-overview-proxy',
  [NetworkTimeCalculator.RequestTimeRangeNames.DNS]: '--network-overview-dns',
  [NetworkTimeCalculator.RequestTimeRangeNames.SSL]: '--network-overview-ssl',
  [NetworkTimeCalculator.RequestTimeRangeNames.SENDING]: '--override-network-overview-sending',
  [NetworkTimeCalculator.RequestTimeRangeNames.WAITING]: '--network-overview-waiting',
  [NetworkTimeCalculator.RequestTimeRangeNames.RECEIVING]: '--network-overview-receiving',
  [NetworkTimeCalculator.RequestTimeRangeNames.QUEUEING]: '--network-overview-queueing',
} as Record<string, string>;

const BAND_HEIGHT = 3;
const PADDING = 5;

// Minimum rectangle width for very short requests.
const MIN_BAND_WIDTH = 10;

// Border between bars in network overview panel for accessibility.
const BORDER_WIDTH = 1;

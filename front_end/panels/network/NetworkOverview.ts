// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TraceEngine from '../../models/trace/trace.js';
import * as Coordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import {NetworkLogView} from './NetworkLogView.js';
import {NetworkTimeBoundary} from './NetworkTimeCalculator.js';
import {RequestTimeRangeNames, RequestTimingView} from './RequestTimingView.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

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
  private lastBoundary?: NetworkTimeBoundary|null;

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
    const numBands = (((height - _padding - 1) / _bandHeight) - 1) | 0;
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
    void coordinator.write('NetworkOverview.render', this.update.bind(this));
  }

  override update(): void {
    const calculator = this.calculator();

    const newBoundary = new NetworkTimeBoundary(calculator.minimumBoundary(), calculator.maximumBoundary());
    if (!this.lastBoundary || !newBoundary.equals(this.lastBoundary)) {
      const span = calculator.boundarySpan();
      while (this.span < span) {
        this.span *= 1.25;
      }

      calculator.setBounds(
          calculator.minimumBoundary(),
          TraceEngine.Types.Timing.MilliSeconds(calculator.minimumBoundary() + this.span));

      this.lastBoundary = new NetworkTimeBoundary(calculator.minimumBoundary(), calculator.maximumBoundary());
    }

    const context = this.context();
    const linesByType = new Map<string, number[]>();
    const paddingTop = _padding;

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
        const y = lines[i++] * _bandHeight + paddingTop;
        const startTime = lines[i++];
        let endTime: number = lines[i++];
        if (endTime === Number.MAX_VALUE) {
          endTime = calculator.maximumBoundary();
        }
        const startX = calculator.computePosition(TraceEngine.Types.Timing.MilliSeconds(startTime));
        const endX = calculator.computePosition(TraceEngine.Types.Timing.MilliSeconds(endTime)) + 1;
        context.fillRect(startX, y, endX - startX, _bandHeight);
        context.strokeRect(startX, y, endX - startX, _bandHeight);
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
      const timeRanges = RequestTimingView.calculateRequestTimeRanges(request, this.calculator().minimumBoundary());
      for (let j = 0; j < timeRanges.length; ++j) {
        const type = timeRanges[j].name;
        if (band !== -1 || type === RequestTimeRangeNames.Total) {
          addLine(type, y, timeRanges[j].start * 1000, timeRanges[j].end * 1000);
        }
      }
    }

    context.clearRect(0, 0, this.width(), this.height());
    context.save();
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
    context.lineWidth = 2;
    drawLines(RequestTimeRangeNames.Total);
    drawLines(RequestTimeRangeNames.Blocking);
    drawLines(RequestTimeRangeNames.Connecting);
    drawLines(RequestTimeRangeNames.ServiceWorker);
    drawLines(RequestTimeRangeNames.ServiceWorkerPreparation);
    drawLines(RequestTimeRangeNames.ServiceWorkerRespondWith);
    drawLines(RequestTimeRangeNames.Push);
    drawLines(RequestTimeRangeNames.Proxy);
    drawLines(RequestTimeRangeNames.DNS);
    drawLines(RequestTimeRangeNames.SSL);
    drawLines(RequestTimeRangeNames.Sending);
    drawLines(RequestTimeRangeNames.Waiting);
    drawLines(RequestTimeRangeNames.Receiving);

    if (this.highlightedRequest) {
      const size = 5;
      const borderSize = 2;

      const request = this.highlightedRequest;
      const band = this.bandId(request.connectionId);
      const y = ((band === -1) ? 0 : (band % this.numBands + 1)) * _bandHeight + paddingTop;
      const timeRanges = RequestTimingView.calculateRequestTimeRanges(request, this.calculator().minimumBoundary());

      context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-tonal-container');

      // The network overview works in seconds, but the calcululator deals in
      // milliseconds, hence the multiplication by 1000.
      const start = TraceEngine.Types.Timing.MilliSeconds(timeRanges[0].start * 1000);
      const end = TraceEngine.Types.Timing.MilliSeconds(timeRanges[0].end * 1000);
      context.fillRect(
          calculator.computePosition(start) - borderSize, y - size / 2 - borderSize,
          calculator.computePosition(end) - calculator.computePosition(start) + 1 + 2 * borderSize, size * borderSize);

      for (let j = 0; j < timeRanges.length; ++j) {
        const type = timeRanges[j].name;
        if (band !== -1 || type === RequestTimeRangeNames.Total) {
          context.beginPath();
          context.strokeStyle =
              ThemeSupport.ThemeSupport.instance().getComputedValue(RequestTimeRangeNameToColor[type]);
          context.lineWidth = size;

          const start = TraceEngine.Types.Timing.MilliSeconds(timeRanges[j].start * 1000);
          const end = TraceEngine.Types.Timing.MilliSeconds(timeRanges[j].end * 1000);
          context.moveTo(calculator.computePosition(start) - 0, y);
          context.lineTo(calculator.computePosition(end) + 1, y);
          context.stroke();
        }
      }
    }

    const height = this.element.offsetHeight;
    context.lineWidth = 1;
    context.beginPath();
    context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue(NetworkLogView.getDCLEventColor());
    for (let i = this.domContentLoadedEvents.length - 1; i >= 0; --i) {
      const position =
          calculator.computePosition(TraceEngine.Types.Timing.MilliSeconds(this.domContentLoadedEvents[i]));
      const x = Math.round(position) + 0.5;
      context.moveTo(x, 0);
      context.lineTo(x, height);
    }
    context.stroke();

    context.beginPath();
    context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue(NetworkLogView.getLoadEventColor());
    for (let i = this.loadEvents.length - 1; i >= 0; --i) {
      const position = calculator.computePosition(TraceEngine.Types.Timing.MilliSeconds(this.loadEvents[i]));
      const x = Math.round(position) + 0.5;
      context.moveTo(x, 0);
      context.lineTo(x, height);
    }
    context.stroke();

    if (this.selectedFilmStripTime !== -1) {
      context.lineWidth = 2;
      context.beginPath();
      context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--network-frame-divider-color');
      const timeInMilliseconds = TraceEngine.Types.Timing.MilliSeconds(this.selectedFilmStripTime);
      const x = Math.round(calculator.computePosition(timeInMilliseconds));
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    context.restore();
  }
}

export const RequestTimeRangeNameToColor = {
  [RequestTimeRangeNames.Total]: '--network-overview-total',
  [RequestTimeRangeNames.Blocking]: '--network-overview-blocking',
  [RequestTimeRangeNames.Connecting]: '--network-overview-connecting',
  [RequestTimeRangeNames.ServiceWorker]: '--network-overview-service-worker',
  [RequestTimeRangeNames.ServiceWorkerPreparation]: '--network-overview-service-worker',
  [RequestTimeRangeNames.ServiceWorkerRespondWith]: '--network-overview-service-worker-respond-with',
  [RequestTimeRangeNames.Push]: '--network-overview-push',
  [RequestTimeRangeNames.Proxy]: '--override-network-overview-proxy',
  [RequestTimeRangeNames.DNS]: '--network-overview-dns',
  [RequestTimeRangeNames.SSL]: '--network-overview-ssl',
  [RequestTimeRangeNames.Sending]: '--override-network-overview-sending',
  [RequestTimeRangeNames.Waiting]: '--network-overview-waiting',
  [RequestTimeRangeNames.Receiving]: '--network-overview-receiving',
  [RequestTimeRangeNames.Queueing]: '--network-overview-queueing',
} as {[key: string]: string};

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
// eslint-disable-next-line @typescript-eslint/naming-convention
export const _bandHeight: number = 3;

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
// eslint-disable-next-line @typescript-eslint/naming-convention
export const _padding: number = 5;

// Border between bars in network overview panel for accessibility.
const BORDER_WIDTH = 1;

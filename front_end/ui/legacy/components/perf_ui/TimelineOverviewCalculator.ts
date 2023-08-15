// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../../core/i18n/i18n.js';
import * as TraceEngine from '../../../../models/trace/trace.js';

import {type Calculator} from './TimelineGrid.js';

export class TimelineOverviewCalculator implements Calculator {
  #minimumBoundary: TraceEngine.Types.Timing.MilliSeconds = TraceEngine.Types.Timing.MilliSeconds(0);
  #maximumBoundary: TraceEngine.Types.Timing.MilliSeconds = TraceEngine.Types.Timing.MilliSeconds(100);

  private workingArea!: number;
  private navStartTimes?: readonly TraceEngine.Types.TraceEvents.TraceEventNavigationStart[];

  computePosition(time: TraceEngine.Types.Timing.MilliSeconds): number {
    return (time - this.#minimumBoundary) / this.boundarySpan() * this.workingArea;
  }

  positionToTime(position: number): number {
    return position / this.workingArea * this.boundarySpan() + this.#minimumBoundary;
  }

  setBounds(
      minimumBoundary: TraceEngine.Types.Timing.MilliSeconds,
      maximumBoundary: TraceEngine.Types.Timing.MilliSeconds): void {
    this.#minimumBoundary = minimumBoundary;
    this.#maximumBoundary = maximumBoundary;
  }

  setNavStartTimes(navStartTimes: readonly TraceEngine.Types.TraceEvents.TraceEventNavigationStart[]): void {
    this.navStartTimes = navStartTimes;
  }

  setDisplayWidth(clientWidth: number): void {
    this.workingArea = clientWidth;
  }

  reset(): void {
    this.setBounds(
        TraceEngine.Types.Timing.MilliSeconds(0),
        TraceEngine.Types.Timing.MilliSeconds(100),
    );
  }

  formatValue(value: number, precision?: number): string {
    // If there are nav start times the value needs to be remapped.
    if (this.navStartTimes) {
      // Find the latest possible nav start time which is considered earlier
      // than the value passed through.
      for (let i = this.navStartTimes.length - 1; i >= 0; i--) {
        const startTimeMilliseconds = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(
            this.navStartTimes[i].ts,
        );

        if (value > startTimeMilliseconds) {
          value -= (startTimeMilliseconds - this.zeroTime());
          break;
        }
      }
    }

    return i18n.TimeUtilities.preciseMillisToString(value - this.zeroTime(), precision);
  }

  maximumBoundary(): TraceEngine.Types.Timing.MilliSeconds {
    return this.#maximumBoundary;
  }

  minimumBoundary(): TraceEngine.Types.Timing.MilliSeconds {
    return this.#minimumBoundary;
  }

  zeroTime(): TraceEngine.Types.Timing.MilliSeconds {
    return this.#minimumBoundary;
  }

  boundarySpan(): TraceEngine.Types.Timing.MilliSeconds {
    return TraceEngine.Types.Timing.MilliSeconds(this.#maximumBoundary - this.#minimumBoundary);
  }
}

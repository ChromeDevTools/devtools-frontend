// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Trace from '../../../../models/trace/trace.js';

import {type Calculator} from './TimelineGrid.js';

export class TimelineOverviewCalculator implements Calculator {
  #minimumBoundary: Trace.Types.Timing.MilliSeconds = Trace.Types.Timing.MilliSeconds(0);
  #maximumBoundary: Trace.Types.Timing.MilliSeconds = Trace.Types.Timing.MilliSeconds(100);

  private workingArea!: number;
  private navStartTimes?: readonly Trace.Types.Events.NavigationStart[];

  computePosition(time: Trace.Types.Timing.MilliSeconds): number {
    return (time - this.#minimumBoundary) / this.boundarySpan() * this.workingArea;
  }

  positionToTime(position: number): number {
    return position / this.workingArea * this.boundarySpan() + this.#minimumBoundary;
  }

  setBounds(minimumBoundary: Trace.Types.Timing.MilliSeconds, maximumBoundary: Trace.Types.Timing.MilliSeconds): void {
    this.#minimumBoundary = minimumBoundary;
    this.#maximumBoundary = maximumBoundary;
  }

  setNavStartTimes(navStartTimes: readonly Trace.Types.Events.NavigationStart[]): void {
    this.navStartTimes = navStartTimes;
  }

  setDisplayWidth(clientWidth: number): void {
    this.workingArea = clientWidth;
  }

  reset(): void {
    this.setBounds(
        Trace.Types.Timing.MilliSeconds(0),
        Trace.Types.Timing.MilliSeconds(100),
    );
  }

  formatValue(value: number, precision?: number): string {
    // If there are nav start times the value needs to be remapped.
    if (this.navStartTimes) {
      // Find the latest possible nav start time which is considered earlier
      // than the value passed through.
      for (let i = this.navStartTimes.length - 1; i >= 0; i--) {
        const startTimeMilliseconds = Trace.Helpers.Timing.microSecondsToMilliseconds(
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

  maximumBoundary(): Trace.Types.Timing.MilliSeconds {
    return this.#maximumBoundary;
  }

  minimumBoundary(): Trace.Types.Timing.MilliSeconds {
    return this.#minimumBoundary;
  }

  zeroTime(): Trace.Types.Timing.MilliSeconds {
    return this.#minimumBoundary;
  }

  boundarySpan(): Trace.Types.Timing.MilliSeconds {
    return Trace.Types.Timing.MilliSeconds(this.#maximumBoundary - this.#minimumBoundary);
  }
}

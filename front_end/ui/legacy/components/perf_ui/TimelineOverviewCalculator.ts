// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Trace from '../../../../models/trace/trace.js';

import type {Calculator} from './TimelineGrid.js';

export class TimelineOverviewCalculator implements Calculator {
  #minimumBoundary: Trace.Types.Timing.MilliSeconds = Trace.Types.Timing.MilliSeconds(0);
  #maximumBoundary: Trace.Types.Timing.MilliSeconds = Trace.Types.Timing.MilliSeconds(100);

  #displayWidth: number = 0;
  private navStartTimes?: readonly Trace.Types.Events.NavigationStart[];

  /**
   * Given a timestamp, returns its x position in the minimap.
   *
   * @param time
   * @returns position in pixel
   */
  computePosition(time: Trace.Types.Timing.MilliSeconds): number {
    return (time - this.#minimumBoundary) / this.boundarySpan() * this.#displayWidth;
  }

  positionToTime(position: number): Trace.Types.Timing.MilliSeconds {
    if (this.#displayWidth === 0) {
      return Trace.Types.Timing.MilliSeconds(0);
    }
    return Trace.Types.Timing.MilliSeconds(position / this.#displayWidth * this.boundarySpan() + this.#minimumBoundary);
  }

  setBounds(minimumBoundary: Trace.Types.Timing.MilliSeconds, maximumBoundary: Trace.Types.Timing.MilliSeconds): void {
    this.#minimumBoundary = minimumBoundary;
    this.#maximumBoundary = maximumBoundary;
  }

  setNavStartTimes(navStartTimes: readonly Trace.Types.Events.NavigationStart[]): void {
    this.navStartTimes = navStartTimes;
  }

  setDisplayWidth(clientWidth: number): void {
    this.#displayWidth = clientWidth;
  }

  reset(): void {
    this.setBounds(
        Trace.Types.Timing.MilliSeconds(0),
        Trace.Types.Timing.MilliSeconds(100),
    );
  }

  formatValue(time: Trace.Types.Timing.MilliSeconds, precision?: number): string {
    // If there are nav start times the value needs to be remapped.
    if (this.navStartTimes) {
      // Find the latest possible nav start time which is considered earlier
      // than the value passed through.
      for (let i = this.navStartTimes.length - 1; i >= 0; i--) {
        const startTimeMilliseconds = Trace.Helpers.Timing.microSecondsToMilliseconds(
            this.navStartTimes[i].ts,
        );

        if (time > startTimeMilliseconds) {
          time = Trace.Types.Timing.MilliSeconds(time - (startTimeMilliseconds - this.zeroTime()));
          break;
        }
      }
    }

    return i18n.TimeUtilities.preciseMillisToString(time - this.zeroTime(), precision);
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

  /**
   * This function returns the time different between min time and max time of current minimap.
   *
   * @returns the time range in milliseconds
   */
  boundarySpan(): Trace.Types.Timing.MilliSeconds {
    return Trace.Types.Timing.MilliSeconds(this.#maximumBoundary - this.#minimumBoundary);
  }
}

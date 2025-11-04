// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Trace from '../../../../models/trace/trace.js';
export class TimelineOverviewCalculator {
    #minimumBoundary = Trace.Types.Timing.Milli(0);
    #maximumBoundary = Trace.Types.Timing.Milli(100);
    #displayWidth = 0;
    navStartTimes;
    /**
     * Given a timestamp, returns its x position in the minimap.
     *
     * @param time
     * @returns position in pixel
     */
    computePosition(time) {
        return (time - this.#minimumBoundary) / this.boundarySpan() * this.#displayWidth;
    }
    positionToTime(position) {
        if (this.#displayWidth === 0) {
            return Trace.Types.Timing.Milli(0);
        }
        return Trace.Types.Timing.Milli(position / this.#displayWidth * this.boundarySpan() + this.#minimumBoundary);
    }
    setBounds(minimumBoundary, maximumBoundary) {
        this.#minimumBoundary = minimumBoundary;
        this.#maximumBoundary = maximumBoundary;
    }
    setNavStartTimes(navStartTimes) {
        this.navStartTimes = navStartTimes;
    }
    setDisplayWidth(clientWidth) {
        this.#displayWidth = clientWidth;
    }
    reset() {
        this.setBounds(Trace.Types.Timing.Milli(0), Trace.Types.Timing.Milli(100));
    }
    formatValue(time, precision) {
        // If there are nav start times the value needs to be remapped.
        if (this.navStartTimes) {
            // Find the latest possible nav start time which is considered earlier
            // than the value passed through.
            for (let i = this.navStartTimes.length - 1; i >= 0; i--) {
                const startTimeMilliseconds = Trace.Helpers.Timing.microToMilli(this.navStartTimes[i].ts);
                if (time > startTimeMilliseconds) {
                    time = Trace.Types.Timing.Milli(time - (startTimeMilliseconds - this.zeroTime()));
                    break;
                }
            }
        }
        return i18n.TimeUtilities.preciseMillisToString(time - this.zeroTime(), precision);
    }
    maximumBoundary() {
        return this.#maximumBoundary;
    }
    minimumBoundary() {
        return this.#minimumBoundary;
    }
    zeroTime() {
        return this.#minimumBoundary;
    }
    /**
     * This function returns the time different between min time and max time of current minimap.
     *
     * @returns the time range in milliseconds
     */
    boundarySpan() {
        return Trace.Types.Timing.Milli(this.#maximumBoundary - this.#minimumBoundary);
    }
}
//# sourceMappingURL=TimelineOverviewCalculator.js.map
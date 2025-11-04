// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export function formatMillisecondsToSeconds(ms, decimalPlaces) {
    const roundPower = Math.pow(10, 3 - decimalPlaces);
    const denominatorPower = Math.pow(10, Math.max(0, decimalPlaces));
    return `${Math.round(ms / roundPower) / denominatorPower} s`;
}
/**
 * Manage the bounding box properties for the ticking flame chart.
 * kept in a separate file for unit testing.
 */
export class Bounds {
    #min;
    #max;
    #low;
    #high;
    maxRange;
    minRange;
    constructor(initialLow, initialHigh, maxRange, minRange) {
        this.#min = initialLow;
        this.#max = initialHigh;
        this.#low = this.#min;
        this.#high = this.#max;
        this.maxRange = maxRange;
        this.minRange = minRange;
    }
    get low() {
        return this.#low;
    }
    get high() {
        return this.#high;
    }
    get min() {
        return this.#min;
    }
    get max() {
        return this.#max;
    }
    get range() {
        return this.#high - this.#low;
    }
    reassertBounds() {
        let needsAdjustment = true;
        while (needsAdjustment) {
            needsAdjustment = false;
            if (this.range < this.minRange) {
                needsAdjustment = true;
                const delta = (this.minRange - this.range) / 2;
                this.#high += delta;
                this.#low -= delta;
            }
            if (this.#low < this.#min) {
                needsAdjustment = true;
                this.#low = this.#min;
            }
            if (this.#high > this.#max) {
                needsAdjustment = true;
                this.#high = this.#max;
            }
        }
    }
    /**
     * zoom out |amount| ticks at position [0, 1] along the current range of the timeline.
     */
    zoomOut(amount, position) {
        const range = this.#high - this.#low;
        const growSize = range * Math.pow(1.1, amount) - range;
        const lowEnd = growSize * position;
        const highEnd = growSize - lowEnd;
        this.#low -= lowEnd;
        this.#high += highEnd;
        this.reassertBounds();
    }
    /**
     * zoom in |amount| ticks at position [0, 1] along the current range of the timeline.
     */
    zoomIn(amount, position) {
        const range = this.#high - this.#low;
        if (this.range <= this.minRange) {
            return;
        }
        const shrinkSize = range - range / Math.pow(1.1, amount);
        const lowEnd = shrinkSize * position;
        const highEnd = shrinkSize - lowEnd;
        this.#low += lowEnd;
        this.#high -= highEnd;
        this.reassertBounds();
    }
    /**
     * Add Xms to the max value, and scroll the timeline forward if the end is in sight.
     */
    addMax(amount) {
        const range = this.#high - this.#low;
        const isAtHighEnd = this.#high === this.#max;
        const isZoomedOut = this.#low === this.#min || range >= this.maxRange;
        this.#max += amount;
        if (isAtHighEnd && isZoomedOut) {
            this.#high = this.#max;
        }
        this.reassertBounds();
    }
    /**
     * Attempt to push the maximum time up to |time| ms.
     */
    pushMaxAtLeastTo(time) {
        if (this.#max < time) {
            this.addMax(time - this.#max);
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=TickingFlameChartHelpers.js.map
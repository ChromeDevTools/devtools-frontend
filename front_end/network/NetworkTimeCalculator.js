/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008, 2009 Anthony Ricaud <rik@webkit.org>
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as PerfUI from '../perf_ui/perf_ui.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';             // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Latency download total format in Network Time Calculator of the Network panel
  *@example {20ms} PH1
  *@example {20ms} PH2
  *@example {40ms} PH3
  */
  sLatencySDownloadSTotal: '{PH1} latency, {PH2} download ({PH3} total)',
  /**
  *@description Latency format in Network Time Calculator of the Network panel
  *@example {20ms} PH1
  */
  sLatency: '{PH1} latency',
  /**
  *@description Download format in Network Time Calculator of the Network panel
  *@example {5} PH1
  */
  sDownload: '{PH1} download',
  /**
  *@description From service worker format in Network Time Calculator of the Network panel
  *@example {20ms latency} PH1
  */
  sFromServiceworker: '{PH1} (from `ServiceWorker`)',
  /**
  *@description From cache format in Network Time Calculator of the Network panel
  *@example {20ms latency} PH1
  */
  sFromCache: '{PH1} (from cache)',
};
const str_ = i18n.i18n.registerUIStrings('network/NetworkTimeCalculator.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class NetworkTimeBoundary {
  /**
   * @param {number} minimum
   * @param {number} maximum
   */
  constructor(minimum, maximum) {
    this.minimum = minimum;
    this.maximum = maximum;
  }

  /**
   * @param {!NetworkTimeBoundary} other
   * @return {boolean}
   */
  equals(other) {
    return (this.minimum === other.minimum) && (this.maximum === other.maximum);
  }
}

/**
 * @implements {PerfUI.TimelineGrid.Calculator}
 */
export class NetworkTimeCalculator extends Common.ObjectWrapper.ObjectWrapper {
  /** @param {boolean} startAtZero */
  constructor(startAtZero) {
    super();
    this.startAtZero = startAtZero;
    this._minimumBoundary = -1;
    this._maximumBoundary = -1;
    this._boundryChangedEventThrottler = new Common.Throttler.Throttler(0);
    /** @type {?NetworkTimeBoundary} */
    this._window = null;
  }

  /**
   * @param {?NetworkTimeBoundary} window
   */
  setWindow(window) {
    this._window = window;
    this._boundaryChanged();
  }

  setInitialUserFriendlyBoundaries() {
    this._minimumBoundary = 0;
    this._maximumBoundary = 1;
  }

  /**
   * @override
   * @param {number} time
   * @return {number}
   */
  computePosition(time) {
    return (time - this.minimumBoundary()) / this.boundarySpan() * (this._workingArea || 0);
  }

  /**
   * @override
   * @param {number} value
   * @param {number=} precision
   * @return {string}
   */
  formatValue(value, precision) {
    return Number.secondsToString(value, Boolean(precision));
  }

  /**
   * @override
   * @return {number}
   */
  minimumBoundary() {
    return this._window ? this._window.minimum : this._minimumBoundary;
  }

  /**
   * @override
   * @return {number}
   */
  zeroTime() {
    return this._minimumBoundary;
  }

  /**
   * @override
   * @return {number}
   */
  maximumBoundary() {
    return this._window ? this._window.maximum : this._maximumBoundary;
  }

  /**
   * @return {!NetworkTimeBoundary}
   */
  boundary() {
    return new NetworkTimeBoundary(this.minimumBoundary(), this.maximumBoundary());
  }

  /**
   * @override
   * @return {number}
   */
  boundarySpan() {
    return this.maximumBoundary() - this.minimumBoundary();
  }

  reset() {
    this._minimumBoundary = -1;
    this._maximumBoundary = -1;
    this._boundaryChanged();
  }

  /**
   * @return {number}
   */
  _value() {
    return 0;
  }

  /**
   * @param {number} clientWidth
   */
  setDisplayWidth(clientWidth) {
    this._workingArea = clientWidth;
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {!{start: number, middle: number, end: number}}
   */
  computeBarGraphPercentages(request) {
    let start;
    let middle;
    let end;
    if (request.startTime !== -1) {
      start = ((request.startTime - this.minimumBoundary()) / this.boundarySpan()) * 100;
    } else {
      start = 0;
    }

    if (request.responseReceivedTime !== -1) {
      middle = ((request.responseReceivedTime - this.minimumBoundary()) / this.boundarySpan()) * 100;
    } else {
      middle = (this.startAtZero ? start : 100);
    }

    if (request.endTime !== -1) {
      end = ((request.endTime - this.minimumBoundary()) / this.boundarySpan()) * 100;
    } else {
      end = (this.startAtZero ? middle : 100);
    }

    if (this.startAtZero) {
      end -= start;
      middle -= start;
      start = 0;
    }

    return {start: start, middle: middle, end: end};
  }

  /**
   * @param {number} eventTime
   * @return {number}
   */
  computePercentageFromEventTime(eventTime) {
    // This function computes a percentage in terms of the total loading time
    // of a specific event. If startAtZero is set, then this is useless, and we
    // want to return 0.
    if (eventTime !== -1 && !this.startAtZero) {
      return ((eventTime - this.minimumBoundary()) / this.boundarySpan()) * 100;
    }

    return 0;
  }

  /**
   * @param {number} percentage
   * @return {number}
   */
  percentageToTime(percentage) {
    return percentage * this.boundarySpan() / 100 + this.minimumBoundary();
  }

  _boundaryChanged() {
    this._boundryChangedEventThrottler.schedule(async () => {
      this.dispatchEventToListeners(Events.BoundariesChanged);
    });
  }

  /**
   * @param {number} eventTime
   */
  updateBoundariesForEventTime(eventTime) {
    if (eventTime === -1 || this.startAtZero) {
      return;
    }

    if (this._maximumBoundary === undefined || eventTime > this._maximumBoundary) {
      this._maximumBoundary = eventTime;
      this._boundaryChanged();
    }
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {!{left: string, right: string, tooltip: (string|undefined)}}
   */
  computeBarGraphLabels(request) {
    let rightLabel = '';
    if (request.responseReceivedTime !== -1 && request.endTime !== -1) {
      rightLabel = Number.secondsToString(request.endTime - request.responseReceivedTime);
    }

    const hasLatency = request.latency > 0;
    const leftLabel = hasLatency ? Number.secondsToString(request.latency) : rightLabel;

    if (request.timing) {
      return {left: leftLabel, right: rightLabel, tooltip: undefined};
    }

    let tooltip;
    if (hasLatency && rightLabel) {
      const total = Number.secondsToString(request.duration);
      tooltip = i18nString(UIStrings.sLatencySDownloadSTotal, {PH1: leftLabel, PH2: rightLabel, PH3: total});
    } else if (hasLatency) {
      tooltip = i18nString(UIStrings.sLatency, {PH1: leftLabel});
    } else if (rightLabel) {
      tooltip = i18nString(UIStrings.sDownload, {PH1: rightLabel});
    }

    if (request.fetchedViaServiceWorker) {
      tooltip = i18nString(UIStrings.sFromServiceworker, {PH1: tooltip});
    } else if (request.cached()) {
      tooltip = i18nString(UIStrings.sFromCache, {PH1: tooltip});
    }
    return {left: leftLabel, right: rightLabel, tooltip: tooltip};
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  updateBoundaries(request) {
    const lowerBound = this._lowerBound(request);
    const upperBound = this._upperBound(request);
    let changed = false;
    if (lowerBound !== -1 || this.startAtZero) {
      changed = this._extendBoundariesToIncludeTimestamp(this.startAtZero ? 0 : lowerBound);
    }
    if (upperBound !== -1) {
      changed = this._extendBoundariesToIncludeTimestamp(upperBound) || changed;
    }
    if (changed) {
      this._boundaryChanged();
    }
  }

  /**
   * @param {number} timestamp
   * @return {boolean}
   */
  _extendBoundariesToIncludeTimestamp(timestamp) {
    const previousMinimumBoundary = this._minimumBoundary;
    const previousMaximumBoundary = this._maximumBoundary;
    const minOffset = _minimumSpread;
    if (this._minimumBoundary === -1 || this._maximumBoundary === -1) {
      this._minimumBoundary = timestamp;
      this._maximumBoundary = timestamp + minOffset;
    } else {
      this._minimumBoundary = Math.min(timestamp, this._minimumBoundary);
      this._maximumBoundary = Math.max(timestamp, this._minimumBoundary + minOffset, this._maximumBoundary);
    }
    return previousMinimumBoundary !== this._minimumBoundary || previousMaximumBoundary !== this._maximumBoundary;
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {number}
   */
  _lowerBound(request) {
    return 0;
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {number}
   */
  _upperBound(request) {
    return 0;
  }
}

export const _minimumSpread = 0.1;

/** @enum {symbol} */
export const Events = {
  BoundariesChanged: Symbol('BoundariesChanged')
};

export class NetworkTransferTimeCalculator extends NetworkTimeCalculator {
  constructor() {
    super(false);
  }

  /**
   * @override
   * @param {number} value
   * @param {number=} precision
   * @return {string}
   */
  formatValue(value, precision) {
    return Number.secondsToString(value - this.zeroTime(), Boolean(precision));
  }

  /**
   * @override
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {number}
   */
  _lowerBound(request) {
    return request.issueTime();
  }

  /**
   * @override
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {number}
   */
  _upperBound(request) {
    return request.endTime;
  }
}

export class NetworkTransferDurationCalculator extends NetworkTimeCalculator {
  constructor() {
    super(true);
  }

  /**
   * @override
   * @param {number} value
   * @param {number=} precision
   * @return {string}
   */
  formatValue(value, precision) {
    return Number.secondsToString(value, Boolean(precision));
  }

  /**
   * @override
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {number}
   */
  _upperBound(request) {
    return request.duration;
  }
}

// gen/front_end/models/network_time_calculator/NetworkTimeCalculator.js
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
var UIStrings = {
  /**
   * @description Latency download total format in Network Time Calculator of the Network panel
   * @example {20ms} PH1
   * @example {20ms} PH2
   * @example {40ms} PH3
   */
  sLatencySDownloadSTotal: "{PH1} latency, {PH2} download ({PH3} total)",
  /**
   * @description Latency format in Network Time Calculator of the Network panel
   * @example {20ms} PH1
   */
  sLatency: "{PH1} latency",
  /**
   * @description Duration of the download in ms/s shown for a completed network request.
   * @example {5ms} PH1
   */
  sDownload: "{PH1} download",
  /**
   * @description From service worker format in Network Time Calculator of the Network panel
   * @example {20ms latency} PH1
   */
  sFromServiceworker: "{PH1} (from `ServiceWorker`)",
  /**
   * @description From cache format in Network Time Calculator of the Network panel
   * @example {20ms latency} PH1
   */
  sFromCache: "{PH1} (from cache)"
};
var str_ = i18n.i18n.registerUIStrings("models/network_time_calculator/NetworkTimeCalculator.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var NetworkTimeBoundary = class {
  minimum;
  maximum;
  constructor(minimum, maximum) {
    this.minimum = minimum;
    this.maximum = maximum;
  }
  equals(other) {
    return this.minimum === other.minimum && this.maximum === other.maximum;
  }
};
var NetworkTimeCalculator = class extends Common.ObjectWrapper.ObjectWrapper {
  #minimumBoundary = -1;
  #maximumBoundary = -1;
  #boundaryChangedEventThrottler = new Common.Throttler.Throttler(0);
  #window = null;
  #workingArea;
  startAtZero;
  constructor(startAtZero) {
    super();
    this.startAtZero = startAtZero;
  }
  setWindow(window) {
    this.#window = window;
    this.boundaryChanged();
  }
  computePosition(time) {
    return (time - this.minimumBoundary()) / this.boundarySpan() * (this.#workingArea || 0);
  }
  formatValue(value, precision) {
    return i18n.TimeUtilities.secondsToString(value, Boolean(precision));
  }
  minimumBoundary() {
    return this.#window ? this.#window.minimum : this.#minimumBoundary;
  }
  zeroTime() {
    return this.#minimumBoundary;
  }
  maximumBoundary() {
    return this.#window ? this.#window.maximum : this.#maximumBoundary;
  }
  boundary() {
    return new NetworkTimeBoundary(this.minimumBoundary(), this.maximumBoundary());
  }
  boundarySpan() {
    return this.maximumBoundary() - this.minimumBoundary();
  }
  reset() {
    this.#minimumBoundary = -1;
    this.#maximumBoundary = -1;
    this.boundaryChanged();
  }
  value() {
    return 0;
  }
  setDisplayWidth(clientWidth) {
    this.#workingArea = clientWidth;
  }
  computeBarGraphPercentages(request) {
    let start;
    let middle;
    let end;
    if (request.startTime !== -1) {
      start = (request.startTime - this.minimumBoundary()) / this.boundarySpan() * 100;
    } else {
      start = 0;
    }
    if (request.responseReceivedTime !== -1) {
      middle = (request.responseReceivedTime - this.minimumBoundary()) / this.boundarySpan() * 100;
    } else {
      middle = this.startAtZero ? start : 100;
    }
    if (request.endTime !== -1) {
      end = (request.endTime - this.minimumBoundary()) / this.boundarySpan() * 100;
    } else {
      end = this.startAtZero ? middle : 100;
    }
    if (this.startAtZero) {
      end -= start;
      middle -= start;
      start = 0;
    }
    return { start, middle, end };
  }
  boundaryChanged() {
    void this.#boundaryChangedEventThrottler.schedule(async () => {
      this.dispatchEventToListeners(
        "BoundariesChanged"
        /* Events.BOUNDARIES_CHANGED */
      );
    });
  }
  updateBoundariesForEventTime(eventTime) {
    if (eventTime === -1 || this.startAtZero) {
      return;
    }
    if (this.#maximumBoundary === void 0 || eventTime > this.#maximumBoundary) {
      this.#maximumBoundary = eventTime;
      this.boundaryChanged();
    }
  }
  computeBarGraphLabels(request) {
    let rightLabel = "";
    if (request.responseReceivedTime !== -1 && request.endTime !== -1) {
      rightLabel = i18n.TimeUtilities.secondsToString(request.endTime - request.responseReceivedTime);
    }
    const hasLatency = request.latency > 0;
    const leftLabel = hasLatency ? i18n.TimeUtilities.secondsToString(request.latency) : rightLabel;
    if (request.timing) {
      return { left: leftLabel, right: rightLabel, tooltip: void 0 };
    }
    let tooltip;
    if (hasLatency && rightLabel) {
      const total = i18n.TimeUtilities.secondsToString(request.duration);
      tooltip = i18nString(UIStrings.sLatencySDownloadSTotal, { PH1: leftLabel, PH2: rightLabel, PH3: total });
    } else if (hasLatency) {
      tooltip = i18nString(UIStrings.sLatency, { PH1: leftLabel });
    } else if (rightLabel) {
      tooltip = i18nString(UIStrings.sDownload, { PH1: rightLabel });
    }
    if (request.fetchedViaServiceWorker) {
      tooltip = i18nString(UIStrings.sFromServiceworker, { PH1: String(tooltip) });
    } else if (request.cached()) {
      tooltip = i18nString(UIStrings.sFromCache, { PH1: String(tooltip) });
    }
    return { left: leftLabel, right: rightLabel, tooltip };
  }
  updateBoundaries(request) {
    const lowerBound = this.lowerBound(request);
    const upperBound = this.upperBound(request);
    let changed = false;
    if (lowerBound !== -1 || this.startAtZero) {
      changed = this.extendBoundariesToIncludeTimestamp(this.startAtZero ? 0 : lowerBound);
    }
    if (upperBound !== -1) {
      changed = this.extendBoundariesToIncludeTimestamp(upperBound) || changed;
    }
    if (changed) {
      this.boundaryChanged();
    }
  }
  extendBoundariesToIncludeTimestamp(timestamp) {
    const previousMinimumBoundary = this.#minimumBoundary;
    const previousMaximumBoundary = this.#maximumBoundary;
    const minOffset = MINIMUM_SPREAD;
    if (this.#minimumBoundary === -1 || this.#maximumBoundary === -1) {
      this.#minimumBoundary = timestamp;
      this.#maximumBoundary = timestamp + minOffset;
    } else {
      this.#minimumBoundary = Math.min(timestamp, this.#minimumBoundary);
      this.#maximumBoundary = Math.max(timestamp, this.#minimumBoundary + minOffset, this.#maximumBoundary);
    }
    return previousMinimumBoundary !== this.#minimumBoundary || previousMaximumBoundary !== this.#maximumBoundary;
  }
  lowerBound(_request) {
    return 0;
  }
  upperBound(_request) {
    return 0;
  }
};
var MINIMUM_SPREAD = 0.1;
var NetworkTransferTimeCalculator = class extends NetworkTimeCalculator {
  constructor() {
    super(false);
  }
  formatValue(value, precision) {
    return i18n.TimeUtilities.secondsToString(value - this.zeroTime(), Boolean(precision));
  }
  lowerBound(request) {
    return request.issueTime();
  }
  upperBound(request) {
    return request.endTime;
  }
};
var NetworkTransferDurationCalculator = class extends NetworkTimeCalculator {
  constructor() {
    super(true);
  }
  formatValue(value, precision) {
    return i18n.TimeUtilities.secondsToString(value, Boolean(precision));
  }
  upperBound(request) {
    return request.duration;
  }
};

// gen/front_end/models/network_time_calculator/RequestTimeRanges.js
var ServiceWorkerRangeNames = /* @__PURE__ */ new Set([
  "serviceworker",
  "serviceworker-preparation",
  "serviceworker-respondwith",
  "serviceworker-routerevaluation",
  "serviceworker-cachelookup"
]);
var ConnectionSetupRangeNames = /* @__PURE__ */ new Set([
  "queueing",
  "blocking",
  "connecting",
  "dns",
  "proxy",
  "ssl"
]);
function calculateRequestTimeRanges(request, navigationStart) {
  const result = [];
  function addRange(name, start, end) {
    if (start < Number.MAX_VALUE && start <= end) {
      result.push({ name, start, end });
    }
  }
  function firstPositive(numbers) {
    for (let i = 0; i < numbers.length; ++i) {
      if (numbers[i] > 0) {
        return numbers[i];
      }
    }
    return void 0;
  }
  function addOffsetRange(name, start, end) {
    if (start >= 0 && end >= 0) {
      addRange(name, startTime + start / 1e3, startTime + end / 1e3);
    }
  }
  function addMaybeNegativeOffsetRange(name, start, end) {
    addRange(name, startTime + start / 1e3, startTime + end / 1e3);
  }
  const timing = request.timing;
  if (!timing) {
    const start = request.issueTime() !== -1 ? request.issueTime() : request.startTime !== -1 ? request.startTime : 0;
    const hasDifferentIssueAndStartTime = request.issueTime() !== -1 && request.startTime !== -1 && request.issueTime() !== request.startTime;
    const middle = request.responseReceivedTime === -1 ? hasDifferentIssueAndStartTime ? request.startTime : Number.MAX_VALUE : request.responseReceivedTime;
    const end = request.endTime === -1 ? Number.MAX_VALUE : request.endTime;
    addRange("total", start, end);
    addRange("blocking", start, middle);
    const state = request.responseReceivedTime === -1 ? "connecting" : "receiving";
    addRange(state, middle, end);
    return result;
  }
  const issueTime = request.issueTime();
  const startTime = timing.requestTime;
  const endTime = firstPositive([request.endTime, request.responseReceivedTime]) || startTime;
  addRange("total", issueTime < startTime ? issueTime : startTime, endTime);
  if (timing.pushStart) {
    const pushEnd = timing.pushEnd || endTime;
    if (pushEnd > navigationStart) {
      addRange("push", Math.max(timing.pushStart, navigationStart), pushEnd);
    }
  }
  if (issueTime < startTime) {
    addRange("queueing", issueTime, startTime);
  }
  const responseReceived = (request.responseReceivedTime - startTime) * 1e3;
  if (request.fetchedViaServiceWorker) {
    addOffsetRange("blocking", 0, timing.workerStart);
    addOffsetRange("serviceworker-preparation", timing.workerStart, timing.workerReady);
    addOffsetRange("serviceworker-respondwith", timing.workerFetchStart, timing.workerRespondWithSettled);
    addOffsetRange("serviceworker", timing.workerReady, timing.sendEnd);
    addOffsetRange("waiting", timing.sendEnd, responseReceived);
  } else if (!timing.pushStart) {
    const blockingEnd = firstPositive([timing.dnsStart, timing.connectStart, timing.sendStart, responseReceived]) || 0;
    addOffsetRange("blocking", 0, blockingEnd);
    addOffsetRange("proxy", timing.proxyStart, timing.proxyEnd);
    addOffsetRange("dns", timing.dnsStart, timing.dnsEnd);
    addOffsetRange("connecting", timing.connectStart, timing.connectEnd);
    addOffsetRange("ssl", timing.sslStart, timing.sslEnd);
    addOffsetRange("sending", timing.sendStart, timing.sendEnd);
    addOffsetRange("waiting", Math.max(timing.sendEnd, timing.connectEnd, timing.dnsEnd, timing.proxyEnd, blockingEnd), responseReceived);
  }
  const { serviceWorkerRouterInfo } = request;
  if (serviceWorkerRouterInfo) {
    if (timing.workerRouterEvaluationStart) {
      let routerEvaluationEnd = timing.sendStart;
      if (serviceWorkerRouterInfo?.matchedSourceType === "cache" && timing.workerCacheLookupStart) {
        routerEvaluationEnd = timing.workerCacheLookupStart;
      } else if (serviceWorkerRouterInfo?.actualSourceType === "fetch-event") {
        routerEvaluationEnd = timing.workerStart;
      }
      addMaybeNegativeOffsetRange("serviceworker-routerevaluation", timing.workerRouterEvaluationStart, routerEvaluationEnd);
    }
    if (timing.workerCacheLookupStart) {
      let cacheLookupEnd = timing.sendStart;
      if (serviceWorkerRouterInfo?.actualSourceType === "cache") {
        cacheLookupEnd = timing.receiveHeadersStart;
      }
      addMaybeNegativeOffsetRange("serviceworker-cachelookup", timing.workerCacheLookupStart, cacheLookupEnd);
    }
  }
  if (request.endTime !== -1) {
    addRange(timing.pushStart ? "receiving-push" : "receiving", request.responseReceivedTime, endTime);
  }
  return result;
}
export {
  ConnectionSetupRangeNames,
  NetworkTimeBoundary,
  NetworkTimeCalculator,
  NetworkTransferDurationCalculator,
  NetworkTransferTimeCalculator,
  ServiceWorkerRangeNames,
  calculateRequestTimeRanges
};
//# sourceMappingURL=network_time_calculator.js.map

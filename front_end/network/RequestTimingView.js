/*
 * Copyright (C) 2010 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {Events, NetworkTimeCalculator} from './NetworkTimeCalculator.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class RequestTimingView extends UI.Widget.VBox {
  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @param {!NetworkTimeCalculator} calculator
   */
  constructor(request, calculator) {
    super();
    this.element.classList.add('resource-timing-view');

    this._request = request;
    this._calculator = calculator;
  }

  /**
   * @param {!RequestTimeRangeNames} name
   * @return {string}
   */
  static _timeRangeTitle(name) {
    switch (name) {
      case RequestTimeRangeNames.Push:
        return Common.UIString.UIString('Receiving Push');
      case RequestTimeRangeNames.Queueing:
        return Common.UIString.UIString('Queueing');
      case RequestTimeRangeNames.Blocking:
        return Common.UIString.UIString('Stalled');
      case RequestTimeRangeNames.Connecting:
        return Common.UIString.UIString('Initial connection');
      case RequestTimeRangeNames.DNS:
        return Common.UIString.UIString('DNS Lookup');
      case RequestTimeRangeNames.Proxy:
        return Common.UIString.UIString('Proxy negotiation');
      case RequestTimeRangeNames.ReceivingPush:
        return Common.UIString.UIString('Reading Push');
      case RequestTimeRangeNames.Receiving:
        return Common.UIString.UIString('Content Download');
      case RequestTimeRangeNames.Sending:
        return Common.UIString.UIString('Request sent');
      case RequestTimeRangeNames.ServiceWorker:
        return Common.UIString.UIString('Request to ServiceWorker');
      case RequestTimeRangeNames.ServiceWorkerPreparation:
        return Common.UIString.UIString('ServiceWorker Preparation');
      case RequestTimeRangeNames.SSL:
        return Common.UIString.UIString('SSL');
      case RequestTimeRangeNames.Total:
        return Common.UIString.UIString('Total');
      case RequestTimeRangeNames.Waiting:
        return Common.UIString.UIString('Waiting (TTFB)');
      default:
        return Common.UIString.UIString(name);
    }
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @param {number} navigationStart
   * @return {!Array.<!RequestTimeRange>}
   */
  static calculateRequestTimeRanges(request, navigationStart) {
    const result = [];
    /**
     * @param {!RequestTimeRangeNames} name
     * @param {number} start
     * @param {number} end
     */
    function addRange(name, start, end) {
      if (start < Number.MAX_VALUE && start <= end) {
        result.push({name: name, start: start, end: end});
      }
    }

    /**
     * @param {!Array.<number>} numbers
     * @return {number|undefined}
     */
    function firstPositive(numbers) {
      for (let i = 0; i < numbers.length; ++i) {
        if (numbers[i] > 0) {
          return numbers[i];
        }
      }
      return undefined;
    }

    /**
     * @param {!RequestTimeRangeNames} name
     * @param {number} start
     * @param {number} end
     */
    function addOffsetRange(name, start, end) {
      if (start >= 0 && end >= 0) {
        addRange(name, startTime + (start / 1000), startTime + (end / 1000));
      }
    }

    const timing = request.timing;
    if (!timing) {
      const start = request.issueTime() !== -1 ? request.issueTime() : request.startTime !== -1 ? request.startTime : 0;
      const middle = (request.responseReceivedTime === -1) ? Number.MAX_VALUE : request.responseReceivedTime;
      const end = (request.endTime === -1) ? Number.MAX_VALUE : request.endTime;
      addRange(RequestTimeRangeNames.Total, start, end);
      addRange(RequestTimeRangeNames.Blocking, start, middle);
      addRange(RequestTimeRangeNames.Receiving, middle, end);
      return result;
    }

    const issueTime = request.issueTime();
    const startTime = timing.requestTime;
    const endTime = firstPositive([request.endTime, request.responseReceivedTime]) || startTime;

    addRange(RequestTimeRangeNames.Total, issueTime < startTime ? issueTime : startTime, endTime);
    if (timing.pushStart) {
      const pushEnd = timing.pushEnd || endTime;
      // Only show the part of push that happened after the navigation/reload.
      // Pushes that happened on the same connection before we started main request will not be shown.
      if (pushEnd > navigationStart) {
        addRange(RequestTimeRangeNames.Push, Math.max(timing.pushStart, navigationStart), pushEnd);
      }
    }
    if (issueTime < startTime) {
      addRange(RequestTimeRangeNames.Queueing, issueTime, startTime);
    }

    const responseReceived = (request.responseReceivedTime - startTime) * 1000;
    if (request.fetchedViaServiceWorker) {
      addOffsetRange(RequestTimeRangeNames.Blocking, 0, timing.workerStart);
      addOffsetRange(RequestTimeRangeNames.ServiceWorkerPreparation, timing.workerStart, timing.workerReady);
      addOffsetRange(RequestTimeRangeNames.ServiceWorker, timing.workerReady, timing.sendEnd);
      addOffsetRange(RequestTimeRangeNames.Waiting, timing.sendEnd, responseReceived);
    } else if (!timing.pushStart) {
      const blockingEnd =
          firstPositive([timing.dnsStart, timing.connectStart, timing.sendStart, responseReceived]) || 0;
      addOffsetRange(RequestTimeRangeNames.Blocking, 0, blockingEnd);
      addOffsetRange(RequestTimeRangeNames.Proxy, timing.proxyStart, timing.proxyEnd);
      addOffsetRange(RequestTimeRangeNames.DNS, timing.dnsStart, timing.dnsEnd);
      addOffsetRange(RequestTimeRangeNames.Connecting, timing.connectStart, timing.connectEnd);
      addOffsetRange(RequestTimeRangeNames.SSL, timing.sslStart, timing.sslEnd);
      addOffsetRange(RequestTimeRangeNames.Sending, timing.sendStart, timing.sendEnd);
      addOffsetRange(
          RequestTimeRangeNames.Waiting,
          Math.max(timing.sendEnd, timing.connectEnd, timing.dnsEnd, timing.proxyEnd, blockingEnd), responseReceived);
    }

    if (request.endTime !== -1) {
      addRange(
          timing.pushStart ? RequestTimeRangeNames.ReceivingPush : RequestTimeRangeNames.Receiving,
          request.responseReceivedTime, endTime);
    }

    return result;
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @param {!NetworkTimeCalculator} calculator
   * @return {!Element}
   */
  static createTimingTable(request, calculator) {
    const tableElement = createElementWithClass('table', 'network-timing-table');
    UI.Utils.appendStyle(tableElement, 'network/networkTimingTable.css');
    const colgroup = tableElement.createChild('colgroup');
    colgroup.createChild('col', 'labels');
    colgroup.createChild('col', 'bars');
    colgroup.createChild('col', 'duration');

    const timeRanges = RequestTimingView.calculateRequestTimeRanges(request, calculator.minimumBoundary());
    const startTime = timeRanges.map(r => r.start).reduce((a, b) => Math.min(a, b));
    const endTime = timeRanges.map(r => r.end).reduce((a, b) => Math.max(a, b));
    const scale = 100 / (endTime - startTime);

    let connectionHeader;
    let dataHeader;
    let queueingHeader;
    let totalDuration = 0;

    const startTimeHeader = tableElement.createChild('thead', 'network-timing-start');
    const tableHeaderRow = startTimeHeader.createChild('tr');
    const activityHeaderCell = tableHeaderRow.createChild('th');
    activityHeaderCell.createChild('span', 'network-timing-hidden-header').textContent = ls`Label`;
    activityHeaderCell.scope = 'col';
    const waterfallHeaderCell = tableHeaderRow.createChild('th');
    waterfallHeaderCell.createChild('span', 'network-timing-hidden-header').textContent = ls`Waterfall`;
    waterfallHeaderCell.scope = 'col';
    const durationHeaderCell = tableHeaderRow.createChild('th');
    durationHeaderCell.createChild('span', 'network-timing-hidden-header').textContent = ls`Duration`;
    durationHeaderCell.scope = 'col';

    const queuedCell = startTimeHeader.createChild('tr').createChild('td');
    const startedCell = startTimeHeader.createChild('tr').createChild('td');
    queuedCell.colSpan = startedCell.colSpan = 3;
    queuedCell.createTextChild(
        Common.UIString.UIString('Queued at %s', calculator.formatValue(request.issueTime(), 2)));
    startedCell.createTextChild(
        Common.UIString.UIString('Started at %s', calculator.formatValue(request.startTime, 2)));

    let right;
    for (let i = 0; i < timeRanges.length; ++i) {
      const range = timeRanges[i];
      const rangeName = range.name;
      if (rangeName === RequestTimeRangeNames.Total) {
        totalDuration = range.end - range.start;
        continue;
      }
      if (rangeName === RequestTimeRangeNames.Push) {
        createHeader(Common.UIString.UIString('Server Push'));
      } else if (rangeName === RequestTimeRangeNames.Queueing) {
        if (!queueingHeader) {
          queueingHeader = createHeader(ls`Resource Scheduling`);
        }
      } else if (ConnectionSetupRangeNames.has(rangeName)) {
        if (!connectionHeader) {
          connectionHeader = createHeader(Common.UIString.UIString('Connection Start'));
        }
      } else {
        if (!dataHeader) {
          dataHeader = createHeader(Common.UIString.UIString('Request/Response'));
        }
      }

      const left = (scale * (range.start - startTime));
      right = (scale * (endTime - range.end));
      const duration = range.end - range.start;

      const tr = tableElement.createChild('tr');
      tr.createChild('td').createTextChild(RequestTimingView._timeRangeTitle(rangeName));

      const row = tr.createChild('td').createChild('div', 'network-timing-row');
      const bar = row.createChild('span', 'network-timing-bar ' + rangeName);
      bar.style.left = left + '%';
      bar.style.right = right + '%';
      bar.textContent = '\u200B';  // Important for 0-time items to have 0 width.
      UI.ARIAUtils.setAccessibleName(row, ls`Started at ${calculator.formatValue(range.start, 2)}`);
      const label = tr.createChild('td').createChild('div', 'network-timing-bar-title');
      label.textContent = Number.secondsToString(duration, true);
    }

    if (!request.finished) {
      const cell = tableElement.createChild('tr').createChild('td', 'caution');
      cell.colSpan = 3;
      cell.createTextChild(Common.UIString.UIString('CAUTION: request is not finished yet!'));
    }

    const footer = tableElement.createChild('tr', 'network-timing-footer');
    const note = footer.createChild('td');
    note.colSpan = 1;
    note.appendChild(UI.UIUtils.createDocumentationLink(
        'network-performance/reference#timing-explanation', Common.UIString.UIString('Explanation')));
    footer.createChild('td');
    footer.createChild('td').createTextChild(Number.secondsToString(totalDuration, true));

    const serverTimings = request.serverTimings;

    const lastTimingRightEdge = right === undefined ? 100 : right;

    const breakElement = tableElement.createChild('tr', 'network-timing-table-header').createChild('td');
    breakElement.colSpan = 3;
    breakElement.createChild('hr', 'break');

    const serverHeader = tableElement.createChild('tr', 'network-timing-table-header');
    serverHeader.createChild('td').createTextChild(Common.UIString.UIString('Server Timing'));
    serverHeader.createChild('td');
    serverHeader.createChild('td').createTextChild(Common.UIString.UIString('TIME'));

    if (!serverTimings) {
      const informationRow = tableElement.createChild('tr');
      const information = informationRow.createChild('td');
      information.colSpan = 3;

      const link = UI.XLink.XLink.create('https://web.dev/custom-metrics/#server-timing-api', ls`the Server Timing API`);
      information.appendChild(UI.UIUtils.formatLocalized(
          'During development, you can use %s to add insights into the server-side timing of this request.', [link]));

      return tableElement;
    }

    serverTimings.filter(item => item.metric.toLowerCase() !== 'total')
        .forEach(item => addTiming(item, lastTimingRightEdge));
    serverTimings.filter(item => item.metric.toLowerCase() === 'total')
        .forEach(item => addTiming(item, lastTimingRightEdge));

    return tableElement;

    /**
     * @param {!SDK.ServerTiming.ServerTiming} serverTiming
     * @param {number} right
     */
    function addTiming(serverTiming, right) {
      const colorGenerator = new Common.Color.Generator({min: 0, max: 360, count: 36}, {min: 50, max: 80}, 80);
      const isTotal = serverTiming.metric.toLowerCase() === 'total';
      const tr = tableElement.createChild('tr', isTotal ? 'network-timing-footer' : '');
      const metric = tr.createChild('td', 'network-timing-metric');
      const description = serverTiming.description || serverTiming.metric;
      metric.createTextChild(description);
      metric.title = description;
      const row = tr.createChild('td').createChild('div', 'network-timing-row');

      if (serverTiming.value === null) {
        return;
      }
      const left = scale * (endTime - startTime - (serverTiming.value / 1000));
      if (left >= 0) {  // don't chart values too big or too small
        const bar = row.createChild('span', 'network-timing-bar server-timing');
        bar.style.left = left + '%';
        bar.style.right = right + '%';
        bar.textContent = '\u200B';  // Important for 0-time items to have 0 width.
        if (!isTotal) {
          bar.style.backgroundColor = colorGenerator.colorForID(serverTiming.metric);
        }
      }
      const label = tr.createChild('td').createChild('div', 'network-timing-bar-title');
      label.textContent = Number.millisToString(serverTiming.value, true);
    }

    /**
     * @param {string} title
     * @return {!Element}
     */
    function createHeader(title) {
      const dataHeader = tableElement.createChild('tr', 'network-timing-table-header');
      const headerCell = dataHeader.createChild('td');
      headerCell.createTextChild(title);
      UI.ARIAUtils.markAsHeading(headerCell, 2);
      dataHeader.createChild('td').createTextChild('');
      dataHeader.createChild('td').createTextChild(ls`DURATION`);
      return dataHeader;
    }
  }

  /**
   * @override
   */
  wasShown() {
    this._request.addEventListener(SDK.NetworkRequest.Events.TimingChanged, this._refresh, this);
    this._request.addEventListener(SDK.NetworkRequest.Events.FinishedLoading, this._refresh, this);
    this._calculator.addEventListener(Events.BoundariesChanged, this._refresh, this);
    this._refresh();
  }

  /**
   * @override
   */
  willHide() {
    this._request.removeEventListener(SDK.NetworkRequest.Events.TimingChanged, this._refresh, this);
    this._request.removeEventListener(SDK.NetworkRequest.Events.FinishedLoading, this._refresh, this);
    this._calculator.removeEventListener(Events.BoundariesChanged, this._refresh, this);
  }

  _refresh() {
    if (this._tableElement) {
      this._tableElement.remove();
    }

    this._tableElement = RequestTimingView.createTimingTable(this._request, this._calculator);
    this._tableElement.classList.add('resource-timing-table');
    this.element.appendChild(this._tableElement);
  }
}

/** @enum {string} */
export const RequestTimeRangeNames = {
  Push: 'push',
  Queueing: 'queueing',
  Blocking: 'blocking',
  Connecting: 'connecting',
  DNS: 'dns',
  Proxy: 'proxy',
  Receiving: 'receiving',
  ReceivingPush: 'receiving-push',
  Sending: 'sending',
  ServiceWorker: 'serviceworker',
  ServiceWorkerPreparation: 'serviceworker-preparation',
  SSL: 'ssl',
  Total: 'total',
  Waiting: 'waiting'
};

export const ConnectionSetupRangeNames = new Set([
  RequestTimeRangeNames.Queueing, RequestTimeRangeNames.Blocking, RequestTimeRangeNames.Connecting,
  RequestTimeRangeNames.DNS, RequestTimeRangeNames.Proxy, RequestTimeRangeNames.SSL
]);

/** @typedef {{name: !RequestTimeRangeNames, start: number, end: number}} */
export let RequestTimeRange;

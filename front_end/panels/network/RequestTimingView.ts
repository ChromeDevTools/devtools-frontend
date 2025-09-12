// Copyright 2010 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Logs from '../../models/logs/logs.js';
import * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import networkingTimingTableStyles from './networkTimingTable.css.js';

const UIStrings = {
  /**
   * @description Text used to label the time taken to receive an HTTP/2 Push message.
   */
  receivingPush: 'Receiving `Push`',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  queueing: 'Queueing',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  stalled: 'Stalled',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  initialConnection: 'Initial connection',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  dnsLookup: 'DNS Lookup',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  proxyNegotiation: 'Proxy negotiation',
  /**
   * @description Text used to label the time taken to read an HTTP/2 Push message.
   */
  readingPush: 'Reading `Push`',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  contentDownload: 'Content Download',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  requestSent: 'Request sent',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  requestToServiceworker: 'Request to `ServiceWorker`',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  startup: 'Startup',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  respondwith: 'respondWith',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  ssl: 'SSL',
  /**
   * @description Text for sum
   */
  total: 'Total',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  waitingTtfb: 'Waiting for server response',
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  label: 'Label',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  routerEvaluation: 'Router Evaluation',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  routerCacheLookup: 'Cache Lookup',
  /**
   * @description Inner element text content in Network Log View Columns of the Network panel
   */
  waterfall: 'Waterfall',
  /**
   * @description Text for the duration of something
   */
  duration: 'Duration',
  /**
   * @description Text of a DOM element in Request Timing View of the Network panel
   * @example {120.39ms} PH1
   */
  queuedAtS: 'Queued at {PH1}',
  /**
   * @description Text of a DOM element in Request Timing View of the Network panel
   * @example {120.39ms} PH1
   */
  startedAtS: 'Started at {PH1}',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  serverPush: 'Server Push',
  /**
   * @description Text of a DOM element in Request Timing View of the Network panel
   */
  resourceScheduling: 'Resource Scheduling',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  connectionStart: 'Connection Start',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  requestresponse: 'Request/Response',
  /**
   * @description Text of a DOM element in Request Timing View of the Network panel
   */
  cautionRequestIsNotFinishedYet: 'CAUTION: request is not finished yet!',
  /**
   * @description Text in Request Timing View of the Network panel
   */
  explanation: 'Explanation',
  /**
   * @description Text of a DOM element in Request Timing View of the Network panel
   */
  serverTiming: 'Server Timing',
  /**
   * @description Text of a DOM element in Request Timing View of the Network panel
   */
  time: 'TIME',
  /**
   * @description Label for the Server Timing API
   */
  theServerTimingApi: 'the Server Timing API',
  /**
   * @description Text to inform about the ServerTiming API, which can be used to report timing information to DevTools about the substeps that the server performed to answer the requests. Timing information is, e.g., the duration of the substep.
   * @example {https://web.dev/custom-metrics/#server-timing-api} PH1
   */
  duringDevelopmentYouCanUseSToAdd:
      'During development, you can use {PH1} to add insights into the server-side timing of this request.',
  /**
   * @description Header for last column of network timing tab.
   */
  durationC: 'DURATION',
  /**
   * @description Description for treeitem in ServiceWorker Fetch Details
   */
  originalRequest: 'Original Request',
  /**
   * @description Description for treeitem in ServiceWorker Fetch Details
   */
  responseReceived: 'Response Received',
  /**
   * @description Text for an unspecified service worker response source
   */
  unknown: 'Unknown',
  /**
   * @description Displays how a particular response was fetched
   * @example {Network fetch} PH1
   */
  sourceOfResponseS: 'Source of response: {PH1}',
  /**
   * @description Name of storage cache from which a response was fetched
   * @example {v1} PH1
   */
  cacheStorageCacheNameS: 'Cache storage cache name: {PH1}',
  /**
   * @description Text for unknown cache storage name
   */
  cacheStorageCacheNameUnknown: 'Cache storage cache name: Unknown',
  /**
   * @description Time at which a response was retrieved
   * @example {Fri Apr 10 2020 17:20:27 GMT-0700 (Pacific Daylight Time)} PH1
   */
  retrievalTimeS: 'Retrieval Time: {PH1}',
  /**
   * @description Text used to show that serviceworker fetch response source is ServiceWorker Cache Storage
   */
  serviceworkerCacheStorage: '`ServiceWorker` cache storage',
  /**
   * @description Text used to show that serviceworker fetch response source is HTTP cache
   */
  fromHttpCache: 'From HTTP cache',
  /**
   * @description Text used to show that data was retrieved via a Network fetch
   */
  networkFetch: 'Network fetch',
  /**
   * @description Text used to show that data was retrieved using ServiceWorker fallback code
   */
  fallbackCode: 'Fallback code',
  /**
   * @description Name of the specified source for SW static routing API.
   * @example {network} PH1
   */
  routerMatchedSource: 'Matched source: {PH1}',
  /**
   * @description Name of the actually used source for SW static routing API.
   * @example {network} PH1
   */
  routerActualSource: 'Actual source: {PH1}',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestTimingView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class RequestTimingView extends UI.Widget.VBox {
  private request: SDK.NetworkRequest.NetworkRequest;
  private calculator: NetworkTimeCalculator.NetworkTimeCalculator;
  private lastMinimumBoundary: number;
  private tableElement?: Element;
  constructor(request: SDK.NetworkRequest.NetworkRequest, calculator: NetworkTimeCalculator.NetworkTimeCalculator) {
    super();
    this.registerRequiredCSS(networkingTimingTableStyles);
    this.element.classList.add('resource-timing-view');

    this.request = request;
    this.calculator = calculator;
    this.lastMinimumBoundary = -1;
  }

  private static timeRangeTitle(name: NetworkTimeCalculator.RequestTimeRangeNames): string {
    switch (name) {
      case NetworkTimeCalculator.RequestTimeRangeNames.PUSH:
        return i18nString(UIStrings.receivingPush);
      case NetworkTimeCalculator.RequestTimeRangeNames.QUEUEING:
        return i18nString(UIStrings.queueing);
      case NetworkTimeCalculator.RequestTimeRangeNames.BLOCKING:
        return i18nString(UIStrings.stalled);
      case NetworkTimeCalculator.RequestTimeRangeNames.CONNECTING:
        return i18nString(UIStrings.initialConnection);
      case NetworkTimeCalculator.RequestTimeRangeNames.DNS:
        return i18nString(UIStrings.dnsLookup);
      case NetworkTimeCalculator.RequestTimeRangeNames.PROXY:
        return i18nString(UIStrings.proxyNegotiation);
      case NetworkTimeCalculator.RequestTimeRangeNames.RECEIVING_PUSH:
        return i18nString(UIStrings.readingPush);
      case NetworkTimeCalculator.RequestTimeRangeNames.RECEIVING:
        return i18nString(UIStrings.contentDownload);
      case NetworkTimeCalculator.RequestTimeRangeNames.SENDING:
        return i18nString(UIStrings.requestSent);
      case NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER:
        return i18nString(UIStrings.requestToServiceworker);
      case NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_PREPARATION:
        return i18nString(UIStrings.startup);
      case NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_ROUTER_EVALUATION:
        return i18nString(UIStrings.routerEvaluation);
      case NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_CACHE_LOOKUP:
        return i18nString(UIStrings.routerCacheLookup);
      case NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_RESPOND_WITH:
        return i18nString(UIStrings.respondwith);
      case NetworkTimeCalculator.RequestTimeRangeNames.SSL:
        return i18nString(UIStrings.ssl);
      case NetworkTimeCalculator.RequestTimeRangeNames.TOTAL:
        return i18nString(UIStrings.total);
      case NetworkTimeCalculator.RequestTimeRangeNames.WAITING:
        return i18nString(UIStrings.waitingTtfb);
      default:
        return name;
    }
  }

  static createTimingTable(
      request: SDK.NetworkRequest.NetworkRequest, calculator: NetworkTimeCalculator.NetworkTimeCalculator): Element {
    const tableElement = document.createElement('table');
    tableElement.classList.add('network-timing-table');
    tableElement.setAttribute('jslog', `${VisualLogging.pane('timing').track({resize: true})}`);
    const colgroup = tableElement.createChild('colgroup');
    colgroup.createChild('col', 'labels');
    colgroup.createChild('col', 'bars');
    colgroup.createChild('col', 'duration');

    const timeRanges = NetworkTimeCalculator.calculateRequestTimeRanges(request, calculator.minimumBoundary());
    const startTime = timeRanges.map(r => r.start).reduce((a, b) => Math.min(a, b));
    const endTime = timeRanges.map(r => r.end).reduce((a, b) => Math.max(a, b));
    const scale = 100 / (endTime - startTime);

    let connectionHeader;
    let serviceworkerHeader;
    let dataHeader;
    let queueingHeader;
    let totalDuration = 0;

    const startTimeHeader = tableElement.createChild('thead', 'network-timing-start');
    const tableHeaderRow = startTimeHeader.createChild('tr');
    const activityHeaderCell = tableHeaderRow.createChild('th');
    activityHeaderCell.createChild('span', 'network-timing-hidden-header').textContent = i18nString(UIStrings.label);
    activityHeaderCell.scope = 'col';
    const waterfallHeaderCell = tableHeaderRow.createChild('th');
    waterfallHeaderCell.createChild('span', 'network-timing-hidden-header').textContent =
        i18nString(UIStrings.waterfall);
    waterfallHeaderCell.scope = 'col';
    const durationHeaderCell = tableHeaderRow.createChild('th');
    durationHeaderCell.createChild('span', 'network-timing-hidden-header').textContent = i18nString(UIStrings.duration);
    durationHeaderCell.scope = 'col';

    const queuedCell = startTimeHeader.createChild('tr').createChild('td');
    const startedCell = startTimeHeader.createChild('tr').createChild('td');
    queuedCell.colSpan = startedCell.colSpan = 3;
    UI.UIUtils.createTextChild(
        queuedCell, i18nString(UIStrings.queuedAtS, {PH1: calculator.formatValue(request.issueTime(), 2)}));
    UI.UIUtils.createTextChild(
        startedCell, i18nString(UIStrings.startedAtS, {PH1: calculator.formatValue(request.startTime, 2)}));

    let right;
    for (let i = 0; i < timeRanges.length; ++i) {
      const range = timeRanges[i];
      const rangeName = range.name;
      if (rangeName === NetworkTimeCalculator.RequestTimeRangeNames.TOTAL) {
        totalDuration = range.end - range.start;
        continue;
      }
      if (rangeName === NetworkTimeCalculator.RequestTimeRangeNames.PUSH) {
        createHeader(i18nString(UIStrings.serverPush));
      } else if (rangeName === NetworkTimeCalculator.RequestTimeRangeNames.QUEUEING) {
        if (!queueingHeader) {
          queueingHeader = createHeader(i18nString(UIStrings.resourceScheduling));
        }
      } else if (NetworkTimeCalculator.ConnectionSetupRangeNames.has(rangeName)) {
        if (!connectionHeader) {
          connectionHeader = createHeader(i18nString(UIStrings.connectionStart));
        }
      } else if (NetworkTimeCalculator.ServiceWorkerRangeNames.has(rangeName)) {
        if (!serviceworkerHeader) {
          serviceworkerHeader = createHeader('Service Worker');
        }
      } else if (!dataHeader) {
        dataHeader = createHeader(i18nString(UIStrings.requestresponse));
      }

      const left = (scale * (range.start - startTime));
      right = (scale * (endTime - range.end));
      const duration = range.end - range.start;

      const tr = tableElement.createChild('tr');
      const timingBarTitleElement = tr.createChild('td');
      UI.UIUtils.createTextChild(timingBarTitleElement, RequestTimingView.timeRangeTitle(rangeName));

      const row = tr.createChild('td').createChild('div', 'network-timing-row');
      const bar = row.createChild('span', 'network-timing-bar ' + rangeName);
      bar.style.left = left + '%';
      bar.style.right = right + '%';
      bar.textContent = '\u200B';  // Important for 0-time items to have 0 width.
      UI.ARIAUtils.setLabel(row, i18nString(UIStrings.startedAtS, {PH1: calculator.formatValue(range.start, 2)}));
      const label = tr.createChild('td').createChild('div', 'network-timing-bar-title');
      label.textContent = i18n.TimeUtilities.secondsToString(duration, true);

      if (range.name === 'serviceworker-respondwith') {
        timingBarTitleElement.classList.add('network-fetch-timing-bar-clickable');
        tableElement.createChild('tr', 'network-fetch-timing-bar-details');

        timingBarTitleElement.setAttribute('tabindex', '0');
        timingBarTitleElement.setAttribute('role', 'switch');
        UI.ARIAUtils.setChecked(timingBarTitleElement, false);
      }

      if (range.name === 'serviceworker-routerevaluation') {
        timingBarTitleElement.classList.add('network-fetch-timing-bar-clickable');
        tableElement.createChild('tr', 'router-evaluation-timing-bar-details');

        timingBarTitleElement.setAttribute('tabindex', '0');
        timingBarTitleElement.setAttribute('role', 'switch');
        UI.ARIAUtils.setChecked(timingBarTitleElement, false);
      }
    }

    if (!request.finished && !request.preserved) {
      const cell = tableElement.createChild('tr').createChild('td', 'caution');
      cell.colSpan = 3;
      UI.UIUtils.createTextChild(cell, i18nString(UIStrings.cautionRequestIsNotFinishedYet));
    }

    const footer = tableElement.createChild('tr', 'network-timing-footer');
    const note = footer.createChild('td');
    note.colSpan = 1;
    const explanationLink = UI.XLink.XLink.create(
        'https://developer.chrome.com/docs/devtools/network/reference/#timing-explanation',
        i18nString(UIStrings.explanation), undefined, undefined, 'explanation');
    note.appendChild(explanationLink);
    footer.createChild('td');
    UI.UIUtils.createTextChild(footer.createChild('td'), i18n.TimeUtilities.secondsToString(totalDuration, true));

    const serverTimings = request.serverTimings;

    const lastTimingRightEdge = right === undefined ? 100 : right;

    const breakElement = tableElement.createChild('tr', 'network-timing-table-header').createChild('td');
    breakElement.colSpan = 3;
    breakElement.createChild('hr', 'break');

    const serverHeader = tableElement.createChild('tr', 'network-timing-table-header');
    UI.UIUtils.createTextChild(serverHeader.createChild('td'), i18nString(UIStrings.serverTiming));
    serverHeader.createChild('td');
    UI.UIUtils.createTextChild(serverHeader.createChild('td'), i18nString(UIStrings.time));

    if (!serverTimings) {
      const informationRow = tableElement.createChild('tr');
      const information = informationRow.createChild('td');
      information.colSpan = 3;

      const link = UI.XLink.XLink.create(
          'https://web.dev/custom-metrics/#server-timing-api', i18nString(UIStrings.theServerTimingApi), undefined,
          undefined, 'server-timing-api');
      information.appendChild(
          i18n.i18n.getFormatLocalizedString(str_, UIStrings.duringDevelopmentYouCanUseSToAdd, {PH1: link}));

      return tableElement;
    }

    serverTimings.filter(item => item.metric.toLowerCase() !== 'total')
        .forEach(item => addServerTiming(item, lastTimingRightEdge));
    serverTimings.filter(item => item.metric.toLowerCase() === 'total')
        .forEach(item => addServerTiming(item, lastTimingRightEdge));

    return tableElement;

    function addServerTiming(serverTiming: SDK.ServerTiming.ServerTiming, right: number): void {
      const colorGenerator =
          new Common.Color.Generator({min: 0, max: 360, count: 36}, {min: 50, max: 80, count: undefined}, 80);
      const isTotal = serverTiming.metric.toLowerCase() === 'total';
      const tr = tableElement.createChild('tr', isTotal ? 'network-timing-footer' : 'server-timing-row');
      const metricEl = tr.createChild('td', 'network-timing-metric');
      const metricDesc = [serverTiming.metric, serverTiming.description].filter(Boolean).join(' — ');

      // Mark entries from a bespoke format
      if (serverTiming.metric.startsWith('(c')) {
        tr.classList.add('synthetic');
      }

      UI.UIUtils.createTextChild(metricEl, metricDesc);
      UI.Tooltip.Tooltip.install(metricEl, metricDesc);

      const row = tr.createChild('td', 'server-timing-cell--value-bar').createChild('div', 'network-timing-row');

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
      const label =
          tr.createChild('td', 'server-timing-cell--value-text').createChild('div', 'network-timing-bar-title');
      label.textContent = i18n.TimeUtilities.millisToString(serverTiming.value, true);
    }

    function createHeader(title: string): Element {
      const dataHeader = tableElement.createChild('tr', 'network-timing-table-header');
      const headerCell = dataHeader.createChild('td');
      UI.UIUtils.createTextChild(headerCell, title);
      UI.ARIAUtils.markAsHeading(headerCell, 2);
      UI.UIUtils.createTextChild(dataHeader.createChild('td'), '');
      UI.UIUtils.createTextChild(dataHeader.createChild('td'), i18nString(UIStrings.durationC));
      return dataHeader;
    }
  }

  private constructFetchDetailsView(): void {
    if (!this.tableElement) {
      return;
    }

    const document = this.tableElement.ownerDocument;
    const fetchDetailsElement = document.querySelector('.network-fetch-timing-bar-details');

    if (!fetchDetailsElement) {
      return;
    }

    fetchDetailsElement.classList.add('network-fetch-timing-bar-details-collapsed');

    self.onInvokeElement(this.tableElement, this.onToggleFetchDetails.bind(this, fetchDetailsElement));

    const detailsView = new UI.TreeOutline.TreeOutlineInShadow();
    fetchDetailsElement.appendChild(detailsView.element);

    const origRequest = Logs.NetworkLog.NetworkLog.instance().originalRequestForURL(this.request.url());
    if (origRequest) {
      const requestObject = SDK.RemoteObject.RemoteObject.fromLocalObject(origRequest);
      const requestTreeElement = new ObjectUI.ObjectPropertiesSection.RootElement(requestObject);
      requestTreeElement.title = i18nString(UIStrings.originalRequest);
      detailsView.appendChild(requestTreeElement);
    }

    const response = Logs.NetworkLog.NetworkLog.instance().originalResponseForURL(this.request.url());
    if (response) {
      const responseObject = SDK.RemoteObject.RemoteObject.fromLocalObject(response);
      const responseTreeElement = new ObjectUI.ObjectPropertiesSection.RootElement(responseObject);
      responseTreeElement.title = i18nString(UIStrings.responseReceived);
      detailsView.appendChild(responseTreeElement);
    }

    const serviceWorkerResponseSource = document.createElement('div');
    serviceWorkerResponseSource.classList.add('network-fetch-details-treeitem');
    let swResponseSourceString = i18nString(UIStrings.unknown);
    const swResponseSource = this.request.serviceWorkerResponseSource();
    if (swResponseSource) {
      swResponseSourceString = this.getLocalizedResponseSourceForCode(swResponseSource);
    }
    serviceWorkerResponseSource.textContent = i18nString(UIStrings.sourceOfResponseS, {PH1: swResponseSourceString});

    const responseSourceTreeElement = new UI.TreeOutline.TreeElement(serviceWorkerResponseSource);
    detailsView.appendChild(responseSourceTreeElement);

    const cacheNameElement = document.createElement('div');
    cacheNameElement.classList.add('network-fetch-details-treeitem');
    const responseCacheStorageName = this.request.getResponseCacheStorageCacheName();
    if (responseCacheStorageName) {
      cacheNameElement.textContent = i18nString(UIStrings.cacheStorageCacheNameS, {PH1: responseCacheStorageName});
    } else {
      cacheNameElement.textContent = i18nString(UIStrings.cacheStorageCacheNameUnknown);
    }

    const cacheNameTreeElement = new UI.TreeOutline.TreeElement(cacheNameElement);
    detailsView.appendChild(cacheNameTreeElement);

    const retrievalTime = this.request.getResponseRetrievalTime();
    if (retrievalTime) {
      const responseTimeElement = document.createElement('div');
      responseTimeElement.classList.add('network-fetch-details-treeitem');
      responseTimeElement.textContent = i18nString(UIStrings.retrievalTimeS, {PH1: retrievalTime.toString()});
      const responseTimeTreeElement = new UI.TreeOutline.TreeElement(responseTimeElement);
      detailsView.appendChild(responseTimeTreeElement);
    }
  }

  private getLocalizedResponseSourceForCode(swResponseSource: Protocol.Network.ServiceWorkerResponseSource):
      Common.UIString.LocalizedString {
    switch (swResponseSource) {
      case Protocol.Network.ServiceWorkerResponseSource.CacheStorage:
        return i18nString(UIStrings.serviceworkerCacheStorage);
      case Protocol.Network.ServiceWorkerResponseSource.HttpCache:
        return i18nString(UIStrings.fromHttpCache);
      case Protocol.Network.ServiceWorkerResponseSource.Network:
        return i18nString(UIStrings.networkFetch);
      default:
        return i18nString(UIStrings.fallbackCode);
    }
  }

  private onToggleFetchDetails(fetchDetailsElement: Element, event: Event): void {
    if (!event.target) {
      return;
    }

    const target = (event.target as Element);
    if (target.classList.contains('network-fetch-timing-bar-clickable')) {
      if (fetchDetailsElement.classList.contains('network-fetch-timing-bar-details-collapsed')) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelServiceWorkerRespondWith);
      }
      const expanded = target.getAttribute('aria-checked') === 'true';
      target.setAttribute('aria-checked', String(!expanded));

      fetchDetailsElement.classList.toggle('network-fetch-timing-bar-details-collapsed');
      fetchDetailsElement.classList.toggle('network-fetch-timing-bar-details-expanded');
    }
  }

  private constructRouterEvaluationView(): void {
    if (!this.tableElement) {
      return;
    }

    const routerEvaluationDetailsElement = this.tableElement.querySelector('.router-evaluation-timing-bar-details');
    if (!routerEvaluationDetailsElement) {
      return;
    }

    routerEvaluationDetailsElement.classList.add('network-fetch-timing-bar-details-collapsed');

    self.onInvokeElement(
        this.tableElement, this.onToggleRouterEvaluationDetails.bind(this, routerEvaluationDetailsElement));

    const detailsView = new UI.TreeOutline.TreeOutlineInShadow();
    routerEvaluationDetailsElement.appendChild(detailsView.element);

    const {serviceWorkerRouterInfo} = this.request;
    if (!serviceWorkerRouterInfo) {
      return;
    }

    const document = this.tableElement.ownerDocument;

    // Add matched source type element
    const matchedSourceTypeElement = document.createElement('div');
    matchedSourceTypeElement.classList.add('network-fetch-details-treeitem');
    const matchedSourceType = serviceWorkerRouterInfo.matchedSourceType;
    const matchedSourceTypeString = String(matchedSourceType) || i18nString(UIStrings.unknown);
    matchedSourceTypeElement.textContent = i18nString(UIStrings.routerMatchedSource, {PH1: matchedSourceTypeString});

    const matchedSourceTypeTreeElement = new UI.TreeOutline.TreeElement(matchedSourceTypeElement);
    detailsView.appendChild(matchedSourceTypeTreeElement);

    // Add actual source type element
    const actualSourceTypeElement = document.createElement('div');
    actualSourceTypeElement.classList.add('network-fetch-details-treeitem');
    const actualSourceType = serviceWorkerRouterInfo.actualSourceType;
    const actualSourceTypeString = String(actualSourceType) || i18nString(UIStrings.unknown);
    actualSourceTypeElement.textContent = i18nString(UIStrings.routerActualSource, {PH1: actualSourceTypeString});

    const actualSourceTypeTreeElement = new UI.TreeOutline.TreeElement(actualSourceTypeElement);
    detailsView.appendChild(actualSourceTypeTreeElement);
  }

  private onToggleRouterEvaluationDetails(routerEvaluationDetailsElement: Element, event: Event): void {
    if (!event.target) {
      return;
    }

    const target = (event.target as Element);
    if (target.classList.contains('network-fetch-timing-bar-clickable')) {
      const expanded = target.getAttribute('aria-checked') === 'true';
      target.setAttribute('aria-checked', String(!expanded));

      routerEvaluationDetailsElement.classList.toggle('network-fetch-timing-bar-details-collapsed');
      routerEvaluationDetailsElement.classList.toggle('network-fetch-timing-bar-details-expanded');
    }
  }

  override wasShown(): void {
    this.request.addEventListener(SDK.NetworkRequest.Events.TIMING_CHANGED, this.refresh, this);
    this.request.addEventListener(SDK.NetworkRequest.Events.FINISHED_LOADING, this.refresh, this);
    this.calculator.addEventListener(NetworkTimeCalculator.Events.BOUNDARIES_CHANGED, this.boundaryChanged, this);
    this.refresh();
  }

  override willHide(): void {
    this.request.removeEventListener(SDK.NetworkRequest.Events.TIMING_CHANGED, this.refresh, this);
    this.request.removeEventListener(SDK.NetworkRequest.Events.FINISHED_LOADING, this.refresh, this);
    this.calculator.removeEventListener(NetworkTimeCalculator.Events.BOUNDARIES_CHANGED, this.boundaryChanged, this);
  }

  private refresh(): void {
    if (this.tableElement) {
      this.tableElement.remove();
    }

    this.tableElement = RequestTimingView.createTimingTable(this.request, this.calculator);
    this.tableElement.classList.add('resource-timing-table');
    this.element.appendChild(this.tableElement);

    if (this.request.fetchedViaServiceWorker) {
      this.constructFetchDetailsView();
    }

    if (this.request.serviceWorkerRouterInfo) {
      this.constructRouterEvaluationView();
    }
  }

  private boundaryChanged(): void {
    const minimumBoundary = this.calculator.minimumBoundary();
    if (minimumBoundary !== this.lastMinimumBoundary) {
      this.lastMinimumBoundary = minimumBoundary;
      this.refresh();
    }
  }
}

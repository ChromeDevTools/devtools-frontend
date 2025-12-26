// Copyright 2010 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @devtools/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Logs from '../../models/logs/logs.js';
import * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import networkingTimingTableStyles from './networkTimingTable.css.js';

const {repeat, classMap, ifDefined} = Directives;
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
  requestResponse: 'Request/Response',
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
  /**
   * @description Cell title in Network Data Grid Node of the Network panel
   * @example {Fast 4G} PH1
   */
  wasThrottled: 'Request was throttled ({PH1})',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestTimingView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

function timeRangeTitle(name: NetworkTimeCalculator.RequestTimeRangeNames): string {
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

function groupHeader(name: NetworkTimeCalculator.RequestTimeRangeNames): string {
  if (name === NetworkTimeCalculator.RequestTimeRangeNames.PUSH) {
    return i18nString(UIStrings.serverPush);
  }
  if (name === NetworkTimeCalculator.RequestTimeRangeNames.QUEUEING) {
    return i18nString(UIStrings.resourceScheduling);
  }
  if (NetworkTimeCalculator.ConnectionSetupRangeNames.has(name)) {
    return i18nString(UIStrings.connectionStart);
  }
  if (NetworkTimeCalculator.ServiceWorkerRangeNames.has(name)) {
    return 'Service Worker';
  }
  return i18nString(UIStrings.requestResponse);
}

function getLocalizedResponseSourceForCode(swResponseSource: Protocol.Network.ServiceWorkerResponseSource):
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

interface ViewInput {
  requestUnfinished: boolean;
  requestStartTime: number;
  requestIssueTime: number;
  totalDuration: number;
  startTime: number;
  endTime: number;
  timeRanges: NetworkTimeCalculator.RequestTimeRange[];
  calculator: NetworkTimeCalculator.NetworkTimeCalculator;
  serverTimings: SDK.ServerTiming.ServerTiming[];
  fetchDetails?: UI.TreeOutline.TreeOutlineInShadow;
  routerDetails?: UI.TreeOutline.TreeOutlineInShadow;
  wasThrottled?: SDK.NetworkManager.AppliedNetworkConditions;
}

type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, output, target) => {
  const revealThrottled = (): void => {
    if (input.wasThrottled) {
      void Common.Revealer.reveal(input.wasThrottled);
    }
  };
  const scale = 100 / (input.endTime - input.startTime);
  const isClickable = (range: NetworkTimeCalculator.RequestTimeRange): boolean =>
      range.name === 'serviceworker-respondwith' || range.name === 'serviceworker-routerevaluation';
  const addServerTiming = (serverTiming: SDK.ServerTiming.ServerTiming): LitTemplate => {
    const colorGenerator =
        new Common.Color.Generator({min: 0, max: 360, count: 36}, {min: 50, max: 80, count: undefined}, 80);
    const isTotal = serverTiming.metric.toLowerCase() === 'total';
    const metricDesc = [serverTiming.metric, serverTiming.description].filter(Boolean).join(' — ');
    const left =
        serverTiming.value === null ? -1 : scale * (input.endTime - input.startTime - (serverTiming.value / 1000));
    const lastRange =
        input.timeRanges.findLast(range => range.name !== NetworkTimeCalculator.RequestTimeRangeNames.TOTAL);
    const lastTimingRightEdge = lastRange ? (scale * (input.endTime - lastRange.end)) : 100;

    const classes = classMap({
      ['network-timing-footer']: isTotal,
      ['server-timing-row']: !isTotal,
      // Mark entries from a bespoke format
      ['synthetic']: serverTiming.metric.startsWith('(c'),
    });

    // clang-format off
    return html`
      <tr class=${classes}>
        <td title=${metricDesc} class=network-timing-metric>
          ${metricDesc}
        </td>
        ${serverTiming.value === null ? nothing : html`
          <td class=server-timing-cell--value-bar>
            <div class=network-timing-row>
              ${left < 0 // don't chart values too big or too small
                ? nothing
                : html`<span
                    class="network-timing-bar server-timing"
                    data-background=${ifDefined(isTotal ? undefined : colorGenerator.colorForID(serverTiming.metric))}
                    data-left=${left}
                    data-right=${lastTimingRightEdge}>${'\u200B'}</span>`}
            </div>
          </td>
          <td class=server-timing-cell--value-text>
            <div class=network-timing-bar-title>
              ${i18n.TimeUtilities.millisToString(serverTiming.value, true)}
            </div>
          </td>
        `}
      </tr>`;
    // clang-format on
  };

  const onActivate = (e: KeyboardEvent|MouseEvent): void => {
    if ('key' in e && !Platform.KeyboardUtilities.isEnterOrSpaceKey(e)) {
      return;
    }
    const target = e.target as Element | null;
    if (!target?.classList.contains('network-fetch-timing-bar-clickable')) {
      return;
    }
    const isExpanded = target.ariaExpanded === 'true';
    target.ariaExpanded = isExpanded ? 'false' : 'true';
    if (!isExpanded) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelServiceWorkerRespondWith);
    }
  };

  const throttledRequestTitle = input.wasThrottled ? i18nString(UIStrings.wasThrottled, {
    PH1: typeof input.wasThrottled.conditions.title === 'string' ? input.wasThrottled.conditions.title :
                                                                   input.wasThrottled.conditions.title()
  }) :
                                                     undefined;

  const classes = classMap({
    ['network-timing-table']: true,
    ['resource-timing-table']: true,
  });

  const timeRangeGroups: Array<{name: string, ranges: NetworkTimeCalculator.RequestTimeRange[]}> = [];
  for (const range of input.timeRanges) {
    if (range.name === NetworkTimeCalculator.RequestTimeRangeNames.TOTAL) {
      continue;
    }
    const groupName = groupHeader(range.name);
    const tail = timeRangeGroups.at(-1);
    if (tail?.name !== groupName) {
      timeRangeGroups.push({name: groupName, ranges: [range]});
    } else {
      tail.ranges.push(range);
    }
  }

  render(
      // clang-format off
      html`<style>${networkingTimingTableStyles}</style>
    <table
      class=${classes}
      jslog=${VisualLogging.pane('timing').track({
        resize: true
      })}>
        <colgroup>
          <col class=labels></col>
          <col class=bars> </col>
          <col class=duration></col>
        </colgroup>
        <thead class=network-timing-start>
          <tr>
            <th scope=col>
              <span class=network-timing-hidden-header>${i18nString(UIStrings.label)}</span>
            </th>
            <th scope=col>
              <span class=network-timing-hidden-header>${i18nString(UIStrings.waterfall)}</span>
            </th>
            <th scope=col>
              <span class=network-timing-hidden-header>${i18nString(UIStrings.duration)}</span>
            </th>
          </tr>
          <tr>
            <td colspan = 3>
              ${i18nString(UIStrings.queuedAtS, {PH1: input.calculator.formatValue(input.requestIssueTime, 2)})}
            </td>
          </tr>
          <tr>
            <td colspan=3>
              ${i18nString(UIStrings.startedAtS, {PH1: input.calculator.formatValue(input.requestStartTime, 2)})}
            </td>
          </tr>
        </thead>
        ${timeRangeGroups.map(group => html`
          <tr class=network-timing-table-header>
            <td role=heading aria-level=2>
              ${group.name}
            </td>
            <td></td>
            <td>${i18nString(UIStrings.durationC)}</td>
          </tr>
          ${repeat(group.ranges, range => html`
            <tr>
              ${isClickable(range) ? html`<td
                  tabindex=0
                  role=button
                  aria-expanded=false
                  @click=${onActivate}
                  @keydown=${onActivate}
                  class=network-fetch-timing-bar-clickable>
                    ${timeRangeTitle(range.name)}
                </td>`
                : html`<td>
                    ${timeRangeTitle(range.name)}
                </td>`}
              <td>
                <div
                  class=network-timing-row
                  aria-label=${i18nString(UIStrings.startedAtS, {PH1: input.calculator.formatValue(range.start, 2)})}>
                    <span
                      class="network-timing-bar ${range.name}"
                      data-left=${scale * (range.start - input.startTime)}
                      data-right=${scale * (input.endTime - range.end)}>${'\u200B'}</span>
                </div>
              </td>
              <td>
                <div class=network-timing-bar-title>
                  ${i18n.TimeUtilities.secondsToString(range.end - range.start, true)}
                </div>
              </td>
            </tr>
            ${range.name === 'serviceworker-respondwith' && input.fetchDetails ? html`
              <tr class="network-fetch-timing-bar-details network-fetch-timing-bar-details-collapsed">
                ${input.fetchDetails.element}
              </tr>`
              : nothing}
            ${range.name === 'serviceworker-routerevaluation' && input.routerDetails ? html`
              <tr class="router-evaluation-timing-bar-details network-fetch-timing-bar-details-collapsed">
                ${input.routerDetails.element}
              </tr>`
              : nothing}
          `)}
        `)}
        ${input.requestUnfinished ? html`
          <tr>
            <td class=caution colspan=3>
              ${i18nString(UIStrings.cautionRequestIsNotFinishedYet)}
            </td>
          </tr>` : nothing}
       <tr class=network-timing-footer>
         <td colspan=1>
           <x-link
             href="https://developer.chrome.com/docs/devtools/network/reference/#timing-explanation"
             class=devtools-link
             jslog=${VisualLogging.link().track({click: true, keydown:'Enter|Space'}).context('explanation')}>
               ${i18nString(UIStrings.explanation)}
           </x-link>
         <td></td>
         <td class=${input.wasThrottled ? 'throttled' : ''} title=${ifDefined(throttledRequestTitle)}>
           ${input.wasThrottled ? html` <devtools-icon name=watch @click=${revealThrottled}></devtools-icon>` : nothing}
           ${i18n.TimeUtilities.secondsToString(input.totalDuration, true)}
         </td>
       </tr>
       <tr class=network-timing-table-header>
         <td colspan=3>
           <hr class=break />
         </td>
       </tr>
       <tr class=network-timing-table-header>
         <td>${i18nString(UIStrings.serverTiming)}</td>
         <td></td>
         <td>${i18nString(UIStrings.time)}</td>
       </tr>
       ${repeat(input.serverTimings.filter(item => item.metric.toLowerCase() !== 'total'), addServerTiming)}
       ${repeat(input.serverTimings.filter(item => item.metric.toLowerCase() === 'total'), addServerTiming)}
       ${input.serverTimings.length === 0 ? html`
         <tr>
           <td colspan=3>
             ${uiI18n.getFormatLocalizedString(str_, UIStrings.duringDevelopmentYouCanUseSToAdd, {PH1:
                                                  UI.XLink.XLink.create(
                                                    'https://web.dev/custom-metrics/#server-timing-api',
                                                  i18nString(UIStrings.theServerTimingApi),
                                                  undefined,
                                                  undefined,
                                                  'server-timing-api')})}
           </td>
         </tr>` : nothing}
   </table>`,
      // clang-format on
      target);
};

export class RequestTimingView extends UI.Widget.VBox {
  #request?: SDK.NetworkRequest.NetworkRequest;
  #calculator?: NetworkTimeCalculator.NetworkTimeCalculator;
  #lastMinimumBoundary = -1;
  readonly #view: View;
  constructor(target?: HTMLElement, view = DEFAULT_VIEW) {
    super(target, {classes: ['resource-timing-view']});
    this.#view = view;
  }

  static create(request: SDK.NetworkRequest.NetworkRequest, calculator: NetworkTimeCalculator.NetworkTimeCalculator):
      RequestTimingView {
    const view = new RequestTimingView();
    view.request = request;
    view.calculator = calculator;
    view.requestUpdate();
    return view;
  }

  override performUpdate(): void {
    if (!this.#request || !this.#calculator) {
      return;
    }
    const timeRanges =
        NetworkTimeCalculator.calculateRequestTimeRanges(this.#request, this.#calculator.minimumBoundary());
    const startTime = timeRanges.map(r => r.start).reduce((a, b) => Math.min(a, b));
    const endTime = timeRanges.map(r => r.end).reduce((a, b) => Math.max(a, b));
    const total = timeRanges.findLast(range => range.name === NetworkTimeCalculator.RequestTimeRangeNames.TOTAL);
    const totalDuration = total ? total?.end - total?.start : 0;
    const conditions = SDK.NetworkManager.MultitargetNetworkManager.instance().appliedRequestConditions(this.#request);

    const input: ViewInput = {
      startTime,
      endTime,
      totalDuration,
      serverTimings: this.#request.serverTimings ?? [],
      calculator: this.#calculator,
      requestStartTime: this.#request.startTime,
      requestIssueTime: this.#request.issueTime(),
      requestUnfinished: false,
      fetchDetails: this.#fetchDetailsTree(),
      routerDetails: this.#routerDetailsTree(),
      wasThrottled: conditions?.urlPattern ? conditions : undefined,
      timeRanges,
    };
    this.#view(input, {}, this.contentElement);
  }

  #fetchDetailsTree(): UI.TreeOutline.TreeOutlineInShadow|undefined {
    if (!this.#request?.fetchedViaServiceWorker) {
      return undefined;
    }
    const detailsView = new UI.TreeOutline.TreeOutlineInShadow();

    const origRequest = Logs.NetworkLog.NetworkLog.instance().originalRequestForURL(this.#request.url());
    if (origRequest) {
      const requestObject = SDK.RemoteObject.RemoteObject.fromLocalObject(origRequest);
      const requestTreeElement = new ObjectUI.ObjectPropertiesSection.RootElement(
          new ObjectUI.ObjectPropertiesSection.ObjectTree(requestObject));
      requestTreeElement.title = i18nString(UIStrings.originalRequest);
      detailsView.appendChild(requestTreeElement);
    }

    const response = Logs.NetworkLog.NetworkLog.instance().originalResponseForURL(this.#request.url());
    if (response) {
      const responseObject = SDK.RemoteObject.RemoteObject.fromLocalObject(response);
      const responseTreeElement = new ObjectUI.ObjectPropertiesSection.RootElement(
          new ObjectUI.ObjectPropertiesSection.ObjectTree(responseObject));
      responseTreeElement.title = i18nString(UIStrings.responseReceived);
      detailsView.appendChild(responseTreeElement);
    }

    const serviceWorkerResponseSource = document.createElement('div');
    serviceWorkerResponseSource.classList.add('network-fetch-details-treeitem');
    let swResponseSourceString = i18nString(UIStrings.unknown);
    const swResponseSource = this.#request.serviceWorkerResponseSource();
    if (swResponseSource) {
      swResponseSourceString = getLocalizedResponseSourceForCode(swResponseSource);
    }
    serviceWorkerResponseSource.textContent = i18nString(UIStrings.sourceOfResponseS, {PH1: swResponseSourceString});

    const responseSourceTreeElement = new UI.TreeOutline.TreeElement(serviceWorkerResponseSource);
    detailsView.appendChild(responseSourceTreeElement);

    const cacheNameElement = document.createElement('div');
    cacheNameElement.classList.add('network-fetch-details-treeitem');
    const responseCacheStorageName = this.#request.getResponseCacheStorageCacheName();
    if (responseCacheStorageName) {
      cacheNameElement.textContent = i18nString(UIStrings.cacheStorageCacheNameS, {PH1: responseCacheStorageName});
    } else {
      cacheNameElement.textContent = i18nString(UIStrings.cacheStorageCacheNameUnknown);
    }

    const cacheNameTreeElement = new UI.TreeOutline.TreeElement(cacheNameElement);
    detailsView.appendChild(cacheNameTreeElement);

    const retrievalTime = this.#request.getResponseRetrievalTime();
    if (retrievalTime) {
      const responseTimeElement = document.createElement('div');
      responseTimeElement.classList.add('network-fetch-details-treeitem');
      responseTimeElement.textContent = i18nString(UIStrings.retrievalTimeS, {PH1: retrievalTime.toString()});
      const responseTimeTreeElement = new UI.TreeOutline.TreeElement(responseTimeElement);
      detailsView.appendChild(responseTimeTreeElement);
    }
    return detailsView;
  }

  #routerDetailsTree(): UI.TreeOutline.TreeOutlineInShadow|undefined {
    if (!this.#request?.serviceWorkerRouterInfo) {
      return undefined;
    }

    const detailsView = new UI.TreeOutline.TreeOutlineInShadow();

    const {serviceWorkerRouterInfo} = this.#request;
    if (!serviceWorkerRouterInfo) {
      return;
    }

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

    return detailsView;
  }

  set request(request: SDK.NetworkRequest.NetworkRequest) {
    this.#request = request;
    if (this.isShowing()) {
      this.#request.addEventListener(SDK.NetworkRequest.Events.TIMING_CHANGED, this.requestUpdate, this);
      this.#request.addEventListener(SDK.NetworkRequest.Events.FINISHED_LOADING, this.requestUpdate, this);
      this.requestUpdate();
    }
  }

  set calculator(calculator: NetworkTimeCalculator.NetworkTimeCalculator) {
    this.#calculator = calculator;
    if (this.isShowing()) {
      this.#calculator.addEventListener(NetworkTimeCalculator.Events.BOUNDARIES_CHANGED, this.boundaryChanged, this);
      this.requestUpdate();
    }
  }

  override wasShown(): void {
    super.wasShown();
    this.#request?.addEventListener(SDK.NetworkRequest.Events.TIMING_CHANGED, this.requestUpdate, this);
    this.#request?.addEventListener(SDK.NetworkRequest.Events.FINISHED_LOADING, this.requestUpdate, this);
    this.#calculator?.addEventListener(NetworkTimeCalculator.Events.BOUNDARIES_CHANGED, this.boundaryChanged, this);
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
    this.#request?.removeEventListener(SDK.NetworkRequest.Events.TIMING_CHANGED, this.requestUpdate, this);
    this.#request?.removeEventListener(SDK.NetworkRequest.Events.FINISHED_LOADING, this.requestUpdate, this);
    this.#calculator?.removeEventListener(NetworkTimeCalculator.Events.BOUNDARIES_CHANGED, this.boundaryChanged, this);
  }

  private boundaryChanged(): void {
    const minimumBoundary = this.calculator.minimumBoundary();
    if (minimumBoundary !== this.#lastMinimumBoundary) {
      this.#lastMinimumBoundary = minimumBoundary;
      this.requestUpdate();
    }
  }
}

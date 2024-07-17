// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as TraceEngine from '../../../models/trace/trace.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as LegacyComponents from '../../../ui/legacy/components/utils/utils.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as TimelineUtils from '../utils/utils.js';

import NetworkRequestDetailsStyles from './networkRequestDetails.css.js';
import {colorForNetworkRequest} from './Utils.js';

const MAX_URL_LENGTH = 80;

const UIStrings = {
  /**
   *@description Text that refers to updated priority of network request
   */
  initialPriority: 'Initial Priority',
  /**
   *@description Text that refers to the network request method
   */
  requestMethod: 'Request Method',
  /**
   *@description Text to show the priority of an item
   */
  priority: 'Priority',
  /**
   *@description Text used when referring to the data sent in a network request that is encoded as a particular file format.
   */
  encodedData: 'Encoded Data',
  /**
   *@description Text used to refer to the data sent in a network request that has been decoded.
   */
  decodedBody: 'Decoded Body',
  /**
   *@description Text in Timeline indicating that input has happened recently
   */
  yes: 'Yes',
  /**
   *@description Text in Timeline indicating that input has not happened recently
   */
  no: 'No',
  /**
   *@description Text for previewing items
   */
  preview: 'Preview',
  /**
   *@description Text to indicate to the user they are viewing an event representing a network request.
   */
  networkRequest: 'Network request',
  /**
   *@description Text for the duration of something
   */
  duration: 'Duration',
  /**
   *@description Text for the data source of a network request.
   */
  fromCache: 'From cache',
  /**
   *@description Text used to show the mime-type of the data transferred with a network request (e.g. "application/json").
   */
  mimeType: 'Mime Type',
  /**
   *@description Text used to show the user that a request was served from the browser's in-memory cache.
   */
  FromMemoryCache: ' (from memory cache)',
  /**
   *@description Text used to show the user that a request was served from the browser's file cache.
   */
  FromCache: ' (from cache)',
  /**
   *@description Label for a network request indicating that it was a HTTP2 server push instead of a regular network request, in the Performance panel
   */
  FromPush: ' (from push)',
  /**
   *@description Text used to show a user that a request was served from an installed, active service worker.
   */
  FromServiceWorker: ' (from `service worker`)',
  /**
   *@description Text for the event initiated by another one
   */
  initiatedBy: 'Initiated by',
  /**
   *@description Text that refers to the queueing and connecting time of a network request
   */
  queuingAndConnecting: 'Queuing and connecting',
  /**
   *@description Text that refers to the request sent and waiting time of a network request
   */
  requestSentAndWaiting: 'Request sent and waiting',
  /**
   *@description Text that refers to the content downloading time of a network request
   */
  contentDownloading: 'Content downloading',
  /**
   *@description Text that refers to the waiting on main thread time of a network request
   */
  waitingOnMainThread: 'Waiting on main thread',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/NetworkRequestDetails.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class NetworkRequestDetails extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-performance-network-request-details`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #networkRequest: TraceEngine.Types.TraceEvents.SyntheticNetworkRequest|null = null;
  #maybeTarget: SDK.Target.Target|null = null;
  #requestPreviewElements = new WeakMap<TraceEngine.Types.TraceEvents.SyntheticNetworkRequest, HTMLImageElement>();
  #linkifier: LegacyComponents.Linkifier.Linkifier;
  constructor(linkifier: LegacyComponents.Linkifier.Linkifier) {
    super();
    this.#linkifier = linkifier;
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [NetworkRequestDetailsStyles];
  }

  async setData(
      networkRequest: TraceEngine.Types.TraceEvents.SyntheticNetworkRequest,
      maybeTarget: SDK.Target.Target|null): Promise<void> {
    if (this.#networkRequest === networkRequest) {
      return;
    }
    this.#networkRequest = networkRequest;
    this.#maybeTarget = maybeTarget;
    await this.#render();
  }

  #renderTitle(): LitHtml.TemplateResult|null {
    if (!this.#networkRequest) {
      return null;
    }
    const style = {
      backgroundColor: `${colorForNetworkRequest(this.#networkRequest)}`,
    };
    return LitHtml.html`
      <div class="network-request-details-title">
        <div style=${LitHtml.Directives.styleMap(style)}"></div>
        ${i18nString(UIStrings.networkRequest)}
      </div>
    `;
  }

  #renderRow(title: string, value?: string|Node|LitHtml.TemplateResult): LitHtml.TemplateResult|null {
    if (!value) {
      return null;
    }
    return LitHtml.html`
      <div class="network-request-details-row"><div class="title">${title}</div><div class="value">${value}</div></div>
    `;
  }

  #renderURL(): LitHtml.TemplateResult|null {
    if (!this.#networkRequest) {
      return null;
    }
    const options: LegacyComponents.Linkifier.LinkifyURLOptions = {
      tabStop: true,
      showColumnNumber: false,
      inlineFrameIndex: 0,
      maxLength: MAX_URL_LENGTH,
    };
    const linkifiedURL = LegacyComponents.Linkifier.Linkifier.linkifyURL(
        this.#networkRequest.args.data.url as Platform.DevToolsPath.UrlString, options);
    linkifiedURL.addEventListener('contextmenu', (event: MouseEvent) => {
      if (!this.#networkRequest) {
        return;
      }
      // Add a wrapper class here. The reason is the `Reveal in Network panel` option is handled by the context menu
      // provider, which will add this option for all supporting types. And there are a lot of context menu providers that
      // support `SDK.NetworkRequest.NetworkRequest`, for example `Override content` by PersistenceActions, but we so far
      // just want the one to reveal in network panel, so add a new class which will only be supported by Network panel.
      const request = new TimelineUtils.NetworkRequest.TimelineNetworkRequest(this.#networkRequest);
      const contextMenu = new UI.ContextMenu.ContextMenu(event, {useSoftMenu: true});
      contextMenu.appendApplicableItems(request);
      void contextMenu.show();
    });
    return this.#renderRow(i18n.i18n.lockedString('URL'), linkifiedURL);
  }

  #renderFromCache(): LitHtml.TemplateResult|null {
    if (!this.#networkRequest) {
      return null;
    }
    const cached = this.#networkRequest.args.data.syntheticData.isMemoryCached ||
        this.#networkRequest.args.data.syntheticData.isDiskCached;
    return this.#renderRow(
        i18nString(UIStrings.fromCache), cached ? i18nString(UIStrings.yes) : i18nString(UIStrings.no));
  }

  #renderDuration(): LitHtml.TemplateResult|null {
    if (!this.#networkRequest) {
      return null;
    }
    const fullDuration = this.#networkRequest.dur;
    if (!isFinite(fullDuration)) {
      return null;
    }
    const durationValue = i18n.TimeUtilities.formatMicroSecondsTime(fullDuration);
    const durationElement = LitHtml.html`
      <div>
        ${durationValue}
        ${this.#renderTimings()}
      </div>
    `;

    return this.#renderRow(i18nString(UIStrings.duration), durationElement);
  }

  #renderEncodedDataLength(): LitHtml.TemplateResult|null {
    if (!this.#networkRequest) {
      return null;
    }
    let lengthText = '';
    if (this.#networkRequest.args.data.syntheticData.isMemoryCached) {
      lengthText += i18nString(UIStrings.FromMemoryCache);
    } else if (this.#networkRequest.args.data.syntheticData.isDiskCached) {
      lengthText += i18nString(UIStrings.FromCache);
    } else if (this.#networkRequest.args.data.timing?.pushStart) {
      lengthText += i18nString(UIStrings.FromPush);
    }
    if (this.#networkRequest.args.data.fromServiceWorker) {
      lengthText += i18nString(UIStrings.FromServiceWorker);
    }
    if (this.#networkRequest.args.data.encodedDataLength || !lengthText) {
      lengthText =
          `${Platform.NumberUtilities.bytesToString(this.#networkRequest.args.data.encodedDataLength)}${lengthText}`;
    }
    return this.#renderRow(i18nString(UIStrings.encodedData), lengthText);
  }

  #renderInitiatedBy(): LitHtml.TemplateResult|null {
    if (!this.#networkRequest) {
      return null;
    }

    const topFrame = TraceEngine.Helpers.Trace.getZeroIndexedStackTraceForEvent(this.#networkRequest)?.at(0) ?? null;
    if (topFrame) {
      const link = this.#linkifier.maybeLinkifyConsoleCallFrame(
          this.#maybeTarget, topFrame, {tabStop: true, inlineFrameIndex: 0, showColumnNumber: true});
      if (link) {
        return this.#renderRow(i18nString(UIStrings.initiatedBy), link);
      }
    }
    return null;
  }

  async #renderPreviewElement(): Promise<LitHtml.TemplateResult|null> {
    if (!this.#networkRequest) {
      return null;
    }
    if (!this.#requestPreviewElements.get(this.#networkRequest) && this.#networkRequest.args.data.url &&
        this.#maybeTarget) {
      const previewElement =
          (await LegacyComponents.ImagePreview.ImagePreview.build(
               this.#maybeTarget, this.#networkRequest.args.data.url as Platform.DevToolsPath.UrlString, false, {
                 imageAltText: LegacyComponents.ImagePreview.ImagePreview.defaultAltTextForImageURL(
                     this.#networkRequest.args.data.url as Platform.DevToolsPath.UrlString),
                 precomputedFeatures: undefined,
               }) as HTMLImageElement);

      this.#requestPreviewElements.set(this.#networkRequest, previewElement);
    }

    const requestPreviewElement = this.#requestPreviewElements.get(this.#networkRequest);
    if (requestPreviewElement) {
      return this.#renderRow(i18nString(UIStrings.preview), requestPreviewElement);
    }
    return null;
  }

  #renderLeftWhisker(): LitHtml.TemplateResult {
    // So the outside span will be a transparent rectangle with a left border.
    // The inside span is just a rectangle with background color, and it is vertical centered.
    // |
    // |----
    // |
    return LitHtml.html`<span class="whisker-left"> <span class="horizontal"></span> </span>`;
  }

  #renderRightWhisker(): LitHtml.TemplateResult {
    // So the outside span will be a transparent rectangle with a right border.
    // The inside span is just a rectangle with background color, and it is vertical centered.
    //      |
    //  ----|
    //      |
    return LitHtml.html`<span class="whisker-right"> <span class="horizontal"></span> </span>`;
  }

  #renderTimings(): LitHtml.TemplateResult|null {
    if (!this.#networkRequest) {
      return null;
    }
    const syntheticData = this.#networkRequest.args.data.syntheticData;
    const queueing = (syntheticData.sendStartTime - this.#networkRequest.ts) as TraceEngine.Types.Timing.MicroSeconds;
    const requestPlusWaiting =
        (syntheticData.downloadStart - syntheticData.sendStartTime) as TraceEngine.Types.Timing.MicroSeconds;
    const download = (syntheticData.finishTime - syntheticData.downloadStart) as TraceEngine.Types.Timing.MicroSeconds;
    const waitingOnMainThread = (this.#networkRequest.ts + this.#networkRequest.dur - syntheticData.finishTime) as
        TraceEngine.Types.Timing.MicroSeconds;

    const color = colorForNetworkRequest(this.#networkRequest);
    const styleForWaiting = {
      backgroundColor: `color-mix(in srgb, ${color}, hsla(0, 100%, 100%, 0.8))`,
    };
    const styleForDownloading = {
      backgroundColor: color,
    };

    return LitHtml.html`
      <div class="timings-row">
        ${this.#renderLeftWhisker()}
        ${i18nString(UIStrings.queuingAndConnecting)}
        <span class="time">${i18n.TimeUtilities.formatMicroSecondsTime(queueing)}</span>
      </div>
      <div class="timings-row">
        <span class="indicator" style=${LitHtml.Directives.styleMap(styleForWaiting)}></span>
        ${i18nString(UIStrings.requestSentAndWaiting)}
        <span class="time">${i18n.TimeUtilities.formatMicroSecondsTime(requestPlusWaiting)}</span>
      </div>
      <div class="timings-row">
        <span class="indicator" style=${LitHtml.Directives.styleMap(styleForDownloading)}></span>
        ${i18nString(UIStrings.contentDownloading)}
        <span class="time">${i18n.TimeUtilities.formatMicroSecondsTime(download)}</span>
      </div>
      <div class="timings-row">
        ${this.#renderRightWhisker()}
        ${i18nString(UIStrings.waitingOnMainThread)}
        <span class="time">${i18n.TimeUtilities.formatMicroSecondsTime(waitingOnMainThread)}</span>
      </div>
    `;
  }

  async #render(): Promise<void> {
    if (!this.#networkRequest) {
      return;
    }
    const networkData = this.#networkRequest.args.data;
    // clang-format off
    const output = LitHtml.html`
      ${this.#renderTitle()}
      <div class="network-request-details-body">
        <div class="network-request-details-col">
          ${this.#renderURL()}
          ${this.#renderRow(i18nString(UIStrings.requestMethod), networkData.requestMethod)}
          ${this.#renderRow(i18nString(UIStrings.initialPriority), PerfUI.NetworkPriorities.uiLabelForNetworkPriority(networkData.initialPriority))}
          ${this.#renderRow(i18nString(UIStrings.priority), PerfUI.NetworkPriorities.uiLabelForNetworkPriority(networkData.priority))}
          ${this.#renderRow(i18nString(UIStrings.mimeType), networkData.mimeType)}
          ${this.#renderEncodedDataLength()}
          ${this.#renderRow(i18nString(UIStrings.decodedBody), Platform.NumberUtilities.bytesToString(this.#networkRequest.args.data.decodedBodyLength))}
          ${this.#renderInitiatedBy()}
          ${await this.#renderPreviewElement()}
        </div>
        <div class="network-request-details-col">
          ${this.#renderFromCache()}
          ${this.#renderDuration()}
        </div>
      </div>
    `;
    // clang-format on
    LitHtml.render(output, this.#shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-network-request-details': NetworkRequestDetails;
  }
}

customElements.define('devtools-performance-network-request-details', NetworkRequestDetails);

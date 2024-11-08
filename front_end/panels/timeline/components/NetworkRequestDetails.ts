// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/request_link_icon/request_link_icon.js';

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as Helpers from '../../../models/trace/helpers/helpers.js';
import * as Trace from '../../../models/trace/trace.js';
import * as LegacyComponents from '../../../ui/legacy/components/utils/utils.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as TimelineUtils from '../utils/utils.js';

import NetworkRequestDetailsStyles from './networkRequestDetails.css.js';
import networkRequestTooltipStyles from './networkRequestTooltip.css.js';
import {NetworkRequestTooltip} from './NetworkRequestTooltip.js';
import {colorForNetworkRequest} from './Utils.js';

const {html} = LitHtml;

const MAX_URL_LENGTH = 100;

const UIStrings = {
  /**
   *@description Text that refers to the network request method
   */
  requestMethod: 'Request method',
  /**
   *@description Text to show the priority of an item
   */
  priority: 'Priority',
  /**
   *@description Text used when referring to the data sent in a network request that is encoded as a particular file format.
   */
  encodedData: 'Encoded data',
  /**
   *@description Text used to refer to the data sent in a network request that has been decoded.
   */
  decodedBody: 'Decoded body',
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
   *@description Text for the data source of a network request.
   */
  fromCache: 'From cache',
  /**
   *@description Text used to show the mime-type of the data transferred with a network request (e.g. "application/json").
   */
  mimeType: 'MIME type',
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
   *@description Text that refers to if the network request is blocking
   */
  blocking: 'Blocking',
  /**
   *@description Text that refers to if the network request is in-body parser render blocking
   */
  inBodyParserBlocking: 'In-body parser blocking',
  /**
   *@description Text that refers to if the network request is render blocking
   */
  renderBlocking: 'Render blocking',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/NetworkRequestDetails.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class NetworkRequestDetails extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #networkRequest: Trace.Types.Events.SyntheticNetworkRequest|null = null;
  #maybeTarget: SDK.Target.Target|null = null;
  #requestPreviewElements = new WeakMap<Trace.Types.Events.SyntheticNetworkRequest, HTMLImageElement>();
  #linkifier: LegacyComponents.Linkifier.Linkifier;
  #parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null;
  constructor(linkifier: LegacyComponents.Linkifier.Linkifier) {
    super();
    this.#linkifier = linkifier;
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [NetworkRequestDetailsStyles, networkRequestTooltipStyles];
  }

  async setData(
      parsedTrace: Trace.Handlers.Types.ParsedTrace, networkRequest: Trace.Types.Events.SyntheticNetworkRequest,
      maybeTarget: SDK.Target.Target|null): Promise<void> {
    if (this.#networkRequest === networkRequest && parsedTrace === this.#parsedTrace) {
      return;
    }
    this.#parsedTrace = parsedTrace;
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
    return html`
      <div class="network-request-details-title">
        <div style=${LitHtml.Directives.styleMap(style)}></div>
        ${i18nString(UIStrings.networkRequest)}
      </div>
    `;
  }

  #renderRow(title: string, value?: string|Node|LitHtml.TemplateResult): LitHtml.TemplateResult|null {
    if (!value) {
      return null;
    }
    return html`
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

    const networkRequest = TimelineUtils.NetworkRequest.getNetworkRequest(this.#networkRequest);
    if (networkRequest) {
      linkifiedURL.addEventListener('contextmenu', (event: MouseEvent) => {
        if (!this.#networkRequest) {
          return;
        }
        // Add a wrapper class here.
        // The main reason is the `Open in Network panel` option is handled by the context menu provider, which will
        // add this option for all supporting types. And there are a lot of context menu providers that support
        // `SDK.NetworkRequest.NetworkRequest`, for example `Override content` by PersistenceActions, but we so far just
        // want the one to reveal in network panel, so add a new class which will only be supported by Network panel.
        // Also we want to have a different behavior(select the network request) from the
        // `SDK.NetworkRequest.NetworkRequest` (highlight the network request once).
        const contextMenu = new UI.ContextMenu.ContextMenu(event, {useSoftMenu: true});
        contextMenu.appendApplicableItems(new TimelineUtils.NetworkRequest.TimelineNetworkRequest(networkRequest));
        void contextMenu.show();
      });

      // clang-format off
      const urlElement = html`
        ${linkifiedURL}
        <devtools-request-link-icon .data=${{request: networkRequest}}>
        </devtools-request-link-icon>
      `;
      // clang-format on
      return html`<div class="network-request-details-row">${urlElement}</div>`;
    }

    return html`<div class="network-request-details-row">${linkifiedURL}</div>`;
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
      lengthText = `${i18n.ByteUtilities.bytesToString(this.#networkRequest.args.data.encodedDataLength)}${lengthText}`;
    }
    return this.#renderRow(i18nString(UIStrings.encodedData), lengthText);
  }

  #renderInitiatedBy(): LitHtml.TemplateResult|null {
    if (!this.#networkRequest) {
      return null;
    }

    const hasStackTrace = Trace.Helpers.Trace.stackTraceForEvent(this.#networkRequest) !== null;

    // If we have a stack trace, that is the most reliable way to get the initiator data and display a link to the source.
    if (hasStackTrace) {
      const topFrame = Trace.Helpers.Trace.getZeroIndexedStackTraceForEvent(this.#networkRequest)?.at(0) ?? null;
      if (topFrame) {
        const link = this.#linkifier.maybeLinkifyConsoleCallFrame(
            this.#maybeTarget, topFrame, {tabStop: true, inlineFrameIndex: 0, showColumnNumber: true});
        if (link) {
          return this.#renderRow(i18nString(UIStrings.initiatedBy), link);
        }
      }
    }
    // If we do not, we can see if the network handler found an initiator and try to link by URL
    const initiator = this.#parsedTrace?.NetworkRequests.eventToInitiator.get(this.#networkRequest);
    if (initiator) {
      const link = this.#linkifier.maybeLinkifyScriptLocation(
          this.#maybeTarget,
          null,  // this would be the scriptId, but we don't have one. The linkifier will fallback to using the URL.
          initiator.args.data.url as Platform.DevToolsPath.UrlString,
          undefined,  // line number
      );
      if (link) {
        return this.#renderRow(i18nString(UIStrings.initiatedBy), link);
      }
    }

    return null;
  }

  #renderBlockingRow(): LitHtml.TemplateResult|null {
    if (!this.#networkRequest || !Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(this.#networkRequest)) {
      return null;
    }

    let renderBlockingText;
    switch (this.#networkRequest.args.data.renderBlocking) {
      case 'blocking':
        renderBlockingText = UIStrings.renderBlocking;
        break;
      case 'in_body_parser_blocking':
        renderBlockingText = UIStrings.inBodyParserBlocking;
        break;
      default:
        // Shouldn't fall to this block, if so, this network request is not render blocking, so return null.
        return null;
    }
    return this.#renderRow(i18nString(UIStrings.blocking), renderBlockingText);
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
                 align: LegacyComponents.ImagePreview.Align.START,
               }) as HTMLImageElement);

      this.#requestPreviewElements.set(this.#networkRequest, previewElement);
    }

    const requestPreviewElement = this.#requestPreviewElements.get(this.#networkRequest);
    if (requestPreviewElement) {
      return this.#renderRow(i18nString(UIStrings.preview), requestPreviewElement);
    }
    return null;
  }

  async #render(): Promise<void> {
    if (!this.#networkRequest) {
      return;
    }
    const networkData = this.#networkRequest.args.data;

    // clang-format off
    const output = html`
      ${this.#renderTitle()}
      ${this.#renderURL()}
      <div class="network-request-details-cols">
        <div class="network-request-details-col">
          ${this.#renderRow(i18nString(UIStrings.requestMethod), networkData.requestMethod)}
          ${this.#renderRow(i18nString(UIStrings.priority), NetworkRequestTooltip.renderPriorityValue(this.#networkRequest))}
          ${this.#renderRow(i18nString(UIStrings.mimeType), networkData.mimeType)}
          ${this.#renderEncodedDataLength()}
          ${this.#renderRow(i18nString(UIStrings.decodedBody), i18n.ByteUtilities.bytesToString(this.#networkRequest.args.data.decodedBodyLength))}
          ${this.#renderBlockingRow()}
          ${this.#renderFromCache()}
        </div>
        <div class="network-request-details-col">
          <div class="timing-rows">
            ${NetworkRequestTooltip.renderTimings(this.#networkRequest)}
          </div>
        </div>
      </div>
      ${this.#renderInitiatedBy()}
      ${await this.#renderPreviewElement()}
    `; // The last items are outside the 2 column layout because InitiatedBy can be very wide
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

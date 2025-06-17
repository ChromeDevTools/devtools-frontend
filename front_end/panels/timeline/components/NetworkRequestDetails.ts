// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../../ui/components/request_link_icon/request_link_icon.js';

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Helpers from '../../../models/trace/helpers/helpers.js';
import * as Trace from '../../../models/trace/trace.js';
import * as LegacyComponents from '../../../ui/legacy/components/utils/utils.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import type * as TimelineUtils from '../utils/utils.js';

import networkRequestDetailsStyles from './networkRequestDetails.css.js';
import networkRequestTooltipStyles from './networkRequestTooltip.css.js';
import {NetworkRequestTooltip} from './NetworkRequestTooltip.js';
import {colorForNetworkRequest} from './Utils.js';

const {html} = Lit;

const MAX_URL_LENGTH = 100;

const UIStrings = {
  /**
   *@description Text that refers to the network request method
   */
  requestMethod: 'Request method',
  /**
   *@description Text that refers to the network request protocol
   */
  protocol: 'Protocol',
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
  /**
   * @description Text to refer to a 3rd Party entity.
   */
  entity: '3rd party',
  /**
   * @description Label for a column containing the names of timings (performance metric) taken in the server side application.
   */
  serverTiming: 'Server timing',
  /**
   * @description Label for a column containing the values of timings (performance metric) taken in the server side application.
   */
  time: 'Time',
  /**
   * @description Label for a column containing the description of timings (performance metric) taken in the server side application.
   */
  description: 'Description',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/NetworkRequestDetails.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class NetworkRequestDetails extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #networkRequest: Trace.Types.Events.SyntheticNetworkRequest|null = null;
  #maybeTarget: SDK.Target.Target|null = null;
  #requestPreviewElements = new WeakMap<Trace.Types.Events.SyntheticNetworkRequest, HTMLElement>();
  #linkifier: LegacyComponents.Linkifier.Linkifier;
  #parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null;
  #entityMapper: TimelineUtils.EntityMapper.EntityMapper|null = null;
  #serverTimings: SDK.ServerTiming.ServerTiming[]|null = null;
  constructor(linkifier: LegacyComponents.Linkifier.Linkifier) {
    super();
    this.#linkifier = linkifier;
  }

  async setData(
      parsedTrace: Trace.Handlers.Types.ParsedTrace, networkRequest: Trace.Types.Events.SyntheticNetworkRequest,
      maybeTarget: SDK.Target.Target|null, entityMapper: TimelineUtils.EntityMapper.EntityMapper|null): Promise<void> {
    if (this.#networkRequest === networkRequest && parsedTrace === this.#parsedTrace) {
      return;
    }
    this.#parsedTrace = parsedTrace;
    this.#networkRequest = networkRequest;
    this.#maybeTarget = maybeTarget;
    this.#entityMapper = entityMapper;
    this.#serverTimings = null;

    for (const header of networkRequest.args.data.responseHeaders ?? []) {
      const headerName = header.name.toLocaleLowerCase();
      // Some popular hosting providers like vercel or render get rid of
      // Server-Timing headers added by users, so as a workaround we
      // also support server timing headers with the `-test` suffix
      // while this feature is experimental, to enable easier trials.
      if (headerName === 'server-timing' || headerName === 'server-timing-test') {
        header.name = 'server-timing';
        this.#serverTimings = SDK.ServerTiming.ServerTiming.parseHeaders([header]);
        break;
      }
    }
    await this.#render();
  }

  #renderTitle(): Lit.TemplateResult|null {
    if (!this.#networkRequest) {
      return null;
    }
    const style = {
      backgroundColor: `${colorForNetworkRequest(this.#networkRequest)}`,
    };
    return html`
      <div class="network-request-details-title">
        <div style=${Lit.Directives.styleMap(style)}></div>
        ${i18nString(UIStrings.networkRequest)}
      </div>
    `;
  }

  #renderRow(title: string, value?: string|Node|Lit.TemplateResult): Lit.TemplateResult|null {
    if (!value) {
      return null;
    }
    // clang-format off
    return html`
      <div class="network-request-details-row">
        <div class="title">${title}</div>
        <div class="value">${value}</div>
      </div>`;
    // clang-format on
  }

  #renderServerTimings(): Lit.LitTemplate[]|Lit.LitTemplate {
    if (!this.#serverTimings) {
      return Lit.nothing;
    }
    // clang-format off
    return html`
      <div class="column-divider"></div>
      <div class="network-request-details-col server-timings">
          <div class="server-timing-column-header">${i18nString(UIStrings.serverTiming)}</div>
          <div class="server-timing-column-header">${i18nString(UIStrings.description)}</div>
          <div class="server-timing-column-header">${i18nString(UIStrings.time)}</div>
        ${this.#serverTimings.map(timing => {
          const classes = timing.metric.startsWith('(c') ? 'synthetic value' : 'value';
          return html`
              <div class=${classes}>${timing.metric || '-'}</div>
              <div class=${classes}>${timing.description || '-'}</div>
              <div class=${classes}>${timing.value || '-'}</div>
          `;
        })}
      </div>`;
    // clang-format on
  }

  #renderURL(): Lit.TemplateResult|null {
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

    // Potentially link to request within Network Panel
    const networkRequest = SDK.TraceObject.RevealableNetworkRequest.create(this.#networkRequest);
    if (networkRequest) {
      linkifiedURL.addEventListener('contextmenu', (event: MouseEvent) => {
        if (!this.#networkRequest) {
          return;
        }
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        contextMenu.appendApplicableItems(networkRequest);
        void contextMenu.show();
      });

      // clang-format off
      const urlElement = html`
        ${linkifiedURL}
        <devtools-request-link-icon .data=${{request: networkRequest.networkRequest}}>
        </devtools-request-link-icon>
      `;
      // clang-format on
      return html`<div class="network-request-details-item">${urlElement}</div>`;
    }

    return html`<div class="network-request-details-item">${linkifiedURL}</div>`;
  }

  #renderFromCache(): Lit.TemplateResult|null {
    if (!this.#networkRequest) {
      return null;
    }
    const cached = this.#networkRequest.args.data.syntheticData.isMemoryCached ||
        this.#networkRequest.args.data.syntheticData.isDiskCached;
    return this.#renderRow(
        i18nString(UIStrings.fromCache), cached ? i18nString(UIStrings.yes) : i18nString(UIStrings.no));
  }

  #renderThirdPartyEntity(): Lit.TemplateResult|null {
    if (!this.#entityMapper || !this.#networkRequest) {
      return null;
    }
    const entity = this.#entityMapper.entityForEvent(this.#networkRequest);
    if (!entity) {
      return null;
    }
    return this.#renderRow(i18nString(UIStrings.entity), entity.name);
  }

  #renderEncodedDataLength(): Lit.TemplateResult|null {
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

  #renderInitiatedBy(): Lit.TemplateResult|null {
    if (!this.#networkRequest) {
      return null;
    }

    const hasStackTrace = Trace.Helpers.Trace.stackTraceInEvent(this.#networkRequest) !== null;
    let link: HTMLElement|null = null;
    const options: LegacyComponents.Linkifier.LinkifyOptions = {
      tabStop: true,
      showColumnNumber: true,
      inlineFrameIndex: 0,
    };
    // If we have a stack trace, that is the most reliable way to get the initiator data and display a link to the source.
    if (hasStackTrace) {
      const topFrame = Trace.Helpers.Trace.getZeroIndexedStackTraceInEventPayload(this.#networkRequest)?.at(0) ?? null;
      if (topFrame) {
        link = this.#linkifier.maybeLinkifyConsoleCallFrame(this.#maybeTarget, topFrame, options);
      }
    }
    // If we do not, we can see if the network handler found an initiator and try to link by URL
    const initiator = this.#parsedTrace?.NetworkRequests.eventToInitiator.get(this.#networkRequest);
    if (initiator) {
      link = this.#linkifier.maybeLinkifyScriptLocation(
          this.#maybeTarget,
          null,  // this would be the scriptId, but we don't have one. The linkifier will fallback to using the URL.
          initiator.args.data.url as Platform.DevToolsPath.UrlString,
          undefined,  // line number
          options);
    }

    if (!link) {
      return null;
    }

    // clang-format off
    return html`
      <div class="network-request-details-item">
        <div class="title">${i18nString(UIStrings.initiatedBy)}</div>
        <div class="value focusable-outline">${link}</div>
      </div>`;
    // clang-format on
  }

  #renderBlockingRow(): Lit.TemplateResult|null {
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

  async #renderPreviewElement(): Promise<Lit.TemplateResult|null> {
    if (!this.#networkRequest || !this.#networkRequest.args.data.url || !this.#maybeTarget) {
      return null;
    }
    if (!this.#requestPreviewElements.get(this.#networkRequest)) {
      const previewOpts = {
        imageAltText: LegacyComponents.ImagePreview.ImagePreview.defaultAltTextForImageURL(
            this.#networkRequest.args.data.url as Platform.DevToolsPath.UrlString),
        precomputedFeatures: undefined,
        align: LegacyComponents.ImagePreview.Align.START,
        hideFileData: true,
      };

      const previewElement = await LegacyComponents.ImagePreview.ImagePreview.build(
          this.#networkRequest.args.data.url as Platform.DevToolsPath.UrlString, false, previewOpts);
      previewElement && this.#requestPreviewElements.set(this.#networkRequest, previewElement);
    }

    const requestPreviewElement = this.#requestPreviewElements.get(this.#networkRequest);
    if (requestPreviewElement) {
      // clang-format off
      return html`
        <div class="network-request-details-col">${requestPreviewElement}</div>
        <div class="column-divider"></div>`;
      // clang-format on
    }
    return null;
  }

  async #render(): Promise<void> {
    if (!this.#networkRequest) {
      return;
    }
    const networkData = this.#networkRequest.args.data;

    const redirectsHtml = NetworkRequestTooltip.renderRedirects(this.#networkRequest);

    // clang-format off
    const output = html`
      <style>${networkRequestDetailsStyles}</style>
      <style>${networkRequestTooltipStyles}</style>
      <div class="network-request-details-content">
        ${this.#renderTitle()}
        ${this.#renderURL()}
        <div class="network-request-details-cols">
          ${await this.#renderPreviewElement()}
          <div class="network-request-details-col">
            ${this.#renderRow(i18nString(UIStrings.requestMethod), networkData.requestMethod)}
            ${this.#renderRow(i18nString(UIStrings.protocol), networkData.protocol)}
            ${this.#renderRow(i18nString(UIStrings.priority), NetworkRequestTooltip.renderPriorityValue(this.#networkRequest))}
            ${this.#renderRow(i18nString(UIStrings.mimeType), networkData.mimeType)}
            ${this.#renderEncodedDataLength()}
            ${this.#renderRow(i18nString(UIStrings.decodedBody), i18n.ByteUtilities.bytesToString(this.#networkRequest.args.data.decodedBodyLength))}
            ${this.#renderBlockingRow()}
            ${this.#renderFromCache()}
            ${this.#renderThirdPartyEntity()}
          </div>
          <div class="column-divider"></div>
          <div class="network-request-details-col">
            <div class="timing-rows">
              ${NetworkRequestTooltip.renderTimings(this.#networkRequest)}
            </div>
          </div>
          ${this.#renderServerTimings()}
          ${redirectsHtml ? html `
            <div class="column-divider"></div>
            <div class="network-request-details-col redirect-details">
              ${redirectsHtml}
            </div>
          ` : Lit.nothing}
        </div>
        ${this.#renderInitiatedBy()}
      </div>
    `; // The last items are outside the 2 column layout because InitiatedBy can be very wide
    // clang-format on
    Lit.render(output, this.#shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-network-request-details': NetworkRequestDetails;
  }
}

customElements.define('devtools-performance-network-request-details', NetworkRequestDetails);

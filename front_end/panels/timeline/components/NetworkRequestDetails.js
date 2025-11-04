// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/components/request_link_icon/request_link_icon.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Helpers from '../../../models/trace/helpers/helpers.js';
import * as Trace from '../../../models/trace/trace.js';
import * as LegacyComponents from '../../../ui/legacy/components/utils/utils.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import networkRequestDetailsStyles from './networkRequestDetails.css.js';
import networkRequestTooltipStyles from './networkRequestTooltip.css.js';
import { NetworkRequestTooltip } from './NetworkRequestTooltip.js';
import { colorForNetworkRequest } from './Utils.js';
const { html, render } = Lit;
const MAX_URL_LENGTH = 100;
const UIStrings = {
    /**
     * @description Text that refers to the network request method
     */
    requestMethod: 'Request method',
    /**
     * @description Text that refers to the network request protocol
     */
    protocol: 'Protocol',
    /**
     * @description Text to show the priority of an item
     */
    priority: 'Priority',
    /**
     * @description Text used when referring to the data sent in a network request that is encoded as a particular file format.
     */
    encodedData: 'Encoded data',
    /**
     * @description Text used to refer to the data sent in a network request that has been decoded.
     */
    decodedBody: 'Decoded body',
    /**
     * @description Text in Timeline indicating that input has happened recently
     */
    yes: 'Yes',
    /**
     * @description Text in Timeline indicating that input has not happened recently
     */
    no: 'No',
    /**
     * @description Text to indicate to the user they are viewing an event representing a network request.
     */
    networkRequest: 'Network request',
    /**
     * @description Text for the data source of a network request.
     */
    fromCache: 'From cache',
    /**
     * @description Text used to show the mime-type of the data transferred with a network request (e.g. "application/json").
     */
    mimeType: 'MIME type',
    /**
     * @description Text used to show the user that a request was served from the browser's in-memory cache.
     */
    FromMemoryCache: ' (from memory cache)',
    /**
     * @description Text used to show the user that a request was served from the browser's file cache.
     */
    FromCache: ' (from cache)',
    /**
     * @description Label for a network request indicating that it was a HTTP2 server push instead of a regular network request, in the Performance panel
     */
    FromPush: ' (from push)',
    /**
     * @description Text used to show a user that a request was served from an installed, active service worker.
     */
    FromServiceWorker: ' (from `service worker`)',
    /**
     * @description Text for the event initiated by another one
     */
    initiatedBy: 'Initiated by',
    /**
     * @description Text that refers to if the network request is blocking
     */
    blocking: 'Blocking',
    /**
     * @description Text that refers to if the network request is in-body parser render blocking
     */
    inBodyParserBlocking: 'In-body parser blocking',
    /**
     * @description Text that refers to if the network request is render blocking
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
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/NetworkRequestDetails.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class NetworkRequestDetails extends UI.Widget.Widget {
    #view;
    #request = null;
    #requestPreviewElements = new WeakMap();
    #entityMapper = null;
    #target = null;
    #linkifier = null;
    #serverTimings = null;
    #parsedTrace = null;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
        this.requestUpdate();
    }
    set linkifier(linkifier) {
        this.#linkifier = linkifier;
        this.requestUpdate();
    }
    set parsedTrace(parsedTrace) {
        this.#parsedTrace = parsedTrace;
        this.requestUpdate();
    }
    set target(maybeTarget) {
        this.#target = maybeTarget;
        this.requestUpdate();
    }
    set request(event) {
        this.#request = event;
        for (const header of event.args.data.responseHeaders ?? []) {
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
        this.requestUpdate();
    }
    set entityMapper(mapper) {
        this.#entityMapper = mapper;
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            request: this.#request,
            previewElementsCache: this.#requestPreviewElements,
            target: this.#target,
            entityMapper: this.#entityMapper,
            serverTimings: this.#serverTimings,
            linkifier: this.#linkifier,
            parsedTrace: this.#parsedTrace,
        }, {}, this.contentElement);
    }
}
export const DEFAULT_VIEW = (input, _output, target) => {
    if (!input.request) {
        render(Lit.nothing, target);
        return;
    }
    const { request } = input;
    const { data } = request.args;
    const redirectsHtml = NetworkRequestTooltip.renderRedirects(request);
    // clang-format off
    render(html `
        <style>${networkRequestDetailsStyles}</style>
        <style>${networkRequestTooltipStyles}</style>

        <div class="network-request-details-content">
          ${renderTitle(input.request)}
          ${renderURL(input.request)}
          <div class="network-request-details-cols">
            ${Lit.Directives.until(renderPreviewElement(input.request, input.target, input.previewElementsCache))}
            <div class="network-request-details-col">
              ${renderRow(i18nString(UIStrings.requestMethod), data.requestMethod)}
              ${renderRow(i18nString(UIStrings.protocol), data.protocol)}
              ${renderRow(i18nString(UIStrings.priority), NetworkRequestTooltip.renderPriorityValue(request))}
              ${renderRow(i18nString(UIStrings.mimeType), data.mimeType)}
              ${renderEncodedDataLength(request)}
              ${renderRow(i18nString(UIStrings.decodedBody), i18n.ByteUtilities.bytesToString(request.args.data.decodedBodyLength))}
              ${renderBlockingRow(request)}
              ${renderFromCache(request)}
              ${renderThirdPartyEntity(request, input.entityMapper)}
            </div>
            <div class="column-divider"></div>
            <div class="network-request-details-col">
              <div class="timing-rows">
                ${NetworkRequestTooltip.renderTimings(request)}
              </div>
            </div>
            ${renderServerTimings(input.serverTimings)}
            ${redirectsHtml ? html `
              <div class="column-divider"></div>
              <div class="network-request-details-col redirect-details">
                ${redirectsHtml}
              </div>
            ` : Lit.nothing}
            </div>
            ${renderInitiatedBy(request, input.parsedTrace, input.target, input.linkifier)}
          </div>
        </div>
     `, target);
    // clang-format on
};
function renderTitle(request) {
    const style = {
        backgroundColor: `${colorForNetworkRequest(request)}`,
    };
    return html `
    <div class="network-request-details-title">
      <div style=${Lit.Directives.styleMap(style)}></div>
      ${i18nString(UIStrings.networkRequest)}
    </div>
  `;
}
function renderURL(request) {
    const options = {
        tabStop: true,
        showColumnNumber: false,
        inlineFrameIndex: 0,
        maxLength: MAX_URL_LENGTH,
    };
    const linkifiedURL = LegacyComponents.Linkifier.Linkifier.linkifyURL(request.args.data.url, options);
    // Potentially link to request within Network Panel
    const networkRequest = SDK.TraceObject.RevealableNetworkRequest.create(request);
    if (networkRequest) {
        linkifiedURL.addEventListener('contextmenu', (event) => {
            const contextMenu = new UI.ContextMenu.ContextMenu(event);
            contextMenu.appendApplicableItems(networkRequest);
            void contextMenu.show();
        });
        // clang-format off
        const urlElement = html `
        ${linkifiedURL}
        <devtools-request-link-icon .data=${{ request: networkRequest.networkRequest }}>
        </devtools-request-link-icon>
      `;
        // clang-format on
        return html `<div class="network-request-details-item">${urlElement}</div>`;
    }
    return html `<div class="network-request-details-item">${linkifiedURL}</div>`;
}
async function renderPreviewElement(request, target, previewElementsCache) {
    if (!request.args.data.url || !target) {
        return Lit.nothing;
    }
    const url = request.args.data.url;
    if (!previewElementsCache.get(request)) {
        const previewOpts = {
            imageAltText: LegacyComponents.ImagePreview.ImagePreview.defaultAltTextForImageURL(url),
            precomputedFeatures: undefined,
            align: "start" /* LegacyComponents.ImagePreview.Align.START */,
            hideFileData: true,
        };
        const previewElement = await LegacyComponents.ImagePreview.ImagePreview.build(url, false, previewOpts);
        if (previewElement) {
            previewElementsCache.set(request, previewElement);
        }
    }
    const requestPreviewElement = previewElementsCache.get(request);
    if (requestPreviewElement) {
        // clang-format off
        return html `
      <div class="network-request-details-col">${requestPreviewElement}</div>
      <div class="column-divider"></div>`;
        // clang-format on
    }
    return Lit.nothing;
}
function renderRow(title, value) {
    if (!value) {
        return Lit.nothing;
    }
    // clang-format off
    return html `
      <div class="network-request-details-row">
        <div class="title">${title}</div>
        <div class="value">${value}</div>
      </div>`;
    // clang-format on
}
function renderEncodedDataLength(request) {
    let lengthText = '';
    if (request.args.data.syntheticData.isMemoryCached) {
        lengthText += i18nString(UIStrings.FromMemoryCache);
    }
    else if (request.args.data.syntheticData.isDiskCached) {
        lengthText += i18nString(UIStrings.FromCache);
    }
    else if (request.args.data.timing?.pushStart) {
        lengthText += i18nString(UIStrings.FromPush);
    }
    if (request.args.data.fromServiceWorker) {
        lengthText += i18nString(UIStrings.FromServiceWorker);
    }
    if (request.args.data.encodedDataLength || !lengthText) {
        lengthText = `${i18n.ByteUtilities.bytesToString(request.args.data.encodedDataLength)}${lengthText}`;
    }
    return renderRow(i18nString(UIStrings.encodedData), lengthText);
}
function renderBlockingRow(request) {
    if (!Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(request)) {
        return Lit.nothing;
    }
    let renderBlockingText;
    switch (request.args.data.renderBlocking) {
        case 'blocking':
            renderBlockingText = UIStrings.renderBlocking;
            break;
        case 'in_body_parser_blocking':
            renderBlockingText = UIStrings.inBodyParserBlocking;
            break;
        default:
            // Shouldn't fall to this block, if so, this network request is not
            // render blocking, so return null.
            return Lit.nothing;
    }
    return renderRow(i18nString(UIStrings.blocking), renderBlockingText);
}
function renderFromCache(request) {
    const cached = request.args.data.syntheticData.isMemoryCached || request.args.data.syntheticData.isDiskCached;
    return renderRow(i18nString(UIStrings.fromCache), cached ? i18nString(UIStrings.yes) : i18nString(UIStrings.no));
}
function renderThirdPartyEntity(request, entityMapper) {
    if (!entityMapper) {
        return Lit.nothing;
    }
    const entity = entityMapper.entityForEvent(request);
    if (!entity) {
        return Lit.nothing;
    }
    return renderRow(i18nString(UIStrings.entity), entity.name);
}
function renderServerTimings(timings) {
    if (!timings || timings.length === 0) {
        return Lit.nothing;
    }
    // clang-format off
    return html `
    <div class="column-divider"></div>
    <div class="network-request-details-col server-timings">
      <div class="server-timing-column-header">${i18nString(UIStrings.serverTiming)}</div>
      <div class="server-timing-column-header">${i18nString(UIStrings.description)}</div>
      <div class="server-timing-column-header">${i18nString(UIStrings.time)}</div>
      ${timings.map(timing => {
        const classes = timing.metric.startsWith('(c') ? 'synthetic value' : 'value';
        return html `
          <div class=${classes}>${timing.metric || '-'}</div>
          <div class=${classes}>${timing.description || '-'}</div>
          <div class=${classes}>${timing.value || '-'}</div>
        `;
    })}
    </div>`;
    // clang-format on
}
function renderInitiatedBy(request, parsedTrace, target, linkifier) {
    if (!linkifier) {
        return Lit.nothing;
    }
    const hasStackTrace = Trace.Helpers.Trace.stackTraceInEvent(request) !== null;
    let link = null;
    const options = {
        tabStop: true,
        showColumnNumber: true,
        inlineFrameIndex: 0,
    };
    // If we have a stack trace, that is the most reliable way to get the initiator data and display a link to the source.
    if (hasStackTrace) {
        const topFrame = Trace.Helpers.Trace.getStackTraceTopCallFrameInEventPayload(request) ?? null;
        if (topFrame) {
            link = linkifier.maybeLinkifyConsoleCallFrame(target, topFrame, options);
        }
    }
    // If we do not, we can see if the network handler found an initiator and try to link by URL
    const initiator = parsedTrace?.data.NetworkRequests.eventToInitiator.get(request);
    if (initiator) {
        link = linkifier.maybeLinkifyScriptLocation(target, null, // this would be the scriptId, but we don't have one. The linkifier will fallback to using the URL.
        initiator.args.data.url, undefined, // line number
        options);
    }
    if (!link) {
        return Lit.nothing;
    }
    // clang-format off
    return html `
      <div class="network-request-details-item">
        <div class="title">${i18nString(UIStrings.initiatedBy)}</div>
        <div class="value focusable-outline">${link}</div>
      </div>`;
    // clang-format on
}
//# sourceMappingURL=NetworkRequestDetails.js.map
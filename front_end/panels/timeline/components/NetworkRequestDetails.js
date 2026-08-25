// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/components/request_link_icon/request_link_icon.js';
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Helpers from '../../../models/trace/helpers/helpers.js';
import * as Trace from '../../../models/trace/trace.js';
import * as LegacyComponents from '../../../ui/legacy/components/utils/utils.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import networkRequestDetailsStyles from './networkRequestDetails.css.js';
import networkRequestTooltipStyles from './networkRequestTooltip.css.js';
import { NetworkRequestTooltip } from './NetworkRequestTooltip.js';
import { colorForNetworkRequest } from './Utils.js';
const { html, render } = Lit;
const MAX_URL_LENGTH = 100;
const UIStrings = {
    /**
     * @description Label for the HTTP request method in the network request details view of the Performance panel.
     */
    requestMethod: 'Request method',
    /**
     * @description Label for the network protocol in the network request details view of the Performance panel.
     */
    protocol: 'Protocol',
    /**
     * @description Label for the network request priority in the network request details view of the Performance panel.
     */
    priority: 'Priority',
    /**
     * @description Label for the encoded data size in the network request details view of the Performance panel.
     */
    encodedData: 'Encoded data',
    /**
     * @description Label for the decoded body size in the network request details view of the Performance panel.
     */
    decodedBody: 'Decoded body',
    /**
     * @description Value indicating yes in the network request details view of the Performance panel.
     */
    yes: 'Yes',
    /**
     * @description Value indicating no in the network request details view of the Performance panel.
     */
    no: 'No',
    /**
     * @description Header title for a network request in the network request details view of the Performance panel.
     */
    networkRequest: 'Network request',
    /**
     * @description Label indicating whether a network request was served from cache in the network request details view of the Performance panel.
     */
    fromCache: 'From cache',
    /**
     * @description Label for the MIME type of a network request in the network request details view of the Performance panel.
     */
    mimeType: 'MIME type',
    /**
     * @description Suffix indicating that a network request was served from memory cache in the Performance panel.
     */
    FromMemoryCache: ' (from memory cache)',
    /**
     * @description Suffix indicating that a network request was served from disk cache in the Performance panel.
     */
    FromCache: ' (from cache)',
    /**
     * @description Suffix indicating that a network request was served from server push in the Performance panel.
     */
    FromPush: ' (from push)',
    /**
     * @description Suffix indicating that a network request was served from a service worker in the Performance panel.
     */
    FromServiceWorker: ' (from `service worker`)',
    /**
     * @description Label indicating what initiated the network request in the network request details view of the Performance panel.
     */
    initiatedBy: 'Initiated by',
    /**
     * @description Label for the render-blocking status of a network request in the network request details view of the Performance panel.
     */
    blocking: 'Blocking',
    /**
     * @description Status value indicating that a network request is in-body parser blocking in the Performance panel.
     */
    inBodyParserBlocking: 'In-body parser blocking',
    /**
     * @description Status value indicating that a network request is render-blocking in the Performance panel.
     */
    renderBlocking: 'Render-blocking',
    /**
     * @description Label for the third-party entity of a network request in the network request details view of the Performance panel.
     */
    entity: '3rd party',
    /**
     * @description Column header for server timing metric names in the network request details view of the Performance panel.
     */
    serverTiming: 'Server timing',
    /**
     * @description Column header for server timing duration values in the network request details view of the Performance panel.
     */
    time: 'Time',
    /**
     * @description Column header for server timing descriptions in the network request details view of the Performance panel.
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
                this.#serverTimings = SDK.ServerTiming.ServerTiming.parseHeaders([header], Common.Console.Console.instance());
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

        <div class="network-request-details-content"
             data-network-request-id=${input.request.args.data.requestId}
             jslog=${VisualLogging.section('timeline.network-request-details')}>
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
        maxLength: MAX_URL_LENGTH,
    };
    const linkifiedURL = LegacyComponents.Linkifier.Linkifier.linkifyURL(request.args.data.url, options);
    // Potentially link to request within Network Panel
    const networkRequest = SDK.TraceObject.RevealableNetworkRequest.create(SDK.TargetManager.TargetManager.instance(), request);
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
      <div class="network-request-details-row" jslog=${VisualLogging.item('detail-row')}>
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
            // render-blocking, so return null.
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
    };
    // If we have a stack trace, that is the most reliable way to get the initiator data and display a link to the source.
    if (hasStackTrace) {
        const topFrame = Trace.Helpers.Trace.getStackTraceTopCallFrameInEventPayload(request) ?? null;
        if (topFrame) {
            link = linkifier.maybeLinkifyConsoleCallFrame(target, topFrame, options);
        }
    }
    // If we do not, we can see if the network handler found an initiator and try
    // to link by URL
    const initiator = parsedTrace ? Trace.Extras.Initiators.getNetworkInitiator(parsedTrace.data, request) : undefined;
    // Initiator will always be a synthetic network request but TS doesn't know that.
    if (initiator && Trace.Types.Events.isSyntheticNetworkRequest(initiator)) {
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
// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/kit/kit.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Trace from '../../../models/trace/trace.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as TimelineUtils from '../utils/utils.js';
import networkRequestTooltipStyles from './networkRequestTooltip.css.js';
import { colorForNetworkRequest, networkResourceCategory } from './Utils.js';
const { html, nothing, Directives: { classMap, ifDefined } } = Lit;
const MAX_URL_LENGTH = 60;
const UIStrings = {
    /**
     * @description Text that refers to the priority of network request
     */
    priority: 'Priority',
    /**
     * @description Text for the duration of a network request
     */
    duration: 'Duration',
    /**
     * @description Text that refers to the queueing and connecting time of a network request
     */
    queuingAndConnecting: 'Queuing and connecting',
    /**
     * @description Text that refers to the request sent and waiting time of a network request
     */
    requestSentAndWaiting: 'Request sent and waiting',
    /**
     * @description Text that refers to the content downloading time of a network request
     */
    contentDownloading: 'Content downloading',
    /**
     * @description Text that refers to the waiting on main thread time of a network request
     */
    waitingOnMainThread: 'Waiting on main thread',
    /**
     * @description Text that refers to a network request is render blocking
     */
    renderBlocking: 'Render blocking',
    /**
     * @description Text to refer to the list of redirects.
     */
    redirects: 'Redirects',
    /**
     * @description Cell title in Network Data Grid Node of the Network panel
     * @example {Fast 4G} PH1
     */
    wasThrottled: 'Request was throttled ({PH1})',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/NetworkRequestTooltip.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class NetworkRequestTooltip extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #data = { networkRequest: null, entityMapper: null };
    connectedCallback() {
        this.#render();
    }
    set data(data) {
        if (this.#data.networkRequest === data.networkRequest) {
            return;
        }
        if (this.#data.entityMapper === data.entityMapper) {
            return;
        }
        this.#data = { networkRequest: data.networkRequest, entityMapper: data.entityMapper };
        this.#render();
    }
    static renderPriorityValue(networkRequest) {
        if (networkRequest.args.data.priority === networkRequest.args.data.initialPriority) {
            return html `${PerfUI.NetworkPriorities.uiLabelForNetworkPriority(networkRequest.args.data.priority)}`;
        }
        return html `${PerfUI.NetworkPriorities.uiLabelForNetworkPriority(networkRequest.args.data.initialPriority)}
        <devtools-icon name="arrow-forward" class="priority"></devtools-icon>
        ${PerfUI.NetworkPriorities.uiLabelForNetworkPriority(networkRequest.args.data.priority)}`;
    }
    static renderTimings(networkRequest) {
        const syntheticData = networkRequest.args.data.syntheticData;
        const queueing = (syntheticData.sendStartTime - networkRequest.ts);
        const requestPlusWaiting = (syntheticData.downloadStart - syntheticData.sendStartTime);
        const download = (syntheticData.finishTime - syntheticData.downloadStart);
        const waitingOnMainThread = (networkRequest.ts + networkRequest.dur - syntheticData.finishTime);
        const color = colorForNetworkRequest(networkRequest);
        const styleForWaiting = {
            backgroundColor: `color-mix(in srgb, ${color}, hsla(0, 100%, 100%, 0.8))`,
        };
        const styleForDownloading = {
            backgroundColor: color,
        };
        const sdkNetworkRequest = SDK.TraceObject.RevealableNetworkRequest.create(networkRequest);
        const wasThrottled = sdkNetworkRequest &&
            SDK.NetworkManager.MultitargetNetworkManager.instance().appliedRequestConditions(sdkNetworkRequest.networkRequest);
        const throttledTitle = wasThrottled ? i18nString(UIStrings.wasThrottled, {
            PH1: typeof wasThrottled.conditions.title === 'string' ? wasThrottled.conditions.title :
                wasThrottled.conditions.title()
        }) :
            undefined;
        // The outside spans are transparent with a border on the outside edge.
        // The inside spans are 1px tall rectangles, vertically centered, with background color.
        //                   |
        //                   |----
        //   whisker-left->  |  ^ horizontal
        const leftWhisker = html `<span class="whisker-left"> <span class="horizontal"></span> </span>`;
        const rightWhisker = html `<span class="whisker-right"> <span class="horizontal"></span> </span>`;
        const classes = classMap({
            ['timings-row timings-row--duration']: true,
            throttled: Boolean(wasThrottled?.urlPattern),
        });
        return html `
      <div
        class=${classes}
        title=${ifDefined(throttledTitle)}>
        ${wasThrottled?.urlPattern ? html `<devtools-icon
          class=indicator
          name=watch
          ></devtools-icon>` :
            html `<span class="indicator"></span>`}
        ${i18nString(UIStrings.duration)}
         <span class="time"> ${i18n.TimeUtilities.formatMicroSecondsTime(networkRequest.dur)} </span>
      </div>
      <div class="timings-row">
        ${leftWhisker}
        ${i18nString(UIStrings.queuingAndConnecting)}
        <span class="time"> ${i18n.TimeUtilities.formatMicroSecondsTime(queueing)} </span>
      </div>
      <div class="timings-row">
        <span class="indicator" style=${Lit.Directives.styleMap(styleForWaiting)}></span>
        ${i18nString(UIStrings.requestSentAndWaiting)}
        <span class="time"> ${i18n.TimeUtilities.formatMicroSecondsTime(requestPlusWaiting)} </span>
      </div>
      <div class="timings-row">
        <span class="indicator" style=${Lit.Directives.styleMap(styleForDownloading)}></span>
        ${i18nString(UIStrings.contentDownloading)}
        <span class="time"> ${i18n.TimeUtilities.formatMicroSecondsTime(download)} </span>
      </div>
      <div class="timings-row">
        ${rightWhisker}
        ${i18nString(UIStrings.waitingOnMainThread)}
        <span class="time"> ${i18n.TimeUtilities.formatMicroSecondsTime(waitingOnMainThread)} </span>
      </div>
    `;
    }
    static renderRedirects(networkRequest) {
        const redirectRows = [];
        if (networkRequest.args.data.redirects.length > 0) {
            redirectRows.push(html `
        <div class="redirects-row">
          ${i18nString(UIStrings.redirects)}
        </div>
      `);
            for (const redirect of networkRequest.args.data.redirects) {
                redirectRows.push(html `<div class="redirects-row"> ${redirect.url}</div>`);
            }
            return html `${redirectRows}`;
        }
        return null;
    }
    #render() {
        if (!this.#data.networkRequest) {
            return;
        }
        const chipStyle = {
            backgroundColor: `${colorForNetworkRequest(this.#data.networkRequest)}`,
        };
        const url = new URL(this.#data.networkRequest.args.data.url);
        const entity = (this.#data.entityMapper) ? this.#data.entityMapper.entityForEvent(this.#data.networkRequest) : null;
        const originWithEntity = TimelineUtils.Helpers.formatOriginWithEntity(url, entity, true);
        const redirectsHtml = NetworkRequestTooltip.renderRedirects(this.#data.networkRequest);
        const sdkNetworkRequest = SDK.TraceObject.RevealableNetworkRequest.create(this.#data.networkRequest);
        const wasThrottled = sdkNetworkRequest &&
            SDK.NetworkManager.MultitargetNetworkManager.instance().appliedRequestConditions(sdkNetworkRequest.networkRequest);
        // clang-format off
        const output = html `
      <style>${networkRequestTooltipStyles}</style>
      <div class="performance-card">
        <div class="url">${Platform.StringUtilities.trimMiddle(url.href.replace(url.origin, ''), MAX_URL_LENGTH)}</div>
        <div class="url url--host">${originWithEntity}</div>

        <div class="divider"></div>
        <div class="network-category">
          <span class="network-category-chip" style=${Lit.Directives.styleMap(chipStyle)}>
          </span>${networkResourceCategory(this.#data.networkRequest)}
        </div>
        <div class="priority-row">${i18nString(UIStrings.priority)}: ${NetworkRequestTooltip.renderPriorityValue(this.#data.networkRequest)}</div>
        ${wasThrottled ? html `
        <div class="throttled-row">
          ${i18nString(UIStrings.wasThrottled, {
            PH1: typeof wasThrottled.conditions.title === 'string' ? wasThrottled.conditions.title :
                wasThrottled.conditions.title()
        })}
        </div>` : nothing}
        ${Trace.Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(this.#data.networkRequest) ?
            html `<div class="render-blocking"> ${i18nString(UIStrings.renderBlocking)} </div>` : Lit.nothing}
        <div class="divider"></div>

        ${NetworkRequestTooltip.renderTimings(this.#data.networkRequest)}

        ${redirectsHtml ? html `
          <div class="divider"></div>
          ${redirectsHtml}
        ` : Lit.nothing}
      </div>
    `;
        // clang-format on
        Lit.render(output, this.#shadow, { host: this });
    }
}
customElements.define('devtools-performance-network-request-tooltip', NetworkRequestTooltip);
//# sourceMappingURL=NetworkRequestTooltip.js.map
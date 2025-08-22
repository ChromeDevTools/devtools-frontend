// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../../ui/components/icon_button/icon_button.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Trace from '../../../models/trace/trace.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as TimelineUtils from '../utils/utils.js';

import networkRequestTooltipStyles from './networkRequestTooltip.css.js';
import {colorForNetworkRequest, networkResourceCategory} from './Utils.js';

const {html} = Lit;

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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/NetworkRequestTooltip.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface NetworkTooltipData {
  networkRequest: Trace.Types.Events.SyntheticNetworkRequest|null;
  entityMapper: TimelineUtils.EntityMapper.EntityMapper|null;
}

export class NetworkRequestTooltip extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #data: NetworkTooltipData = {networkRequest: null, entityMapper: null};

  connectedCallback(): void {
    this.#render();
  }

  set data(data: NetworkTooltipData) {
    if (this.#data.networkRequest === data.networkRequest) {
      return;
    }
    if (this.#data.entityMapper === data.entityMapper) {
      return;
    }
    this.#data = {networkRequest: data.networkRequest, entityMapper: data.entityMapper};
    this.#render();
  }

  static renderPriorityValue(networkRequest: Trace.Types.Events.SyntheticNetworkRequest): Lit.TemplateResult {
    if (networkRequest.args.data.priority === networkRequest.args.data.initialPriority) {
      return html`${PerfUI.NetworkPriorities.uiLabelForNetworkPriority(networkRequest.args.data.priority)}`;
    }
    return html`${PerfUI.NetworkPriorities.uiLabelForNetworkPriority(networkRequest.args.data.initialPriority)}
        <devtools-icon name="arrow-forward" class="priority"></devtools-icon>
        ${PerfUI.NetworkPriorities.uiLabelForNetworkPriority(networkRequest.args.data.priority)}`;
  }

  static renderTimings(networkRequest: Trace.Types.Events.SyntheticNetworkRequest): Lit.TemplateResult|null {
    const syntheticData = networkRequest.args.data.syntheticData;
    const queueing = (syntheticData.sendStartTime - networkRequest.ts) as Trace.Types.Timing.Micro;
    const requestPlusWaiting = (syntheticData.downloadStart - syntheticData.sendStartTime) as Trace.Types.Timing.Micro;
    const download = (syntheticData.finishTime - syntheticData.downloadStart) as Trace.Types.Timing.Micro;
    const waitingOnMainThread =
        (networkRequest.ts + networkRequest.dur - syntheticData.finishTime) as Trace.Types.Timing.Micro;

    const color = colorForNetworkRequest(networkRequest);
    const styleForWaiting = {
      backgroundColor: `color-mix(in srgb, ${color}, hsla(0, 100%, 100%, 0.8))`,
    };
    const styleForDownloading = {
      backgroundColor: color,
    };

    // The outside spans are transparent with a border on the outside edge.
    // The inside spans are 1px tall rectangles, vertically centered, with background color.
    //                   |
    //                   |----
    //   whisker-left->  |  ^ horizontal
    const leftWhisker = html`<span class="whisker-left"> <span class="horizontal"></span> </span>`;
    const rightWhisker = html`<span class="whisker-right"> <span class="horizontal"></span> </span>`;

    return html`
      <div class="timings-row timings-row--duration">
        <span class="indicator"></span>
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

  static renderRedirects(networkRequest: Trace.Types.Events.SyntheticNetworkRequest): Lit.TemplateResult|null {
    const redirectRows = [];
    if (networkRequest.args.data.redirects.length > 0) {
      redirectRows.push(html`
        <div class="redirects-row">
          ${i18nString(UIStrings.redirects)}
        </div>
      `);
      for (const redirect of networkRequest.args.data.redirects) {
        redirectRows.push(html`<div class="redirects-row"> ${redirect.url}</div>`);
      }
      return html`${redirectRows}`;
    }

    return null;
  }

  #render(): void {
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

    // clang-format off
    const output = html`
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
        ${Trace.Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(this.#data.networkRequest) ?
          html`<div class="render-blocking"> ${i18nString(UIStrings.renderBlocking)} </div>` :  Lit.nothing
        }
        <div class="divider"></div>

        ${NetworkRequestTooltip.renderTimings(this.#data.networkRequest)}

        ${redirectsHtml ? html `
          <div class="divider"></div>
          ${redirectsHtml}
        ` : Lit.nothing}
      </div>
    `;
    // clang-format on
    Lit.render(output, this.#shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-network-request-tooltip': NetworkRequestTooltip;
  }
}

customElements.define('devtools-performance-network-request-tooltip', NetworkRequestTooltip);

// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Trace from '../../../models/trace/trace.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import networkRequestTooltipStyles from './networkRequestTooltip.css.js';
import {colorForNetworkRequest} from './Utils.js';

const MAX_URL_LENGTH = 30;

const UIStrings = {
  /**
   *@description Text that refers to the priority of network request
   */
  priority: 'Priority',
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
  /**
   *@description Text that refers to a network request is render blocking
   */
  renderBlocking: 'Render blocking',
};

export class NetworkRequestTooltip extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-performance-network-request-tooltip`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #networkRequest?: Trace.Types.Events.SyntheticNetworkRequest|null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [networkRequestTooltipStyles];
    this.#render();
  }

  set networkRequest(networkRequest: Trace.Types.Events.SyntheticNetworkRequest) {
    if (this.#networkRequest === networkRequest) {
      return;
    }
    this.#networkRequest = networkRequest;
    this.#render();
  }

  #renderPriority(): LitHtml.TemplateResult|null {
    if (!this.#networkRequest) {
      return null;
    }
    if (this.#networkRequest.args.data.priority === this.#networkRequest.args.data.initialPriority) {
      return LitHtml.html`
        <div class="priority">${UIStrings.priority}: ${
          PerfUI.NetworkPriorities.uiLabelForNetworkPriority(this.#networkRequest.args.data.priority)}</div>
      `;
    }
    return LitHtml.html`
      <div class="priority">
        ${UIStrings.priority}:
        ${PerfUI.NetworkPriorities.uiLabelForNetworkPriority(this.#networkRequest.args.data.initialPriority)}
        <${IconButton.Icon.Icon.litTagName} name=${'arrow-forward'}></${IconButton.Icon.Icon.litTagName}>
        ${PerfUI.NetworkPriorities.uiLabelForNetworkPriority(this.#networkRequest.args.data.priority)}
      </div>
    `;
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
    const queueing = (syntheticData.sendStartTime - this.#networkRequest.ts) as Trace.Types.Timing.MicroSeconds;
    const requestPlusWaiting =
        (syntheticData.downloadStart - syntheticData.sendStartTime) as Trace.Types.Timing.MicroSeconds;
    const download = (syntheticData.finishTime - syntheticData.downloadStart) as Trace.Types.Timing.MicroSeconds;
    const waitingOnMainThread = (this.#networkRequest.ts + this.#networkRequest.dur - syntheticData.finishTime) as
        Trace.Types.Timing.MicroSeconds;

    const color = colorForNetworkRequest(this.#networkRequest);
    const styleForWaiting = {
      backgroundColor: `color-mix(in srgb, ${color}, hsla(0, 100%, 100%, 0.8))`,
    };
    const styleForDownloading = {
      backgroundColor: color,
    };

    return LitHtml.html`
      <ul>
        <li>
          ${this.#renderLeftWhisker()}
          ${UIStrings.queuingAndConnecting}
          <span class="time">${i18n.TimeUtilities.formatMicroSecondsTime(queueing)}</span>
        </li>
        <li>
          <span class="indicator" style=${LitHtml.Directives.styleMap(styleForWaiting)}></span>
          ${UIStrings.requestSentAndWaiting}
          <span class="time">${i18n.TimeUtilities.formatMicroSecondsTime(requestPlusWaiting)}</span>
        </li>
        <li>
          <span class="indicator" style=${LitHtml.Directives.styleMap(styleForDownloading)}></span>
          ${UIStrings.contentDownloading}
          <span class="time">${i18n.TimeUtilities.formatMicroSecondsTime(download)}</span>
        </li>
        <li>
          ${this.#renderRightWhisker()}
          ${UIStrings.waitingOnMainThread}
          <span class="time">${i18n.TimeUtilities.formatMicroSecondsTime(waitingOnMainThread)}</span>
        </li>
      </ul>
    `;
  }

  #render(): void {
    if (!this.#networkRequest) {
      return;
    }
    const networkData = this.#networkRequest.args.data;
    // clang-format off
    const output = LitHtml.html`
      <div class="performance-card">
        <span class="url">${Platform.StringUtilities.trimMiddle(networkData.url, MAX_URL_LENGTH)}</span>
        <span class="time bold">${i18n.TimeUtilities.formatMicroSecondsTime(this.#networkRequest.dur)}</span>

        <div class="divider"></div>
        ${this.#renderPriority()}
        ${Trace.Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(this.#networkRequest) ?
          LitHtml.html`<div class="render-blocking"> ${UIStrings.renderBlocking} </div>` :  LitHtml.nothing
        }
        <div class="divider"></div>

        ${this.#renderTimings()}
      </div>
    `;
    // clang-format on
    LitHtml.render(output, this.#shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-network-request-tooltip': NetworkRequestTooltip;
  }
}

customElements.define('devtools-performance-network-request-tooltip', NetworkRequestTooltip);

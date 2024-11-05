// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Helpers from '../../../models/trace/helpers/helpers.js';
import * as Trace from '../../../models/trace/trace.js';
import * as LegacyComponents from '../../../ui/legacy/components/utils/utils.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as Utils from '../utils/utils.js';

import * as Insights from './insights/insights.js';
import layoutShiftDetailsStyles from './layoutShiftDetails.css.js';

const {html} = LitHtml;

const MAX_URL_LENGTH = 20;

const UIStrings = {
  /**
   * @description Text referring to the start time of a given event.
   */
  startTime: 'Start time',
  /**
   * @description Text for a table header referring to the score of a Layout Shift event.
   */
  shiftScore: 'Shift score',
  /**
   * @description Text for a table header referring to the elements shifted for a Layout Shift event.
   */
  elementsShifted: 'Elements shifted',
  /**
   * @description Text for a table header referring to the culprit of a Layout Shift event.
   */
  culprit: 'Culprit',
  /**
   * @description Text for a culprit type of Injected iframe.
   */
  injectedIframe: 'Injected iframe',
  /**
   * @description Text for a culprit type of Font request.
   */
  fontRequest: 'Font request',
  /**
   * @description Text for a culprit type of non-composited animation.
   */
  nonCompositedAnimation: 'Non-composited animation',
  /**
   * @description Text referring to an animation.
   */
  animation: 'Animation',
  /**
   * @description Text referring to a parent cluster.
   */
  parentCluster: 'Parent cluster',
  /**
   * @description Text referring to a layout shift cluster and its start time.
   * @example {32 ms} PH1
   */
  cluster: 'Layout shift cluster @ {PH1}',
  /**
   * @description Text referring to a layout shift and its start time.
   * @example {32 ms} PH1
   */
  layoutShift: 'Layout shift @ {PH1}',
  /**
   * @description Text referring to the total cumulative score of a layout shift cluster.
   */
  total: 'Total',
  /**
   * @description Text for a culprit type of Unsized image.
   */
  unsizedImage: 'Unsized image',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/LayoutShiftDetails.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class LayoutShiftDetails extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #event: Trace.Types.Events.SyntheticLayoutShift|Trace.Types.Events.SyntheticLayoutShiftCluster|null = null;
  #traceInsightsSets: Trace.Insights.Types.TraceInsightSets|null = null;
  #parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null;
  #isFreshRecording: Boolean = false;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [layoutShiftDetailsStyles];
    // Styles for linkifier button.
    UI.UIUtils.injectTextButtonStyles(this.#shadow);
    this.#render();
  }

  setData(
      event: Trace.Types.Events.SyntheticLayoutShift|Trace.Types.Events.SyntheticLayoutShiftCluster,
      traceInsightsSets: Trace.Insights.Types.TraceInsightSets|null, parsedTrace: Trace.Handlers.Types.ParsedTrace|null,
      isFreshRecording: Boolean): void {
    if (this.#event === event) {
      return;
    }
    this.#event = event;
    this.#traceInsightsSets = traceInsightsSets;
    this.#parsedTrace = parsedTrace;
    this.#isFreshRecording = isFreshRecording;
    this.#render();
  }

  #renderTitle(event: Trace.Types.Events.SyntheticLayoutShift|
               Trace.Types.Events.SyntheticLayoutShiftCluster): LitHtml.TemplateResult {
    const title = Utils.EntryName.nameForEntry(event);
    return html`
      <div class="layout-shift-details-title">
        <div class="layout-shift-event-title"></div>
        ${title}
      </div>
    `;
  }

  #renderShiftedElements(elementsShifted: Trace.Types.Events.TraceImpactedNode[]|undefined): LitHtml.LitTemplate {
    // clang-format off
    return html`
      ${elementsShifted?.map(el => {
        if (el.node_id !== undefined) {
          return html`
            <devtools-performance-node-link .data=${{backendNodeId: el.node_id}}>
            </devtools-performance-node-link>`;
        }
          return LitHtml.nothing;
      })}`;
    // clang-format on
  }

  #renderIframe(iframeId: string): LitHtml.TemplateResult|null {
    const domLoadingId = iframeId as Protocol.Page.FrameId;
    if (!domLoadingId) {
      return null;
    }

    const domLoadingFrame = SDK.FrameManager.FrameManager.instance().getFrame(domLoadingId);
    if (!domLoadingFrame) {
      return null;
    }
    const el = LegacyComponents.Linkifier.Linkifier.linkifyRevealable(domLoadingFrame, domLoadingFrame.displayName());
    // clang-format off
    return html`
    <span class="culprit"><span class="culprit-type">${i18nString(UIStrings.injectedIframe)}: </span><span class="culprit-value">${el}</span></span>`;
    // clang-format on
  }

  #renderFontRequest(request: Trace.Types.Events.SyntheticNetworkRequest): LitHtml.TemplateResult|null {
    const options = {
      tabStop: true,
      showColumnNumber: false,
      inlineFrameIndex: 0,
      maxLength: MAX_URL_LENGTH,
    };

    const linkifiedURL = LegacyComponents.Linkifier.Linkifier.linkifyURL(
        request.args.data.url as Platform.DevToolsPath.UrlString, options);

    // clang-format off
    return html`
    <span class="culprit"><span class="culprit-type">${i18nString(UIStrings.fontRequest)}: </span><span class="culprit-value">${linkifiedURL}</span></span>`;
    // clang-format on
  }

  // TODO(crbug.com/368170718): use eventRef instead
  #clickEvent(event: Trace.Types.Events.Event): void {
    this.dispatchEvent(new Insights.EventRef.EventReferenceClick(event));
  }

  #renderAnimation(failure: Trace.Insights.Models.CLSCulprits.NoncompositedAnimationFailure): LitHtml.TemplateResult
      |null {
    const event = failure.animation;
    if (!event) {
      return null;
    }
    // clang-format off
    return html`
        <span class="culprit">
        <span class="culprit-type">${i18nString(UIStrings.nonCompositedAnimation)}: </span>
        <button type="button" class="culprit-value timeline-link" @click=${() => this.#clickEvent(event)}>${i18nString(UIStrings.animation)}</button>
      </span>`;
    // clang-format on
  }

  #renderUnsizedImage(node: Protocol.DOM.BackendNodeId): LitHtml.TemplateResult|null {
    // clang-format off
    const el = html`
      <devtools-performance-node-link
        .data=${{
          backendNodeId: node,
        } as Insights.NodeLink.NodeLinkData}>
      </devtools-performance-node-link>`;
    return html`
    <span class="culprit"><span class="culprit-type">${i18nString(UIStrings.unsizedImage)}: </span><span class="culprit-value">${el}</span></span>`;
    // clang-format on
  }

  #renderRootCauseValues(rootCauses: Trace.Insights.Models.CLSCulprits.LayoutShiftRootCausesData|
                         undefined): LitHtml.TemplateResult|null {
    return html`
      ${rootCauses?.fontRequests.map(fontReq => this.#renderFontRequest(fontReq))}
      ${rootCauses?.iframeIds.map(iframe => this.#renderIframe(iframe))}
      ${rootCauses?.nonCompositedAnimations.map(failure => this.#renderAnimation(failure))}
      ${rootCauses?.unsizedImages.map(image => this.#renderUnsizedImage(image))}
    `;
  }

  #renderStartTime(shift: Trace.Types.Events.SyntheticLayoutShift, parsedTrace: Trace.Handlers.Types.ParsedTrace):
      LitHtml.TemplateResult|null {
    const ts = Trace.Types.Timing.MicroSeconds(shift.ts - parsedTrace.Meta.traceBounds.min);
    if (shift === this.#event) {
      return html`${i18n.TimeUtilities.preciseMillisToString(Helpers.Timing.microSecondsToMilliseconds(ts))}`;
    }
    const shiftTs = i18n.TimeUtilities.formatMicroSecondsTime(ts);
    // clang-format off
    return html`
         <button type="button" class="timeline-link" @click=${() => this.#clickEvent(shift)}>${i18nString(UIStrings.layoutShift, {PH1: shiftTs})}</button>`;
    // clang-format on
  }

  #renderShiftRow(
      shift: Trace.Types.Events.SyntheticLayoutShift, parsedTrace: Trace.Handlers.Types.ParsedTrace,
      elementsShifted: Trace.Types.Events.TraceImpactedNode[],
      rootCauses: Trace.Insights.Models.CLSCulprits.LayoutShiftRootCausesData|undefined): LitHtml.TemplateResult|null {
    const score = shift.args.data?.weighted_score_delta;
    if (!score) {
      return null;
    }
    const hasCulprits = Boolean(
        rootCauses &&
        (rootCauses.fontRequests.length || rootCauses.iframeIds.length || rootCauses.nonCompositedAnimations.length ||
         rootCauses.unsizedImages.length));

    // clang-format off
    return html`
      <tr class="shift-row" data-ts=${shift.ts}>
        <td>${this.#renderStartTime(shift, parsedTrace)}</td>
        <td>${(score.toFixed(4))}</td>
        ${this.#isFreshRecording ? html`
          <td>
            <div class="elements-shifted">
              ${this.#renderShiftedElements(elementsShifted)}
            </div>
          </td>` : LitHtml.nothing}
        ${hasCulprits && this.#isFreshRecording ? html`
          <td class="culprits">
            ${this.#renderRootCauseValues(rootCauses)}
          </td>` : LitHtml.nothing}
      </tr>`;
    // clang-format on
  }

  #renderParentCluster(
      cluster: Trace.Types.Events.SyntheticLayoutShiftCluster|undefined,
      parsedTrace: Trace.Handlers.Types.ParsedTrace): LitHtml.TemplateResult|null {
    if (!cluster) {
      return null;
    }
    const ts = Trace.Types.Timing.MicroSeconds(cluster.ts - (parsedTrace?.Meta.traceBounds.min ?? 0));
    const clusterTs = i18n.TimeUtilities.formatMicroSecondsTime(ts);

    // clang-format off
    return html`
      <span class="parent-cluster">${i18nString(UIStrings.parentCluster)}:
         <button type="button" class="timeline-link" @click=${() => this.#clickEvent(cluster)}>${i18nString(UIStrings.cluster, {PH1: clusterTs})}</button>
      </span>`;
    // clang-format on
  }

  #renderClusterTotalRow(cluster: Trace.Types.Events.SyntheticLayoutShiftCluster): LitHtml.TemplateResult|null {
    // clang-format off
    return html`
      <td class="total-row">${i18nString(UIStrings.total)}</td>
      <td class="total-row">${(cluster.clusterCumulativeScore.toFixed(4))}</td>`;
    // clang-format on
  }

  #renderShiftDetails(
      layoutShift: Trace.Types.Events.SyntheticLayoutShift,
      traceInsightsSets: Trace.Insights.Types.TraceInsightSets|null,
      parsedTrace: Trace.Handlers.Types.ParsedTrace,
      ): LitHtml.TemplateResult|null {
    if (!traceInsightsSets) {
      return null;
    }
    const insightsId = layoutShift.args.data?.navigationId ?? Trace.Types.Events.NO_NAVIGATION;
    const clsInsight = traceInsightsSets.get(insightsId)?.model.CLSCulprits;
    if (!clsInsight || clsInsight instanceof Error) {
      return null;
    }

    const rootCauses = clsInsight.shifts.get(layoutShift);
    const elementsShifted = layoutShift.args.data?.impacted_nodes ?? [];
    const hasCulprits = rootCauses &&
        (rootCauses.fontRequests.length || rootCauses.iframeIds.length || rootCauses.nonCompositedAnimations.length ||
         rootCauses.unsizedImages.length);
    const hasShiftedElements = elementsShifted?.length;

    const parentCluster = clsInsight.clusters.find(cluster => {
      return cluster.events.find(event => event === layoutShift);
    });

    // clang-format off
    return html`
      <table class="layout-shift-details-table">
        <thead class="table-title">
          <tr>
            <th>${i18nString(UIStrings.startTime)}</th>
            <th>${i18nString(UIStrings.shiftScore)}</th>
            ${hasShiftedElements && this.#isFreshRecording ? html`
              <th>${i18nString(UIStrings.elementsShifted)}</th>` : LitHtml.nothing}
            ${hasCulprits && this.#isFreshRecording ? html`
              <th>${i18nString(UIStrings.culprit)}</th> ` : LitHtml.nothing}
          </tr>
        </thead>
        <tbody>
          ${this.#renderShiftRow(layoutShift, parsedTrace, elementsShifted, rootCauses)}
        </tbody>
      </table>
      ${this.#renderParentCluster(parentCluster, parsedTrace)}
    `;
    // clang-format on
  }

  #renderClusterDetails(
      cluster: Trace.Types.Events.SyntheticLayoutShiftCluster,
      traceInsightsSets: Trace.Insights.Types.TraceInsightSets|null,
      parsedTrace: Trace.Handlers.Types.ParsedTrace): LitHtml.TemplateResult|null {
    if (!traceInsightsSets) {
      return null;
    }
    const insightsId = cluster.navigationId ?? Trace.Types.Events.NO_NAVIGATION;
    const clsInsight = traceInsightsSets.get(insightsId)?.model.CLSCulprits;
    if (!clsInsight || clsInsight instanceof Error) {
      return null;
    }

    // This finds the culprits of the cluster and returns an array of the culprits.
    const clusterCulprits = Array.from(clsInsight.shifts.entries())
                                .filter(([key]) => cluster.events.includes(key))
                                .map(([, value]) => value)
                                .flatMap(x => Object.values(x))
                                .flat();

    const hasCulprits = Boolean(clusterCulprits.length);

    // clang-format off
        return html`
          <table class="layout-shift-details-table">
            <thead class="table-title">
              <tr>
                <th>${i18nString(UIStrings.startTime)}</th>
                <th>${i18nString(UIStrings.shiftScore)}</th>
                ${this.#isFreshRecording ? html`
                  <th>${i18nString(UIStrings.elementsShifted)}</th>` : LitHtml.nothing}
                ${hasCulprits && this.#isFreshRecording ? html`
                  <th>${i18nString(UIStrings.culprit)}</th> ` : LitHtml.nothing}
              </tr>
            </thead>
            <tbody>
              ${cluster.events.map(shift => {
                const rootCauses = clsInsight.shifts.get(shift);
                const elementsShifted = shift.args.data?.impacted_nodes ?? [];
                return this.#renderShiftRow(shift, parsedTrace, elementsShifted, rootCauses);
              })}
              ${this.#renderClusterTotalRow(cluster)}
            </tbody>
          </table>
        `;
    // clang-format on
  }

  #render(): void {
    if (!this.#event || !this.#parsedTrace) {
      return;
    }

    // clang-format off
    const output = html`
      <div class="layout-shift-summary-details">
        <div
          class="event-details"
          @mouseover=${this.#togglePopover}
          @mouseleave=${this.#togglePopover}
        >
          ${this.#renderTitle(this.#event)}
          ${Trace.Types.Events.isSyntheticLayoutShift(this.#event)
            ? this.#renderShiftDetails(this.#event, this.#traceInsightsSets, this.#parsedTrace)
            : this.#renderClusterDetails(this.#event, this.#traceInsightsSets, this.#parsedTrace)
          }
        </div>
      </div>
    `;
    // clang-format on
    LitHtml.render(output, this.#shadow, {host: this});
  }

  #togglePopover(e: MouseEvent): void {
    const show = e.type === 'mouseover';
    if (e.type === 'mouseleave') {
      this.dispatchEvent(new CustomEvent('toggle-popover', {detail: {show}, bubbles: true, composed: true}));
    }

    if (!(e.target instanceof HTMLElement) || !this.#event) {
      return;
    }
    const rowEl = e.target.closest('tbody tr');
    if (!rowEl || !rowEl.parentElement) {
      return;
    }

    // Grab the associated trace event of this row.
    const event = Trace.Types.Events.isSyntheticLayoutShift(this.#event) ?
        this.#event :
        this.#event.events.find(e => e.ts === parseInt(rowEl.getAttribute('data-ts') ?? '', 10));
    this.dispatchEvent(new CustomEvent('toggle-popover', {detail: {event, show}, bubbles: true, composed: true}));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-layout-shift-details': LayoutShiftDetails;
  }
}

customElements.define('devtools-performance-layout-shift-details', LayoutShiftDetails);

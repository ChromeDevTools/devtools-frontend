// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Helpers from '../../../models/trace/helpers/helpers.js';
import * as Trace from '../../../models/trace/trace.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as LegacyComponents from '../../../ui/legacy/components/utils/utils.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as Utils from '../utils/utils.js';

import * as Insights from './insights/insights.js';
import layoutShiftDetailsStyles from './layoutShiftDetails.css.js';

const {html, render} = Lit;

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
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/LayoutShiftDetails.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  event: Trace.Types.Events.SyntheticLayoutShift|Trace.Types.Events.SyntheticLayoutShiftCluster|null;
  traceInsightsSets: Trace.Insights.Types.TraceInsightSets|null;
  parsedTrace: Trace.Handlers.Types.ParsedTrace|null;
  isFreshRecording: boolean;
  togglePopover: (e: MouseEvent) => void;
  onEventClick: (event: Trace.Types.Events.Event) => void;
}

export class LayoutShiftDetails extends UI.Widget.Widget {
  #view: typeof DEFAULT_VIEW;
  #event: Trace.Types.Events.SyntheticLayoutShift|Trace.Types.Events.SyntheticLayoutShiftCluster|null = null;
  #traceInsightsSets: Trace.Insights.Types.TraceInsightSets|null = null;
  #parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null;
  #isFreshRecording = false;

  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  set event(event: Trace.Types.Events.SyntheticLayoutShift|Trace.Types.Events.SyntheticLayoutShiftCluster) {
    this.#event = event;
    void this.requestUpdate();
  }

  set traceInsightsSets(traceInsightsSets: Trace.Insights.Types.TraceInsightSets|null) {
    this.#traceInsightsSets = traceInsightsSets;
    void this.requestUpdate();
  }

  set parsedTrace(parsedTrace: Trace.Handlers.Types.ParsedTrace|null) {
    this.#parsedTrace = parsedTrace;
    void this.requestUpdate();
  }

  set isFreshRecording(isFreshRecording: boolean) {
    this.#isFreshRecording = isFreshRecording;
    void this.requestUpdate();
  }

  // TODO(crbug.com/368170718): use eventRef instead
  #handleTraceEventClick(event: Trace.Types.Events.Event): void {
    this.contentElement.dispatchEvent(new Insights.EventRef.EventReferenceClick(event));
  }

  #togglePopover(e: MouseEvent): void {
    const show = e.type === 'mouseover';
    if (e.type === 'mouseleave') {
      this.contentElement.dispatchEvent(
          new CustomEvent('toggle-popover', {detail: {show}, bubbles: true, composed: true}));
    }

    if (!(e.target instanceof HTMLElement) || !this.#event) {
      return;
    }
    const rowEl = e.target.closest('tbody tr');
    if (!rowEl?.parentElement) {
      return;
    }

    // Grab the associated trace event of this row.
    const event = Trace.Types.Events.isSyntheticLayoutShift(this.#event) ?
        this.#event :
        this.#event.events.find(e => e.ts === parseInt(rowEl.getAttribute('data-ts') ?? '', 10));
    this.contentElement.dispatchEvent(
        new CustomEvent('toggle-popover', {detail: {event, show}, bubbles: true, composed: true}));
  }

  override performUpdate(): Promise<void>|void {
    this.#view(
        {
          event: this.#event,
          traceInsightsSets: this.#traceInsightsSets,
          parsedTrace: this.#parsedTrace,
          isFreshRecording: this.#isFreshRecording,
          togglePopover: e => this.#togglePopover(e),
          onEventClick: e => this.#handleTraceEventClick(e)
        },
        {}, this.contentElement);
  }
}

export const DEFAULT_VIEW: (input: ViewInput, output: object, target: HTMLElement) => void =
    (input, _output, target) => {
      if (!input.event || !input.parsedTrace) {
        render(html``, target);
        return;
      }

      const title = Utils.EntryName.nameForEntry(input.event);
      // clang-format off
      render(html`
        <style>${layoutShiftDetailsStyles}</style>
        <style>${Buttons.textButtonStyles}</style>

      <div class="layout-shift-summary-details">
        <div
          class="event-details"
          @mouseover=${input.togglePopover}
          @mouseleave=${input.togglePopover}
        >
        <div class="layout-shift-details-title">
          <div class="layout-shift-event-title"></div>
          ${title}
        </div>
        ${Trace.Types.Events.isSyntheticLayoutShift(input.event) ?
          renderLayoutShiftDetails(
            input.event, input.traceInsightsSets, input.parsedTrace, input.isFreshRecording, input.onEventClick,
         ) : renderLayoutShiftClusterDetails(
           input.event, input.traceInsightsSets, input.parsedTrace, input.onEventClick,
         )}
        </div>
      </div>
      `, target);
      // clang-format on
    };

function renderLayoutShiftDetails(
    layoutShift: Trace.Types.Events.SyntheticLayoutShift, traceInsightsSets: Trace.Insights.Types.TraceInsightSets|null,
    parsedTrace: Trace.Handlers.Types.ParsedTrace, isFreshRecording: boolean,
    onEventClick: (e: Trace.Types.Events.Event) => void): Lit.LitTemplate {
  if (!traceInsightsSets) {
    return Lit.nothing;
  }
  const insightsId = layoutShift.args.data?.navigationId ?? Trace.Types.Events.NO_NAVIGATION;
  const clsInsight = traceInsightsSets.get(insightsId)?.model.CLSCulprits;
  if (!clsInsight || clsInsight instanceof Error) {
    return Lit.nothing;
  }

  const rootCauses = clsInsight.shifts.get(layoutShift);

  let elementsShifted = layoutShift.args.data?.impacted_nodes ?? [];
  if (!isFreshRecording) {
    elementsShifted = elementsShifted?.filter(el => el.debug_name);
  }

  const hasCulprits = rootCauses &&
      (rootCauses.webFonts.length || rootCauses.iframes.length || rootCauses.nonCompositedAnimations.length ||
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
            ${hasShiftedElements ? html`
              <th>${i18nString(UIStrings.elementsShifted)}</th>` : Lit.nothing}
            ${hasCulprits ? html`
              <th>${i18nString(UIStrings.culprit)}</th> ` : Lit.nothing}
          </tr>
        </thead>
        <tbody>
          ${renderShiftRow(layoutShift, true, parsedTrace, elementsShifted, onEventClick, rootCauses)}
        </tbody>
      </table>
      ${renderParentCluster(parentCluster, onEventClick, parsedTrace)}
    `;
  // clang-format on
}

function renderLayoutShiftClusterDetails(
    cluster: Trace.Types.Events.SyntheticLayoutShiftCluster,
    traceInsightsSets: Trace.Insights.Types.TraceInsightSets|null, parsedTrace: Trace.Handlers.Types.ParsedTrace,
    onEventClick: (e: Trace.Types.Events.Event) => void): Lit.LitTemplate {
  if (!traceInsightsSets) {
    return Lit.nothing;
  }
  const insightsId = cluster.navigationId ?? Trace.Types.Events.NO_NAVIGATION;
  const clsInsight = traceInsightsSets.get(insightsId)?.model.CLSCulprits;
  if (!clsInsight || clsInsight instanceof Error) {
    return Lit.nothing;
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
          <th>${i18nString(UIStrings.elementsShifted)}</th>
          ${hasCulprits ? html`
            <th>${i18nString(UIStrings.culprit)}</th> ` : Lit.nothing}
        </tr>
      </thead>
      <tbody>
        ${cluster.events.map(shift => {
          const rootCauses = clsInsight.shifts.get(shift);
          const elementsShifted = shift.args.data?.impacted_nodes ?? [];
          return renderShiftRow(shift, false, parsedTrace, elementsShifted, onEventClick, rootCauses);
        })}

        <tr>
          <td class="total-row">${i18nString(UIStrings.total)}</td>
          <td class="total-row">${(cluster.clusterCumulativeScore.toFixed(4))}</td>
        </tr>
      </tbody>
    </table>
  `;
  // clang-format on
}

function renderShiftRow(
    currentShift: Trace.Types.Events.SyntheticLayoutShift, userHasSingleShiftSelected: boolean,
    parsedTrace: Trace.Handlers.Types.ParsedTrace, elementsShifted: Trace.Types.Events.TraceImpactedNode[],
    onEventClick: (e: Trace.Types.Events.Event) => void,
    rootCauses: Trace.Insights.Models.CLSCulprits.LayoutShiftRootCausesData|undefined): Lit.LitTemplate {
  const score = currentShift.args.data?.weighted_score_delta;
  if (!score) {
    return Lit.nothing;
  }
  const hasCulprits = Boolean(
      rootCauses &&
      (rootCauses.webFonts.length || rootCauses.iframes.length || rootCauses.nonCompositedAnimations.length ||
       rootCauses.unsizedImages.length));

  // clang-format off
    return html`
      <tr class="shift-row" data-ts=${currentShift.ts}>
        <td>${renderStartTime(currentShift, userHasSingleShiftSelected, parsedTrace, onEventClick)}</td>
        <td>${(score.toFixed(4))}</td>
        ${elementsShifted.length ? html`
          <td>
            <div class="elements-shifted">
              ${renderShiftedElements(currentShift, elementsShifted)}
            </div>
          </td>` : Lit.nothing}
        ${hasCulprits ? html`
          <td class="culprits">
            ${rootCauses?.webFonts.map(fontReq => renderFontRequest(fontReq))}
            ${rootCauses?.iframes.map(iframe => renderIframe(iframe))}
            ${rootCauses?.nonCompositedAnimations.map(failure => renderAnimation(failure, onEventClick))}
            ${rootCauses?.unsizedImages.map(unsizedImage => renderUnsizedImage(currentShift.args.frame, unsizedImage))}
          </td>` : Lit.nothing}
      </tr>`;
  // clang-format on
}

function renderStartTime(
    shift: Trace.Types.Events.SyntheticLayoutShift,
    userHasSingleShiftSelected: boolean,
    parsedTrace: Trace.Handlers.Types.ParsedTrace,
    onEventClick: (e: Trace.Types.Events.Event) => void,
    ): Lit.TemplateResult {
  const ts = Trace.Types.Timing.Micro(shift.ts - parsedTrace.Meta.traceBounds.min);
  if (userHasSingleShiftSelected) {
    return html`${i18n.TimeUtilities.preciseMillisToString(Helpers.Timing.microToMilli(ts))}`;
  }
  const shiftTs = i18n.TimeUtilities.formatMicroSecondsTime(ts);
  // clang-format off
    return html`
         <button type="button" class="timeline-link" @click=${() => onEventClick(shift)}>${i18nString(UIStrings.layoutShift, {PH1: shiftTs})}</button>`;
  // clang-format on
}

function renderParentCluster(
    cluster: Trace.Types.Events.SyntheticLayoutShiftCluster|undefined,
    onEventClick: (e: Trace.Types.Events.Event) => void,
    parsedTrace: Trace.Handlers.Types.ParsedTrace): Lit.LitTemplate {
  if (!cluster) {
    return Lit.nothing;
  }
  const ts = Trace.Types.Timing.Micro(cluster.ts - (parsedTrace?.Meta.traceBounds.min ?? 0));
  const clusterTs = i18n.TimeUtilities.formatMicroSecondsTime(ts);

  // clang-format off
    return html`
      <span class="parent-cluster">${i18nString(UIStrings.parentCluster)}:<button type="button" class="timeline-link parent-cluster-link" @click=${() => onEventClick(cluster)}>${i18nString(UIStrings.cluster, {PH1: clusterTs})}</button>
      </span>`;
  // clang-format on
}

function renderShiftedElements(
    shift: Trace.Types.Events.SyntheticLayoutShift,
    elementsShifted: Trace.Types.Events.TraceImpactedNode[]|undefined): Lit.TemplateResult {
  // clang-format off
    return html`
      ${elementsShifted?.map(el => {
        if (el.node_id !== undefined) {
          return html`
            <devtools-performance-node-link
              .data=${{
                backendNodeId: el.node_id,
                frame: shift.args.frame,
                fallbackHtmlSnippet: el.debug_name,
              } as Insights.NodeLink.NodeLinkData}>
            </devtools-performance-node-link>`;
        }
          return Lit.nothing;
      })}`;
  // clang-format on
}

function renderAnimation(
    failure: Trace.Insights.Models.CLSCulprits.NoncompositedAnimationFailure,
    onEventClick: (e: Trace.Types.Events.Event) => void,

    ): Lit.LitTemplate {
  const event = failure.animation;
  if (!event) {
    return Lit.nothing;
  }
  // clang-format off
    return html`
        <span class="culprit">
        <span class="culprit-type">${i18nString(UIStrings.nonCompositedAnimation)}: </span>
        <button type="button" class="culprit-value timeline-link" @click=${() => onEventClick(event)}>${i18nString(UIStrings.animation)}</button>
      </span>`;
  // clang-format on
}

function renderUnsizedImage(
    frame: string, unsizedImage: Trace.Insights.Models.CLSCulprits.UnsizedImage): Lit.LitTemplate {
  // clang-format off
    const el = html`
      <devtools-performance-node-link
        .data=${{
          backendNodeId: unsizedImage.backendNodeId,
          frame,
          fallbackUrl: unsizedImage.paintImageEvent.args.data.url,
        } as Insights.NodeLink.NodeLinkData}>
      </devtools-performance-node-link>`;
    return html`
      <span class="culprit">
        <span class="culprit-type">${i18nString(UIStrings.unsizedImage)}: </span>
        <span class="culprit-value">${el}</span>
      </span>`;
  // clang-format on
}

function renderFontRequest(request: Trace.Types.Events.SyntheticNetworkRequest): Lit.LitTemplate {
  const linkifiedURL = linkifyURL(request.args.data.url as Platform.DevToolsPath.UrlString);

  // clang-format off
    return html`
      <span class="culprit">
        <span class="culprit-type">${i18nString(UIStrings.fontRequest)}: </span>
        <span class="culprit-value">${linkifiedURL}</span>
      </span>`;
  // clang-format on
}

function linkifyURL(url: Platform.DevToolsPath.UrlString): HTMLElement {
  return LegacyComponents.Linkifier.Linkifier.linkifyURL(url, {
    tabStop: true,
    showColumnNumber: false,
    inlineFrameIndex: 0,
    maxLength: MAX_URL_LENGTH,
  });
}

function renderIframe(iframeRootCause: Trace.Insights.Models.CLSCulprits.IframeRootCause): Lit.LitTemplate {
  const domLoadingId = iframeRootCause.frame as Protocol.Page.FrameId;
  const domLoadingFrame = SDK.FrameManager.FrameManager.instance().getFrame(domLoadingId);

  let el;
  if (domLoadingFrame) {
    el = LegacyComponents.Linkifier.Linkifier.linkifyRevealable(domLoadingFrame, domLoadingFrame.displayName());
  } else {
    el = linkifyURL(iframeRootCause.url as Platform.DevToolsPath.UrlString);
  }

  // clang-format off
    return html`
      <span class="culprit">
        <span class="culprit-type"> ${i18nString(UIStrings.injectedIframe)}: </span>
        <span class="culprit-value">${el}</span>
      </span>`;
  // clang-format on
}

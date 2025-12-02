// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Helpers from '../../../models/trace/helpers/helpers.js';
import * as Trace from '../../../models/trace/trace.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as LegacyComponents from '../../../ui/legacy/components/utils/utils.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as Insights from './insights/insights.js';
import layoutShiftDetailsStyles from './layoutShiftDetails.css.js';
const { html, render } = Lit;
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
export class LayoutShiftDetails extends UI.Widget.Widget {
    #view;
    #event = null;
    #parsedTrace = null;
    #isFreshRecording = false;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    set event(event) {
        this.#event = event;
        void this.requestUpdate();
    }
    set parsedTrace(parsedTrace) {
        this.#parsedTrace = parsedTrace;
        void this.requestUpdate();
    }
    set isFreshRecording(isFreshRecording) {
        this.#isFreshRecording = isFreshRecording;
        void this.requestUpdate();
    }
    // TODO(crbug.com/368170718): use eventRef instead
    #handleTraceEventClick(event) {
        this.contentElement.dispatchEvent(new Insights.EventRef.EventReferenceClick(event));
    }
    #togglePopover(e) {
        const show = e.type === 'mouseover';
        if (e.type === 'mouseleave') {
            this.contentElement.dispatchEvent(new CustomEvent('toggle-popover', { detail: { show }, bubbles: true, composed: true }));
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
        this.contentElement.dispatchEvent(new CustomEvent('toggle-popover', { detail: { event, show }, bubbles: true, composed: true }));
    }
    performUpdate() {
        this.#view({
            event: this.#event,
            parsedTrace: this.#parsedTrace,
            isFreshRecording: this.#isFreshRecording,
            togglePopover: e => this.#togglePopover(e),
            onEventClick: e => this.#handleTraceEventClick(e)
        }, {}, this.contentElement);
    }
}
export const DEFAULT_VIEW = (input, _output, target) => {
    if (!input.event || !input.parsedTrace) {
        render(Lit.nothing, target);
        return;
    }
    const title = Trace.Name.forEntry(input.event);
    // clang-format off
    render(html `
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
        renderLayoutShiftDetails(input.event, input.parsedTrace.insights, input.parsedTrace, input.isFreshRecording, input.onEventClick) : renderLayoutShiftClusterDetails(input.event, input.parsedTrace.insights, input.parsedTrace, input.onEventClick)}
        </div>
      </div>
      `, target);
    // clang-format on
};
function findInsightSet(insightSets, navigationId) {
    return insightSets?.values().find(insightSet => navigationId ? navigationId === insightSet.navigation?.args.data?.navigationId : !insightSet.navigation);
}
function renderLayoutShiftDetails(layoutShift, insightSets, parsedTrace, isFreshRecording, onEventClick) {
    if (!insightSets) {
        return Lit.nothing;
    }
    const clsInsight = findInsightSet(insightSets, layoutShift.args.data?.navigationId)?.model.CLSCulprits;
    if (!clsInsight) {
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
    return html `
      <table class="layout-shift-details-table">
        <thead class="table-title">
          <tr>
            <th>${i18nString(UIStrings.startTime)}</th>
            <th>${i18nString(UIStrings.shiftScore)}</th>
            ${hasShiftedElements ? html `
              <th>${i18nString(UIStrings.elementsShifted)}</th>` : Lit.nothing}
            ${hasCulprits ? html `
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
function renderLayoutShiftClusterDetails(cluster, insightSets, parsedTrace, onEventClick) {
    if (!insightSets) {
        return Lit.nothing;
    }
    const clsInsight = findInsightSet(insightSets, cluster.navigationId)?.model.CLSCulprits;
    if (!clsInsight) {
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
    return html `
    <table class="layout-shift-details-table">
      <thead class="table-title">
        <tr>
          <th>${i18nString(UIStrings.startTime)}</th>
          <th>${i18nString(UIStrings.shiftScore)}</th>
          <th>${i18nString(UIStrings.elementsShifted)}</th>
          ${hasCulprits ? html `
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
function renderShiftRow(currentShift, userHasSingleShiftSelected, parsedTrace, elementsShifted, onEventClick, rootCauses) {
    const score = currentShift.args.data?.weighted_score_delta;
    if (!score) {
        return Lit.nothing;
    }
    const hasCulprits = Boolean(rootCauses &&
        (rootCauses.webFonts.length || rootCauses.iframes.length || rootCauses.nonCompositedAnimations.length ||
            rootCauses.unsizedImages.length));
    // clang-format off
    return html `
      <tr class="shift-row" data-ts=${currentShift.ts}>
        <td>${renderStartTime(currentShift, userHasSingleShiftSelected, parsedTrace, onEventClick)}</td>
        <td>${(score.toFixed(4))}</td>
        ${elementsShifted.length ? html `
          <td>
            <div class="elements-shifted">
              ${renderShiftedElements(currentShift, elementsShifted)}
            </div>
          </td>` : Lit.nothing}
        ${hasCulprits ? html `
          <td class="culprits">
            ${rootCauses?.webFonts.map(fontReq => renderFontRequest(fontReq))}
            ${rootCauses?.iframes.map(iframe => renderIframe(iframe))}
            ${rootCauses?.nonCompositedAnimations.map(failure => renderAnimation(failure, onEventClick))}
            ${rootCauses?.unsizedImages.map(unsizedImage => renderUnsizedImage(currentShift.args.frame, unsizedImage))}
          </td>` : Lit.nothing}
      </tr>`;
    // clang-format on
}
function renderStartTime(shift, userHasSingleShiftSelected, parsedTrace, onEventClick) {
    const ts = Trace.Types.Timing.Micro(shift.ts - parsedTrace.data.Meta.traceBounds.min);
    if (userHasSingleShiftSelected) {
        return html `${i18n.TimeUtilities.preciseMillisToString(Helpers.Timing.microToMilli(ts))}`;
    }
    const shiftTs = i18n.TimeUtilities.formatMicroSecondsTime(ts);
    // clang-format off
    return html `
         <button type="button" class="timeline-link" @click=${() => onEventClick(shift)}>${i18nString(UIStrings.layoutShift, { PH1: shiftTs })}</button>`;
    // clang-format on
}
function renderParentCluster(cluster, onEventClick, parsedTrace) {
    if (!cluster) {
        return Lit.nothing;
    }
    const ts = Trace.Types.Timing.Micro(cluster.ts - (parsedTrace.data.Meta.traceBounds.min ?? 0));
    const clusterTs = i18n.TimeUtilities.formatMicroSecondsTime(ts);
    // clang-format off
    return html `
      <span class="parent-cluster">${i18nString(UIStrings.parentCluster)}:<button type="button" class="timeline-link parent-cluster-link" @click=${() => onEventClick(cluster)}>${i18nString(UIStrings.cluster, { PH1: clusterTs })}</button>
      </span>`;
    // clang-format on
}
function renderShiftedElements(shift, elementsShifted) {
    // clang-format off
    return html `
      ${elementsShifted?.map(el => {
        if (el.node_id !== undefined) {
            return html `
            <devtools-performance-node-link
              .data=${{
                backendNodeId: el.node_id,
                frame: shift.args.frame,
                fallbackHtmlSnippet: el.debug_name,
            }}>
            </devtools-performance-node-link>`;
        }
        return Lit.nothing;
    })}`;
    // clang-format on
}
function renderAnimation(failure, onEventClick) {
    const event = failure.animation;
    if (!event) {
        return Lit.nothing;
    }
    // clang-format off
    return html `
        <span class="culprit">
        <span class="culprit-type">${i18nString(UIStrings.nonCompositedAnimation)}: </span>
        <button type="button" class="culprit-value timeline-link" @click=${() => onEventClick(event)}>${i18nString(UIStrings.animation)}</button>
      </span>`;
    // clang-format on
}
function renderUnsizedImage(frame, unsizedImage) {
    // clang-format off
    const el = html `
      <devtools-performance-node-link
        .data=${{
        backendNodeId: unsizedImage.backendNodeId,
        frame,
        fallbackUrl: unsizedImage.paintImageEvent.args.data.url,
    }}>
      </devtools-performance-node-link>`;
    return html `
      <span class="culprit">
        <span class="culprit-type">${i18nString(UIStrings.unsizedImage)}: </span>
        <span class="culprit-value">${el}</span>
      </span>`;
    // clang-format on
}
function renderFontRequest(request) {
    const linkifiedURL = linkifyURL(request.args.data.url);
    // clang-format off
    return html `
      <span class="culprit">
        <span class="culprit-type">${i18nString(UIStrings.fontRequest)}: </span>
        <span class="culprit-value">${linkifiedURL}</span>
      </span>`;
    // clang-format on
}
function linkifyURL(url) {
    return LegacyComponents.Linkifier.Linkifier.linkifyURL(url, {
        tabStop: true,
        showColumnNumber: false,
        inlineFrameIndex: 0,
        maxLength: MAX_URL_LENGTH,
    });
}
function renderIframe(iframeRootCause) {
    const domLoadingId = iframeRootCause.frame;
    const domLoadingFrame = SDK.FrameManager.FrameManager.instance().getFrame(domLoadingId);
    let el;
    if (domLoadingFrame) {
        el = LegacyComponents.Linkifier.Linkifier.linkifyRevealable(domLoadingFrame, domLoadingFrame.displayName());
    }
    else {
        el = linkifyURL(iframeRootCause.url);
    }
    // clang-format off
    return html `
      <span class="culprit">
        <span class="culprit-type"> ${i18nString(UIStrings.injectedIframe)}: </span>
        <span class="culprit-value">${el}</span>
      </span>`;
    // clang-format on
}
//# sourceMappingURL=LayoutShiftDetails.js.map
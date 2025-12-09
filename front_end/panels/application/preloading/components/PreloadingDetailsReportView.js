// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../../ui/components/report_view/report_view.js';
import '../../../../ui/components/request_link_icon/request_link_icon.js';
import '../../../../ui/legacy/components/utils/utils.js';
import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import { assertNotNullOrUndefined } from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Logs from '../../../../models/logs/logs.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import * as PreloadingHelper from '../helper/helper.js';
import preloadingDetailsReportViewStyles from './preloadingDetailsReportView.css.js';
import * as PreloadingString from './PreloadingString.js';
import { prefetchFailureReason, prerenderFailureReason, ruleSetLocationShort } from './PreloadingString.js';
const { html } = Lit;
const UIStrings = {
    /**
     * @description Text in PreloadingDetailsReportView of the Application panel if no element is selected. An element here is an item in a
     * table of target URLs and additional prefetching states. https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules
     */
    noElementSelected: 'No element selected',
    /**
     * @description Text in PreloadingDetailsReportView of the Application panel to prompt user to select an element in a table. An element here is an item in a
     * table of target URLs and additional prefetching states. https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules
     */
    selectAnElementForMoreDetails: 'Select an element for more details',
    /**
     * @description Text in details
     */
    detailsDetailedInformation: 'Detailed information',
    /**
     * @description Text in details
     */
    detailsAction: 'Action',
    /**
     * @description Text in details
     */
    detailsStatus: 'Status',
    /**
     * @description Text in details
     */
    detailsTargetHint: 'Target hint',
    /**
     * @description Text in details
     */
    detailsFailureReason: 'Failure reason',
    /**
     * @description Header of rule set
     */
    detailsRuleSet: 'Rule set',
    /**
     * @description Description: status
     */
    automaticallyFellBackToPrefetch: '(automatically fell back to prefetch)',
    /**
     * @description Description: status
     */
    detailedStatusNotTriggered: 'Speculative load attempt is not yet triggered.',
    /**
     * @description Description: status
     */
    detailedStatusPending: 'Speculative load attempt is eligible but pending.',
    /**
     * @description Description: status
     */
    detailedStatusRunning: 'Speculative load is running.',
    /**
     * @description Description: status
     */
    detailedStatusReady: 'Speculative load finished and the result is ready for the next navigation.',
    /**
     * @description Description: status
     */
    detailedStatusSuccess: 'Speculative load finished and used for a navigation.',
    /**
     * @description Description: status
     */
    detailedStatusFailure: 'Speculative load failed.',
    /**
     * @description Description: status
     */
    detailedStatusFallbackToPrefetch: 'Speculative load failed, but fallback to prefetch succeeded.',
    /**
     * @description button: Contents of button to inspect prerendered page
     */
    buttonInspect: 'Inspect',
    /**
     * @description button: Title of button to inspect prerendered page
     */
    buttonClickToInspect: 'Click to inspect prerendered page',
    /**
     * @description button: Title of button to reveal rule set
     */
    buttonClickToRevealRuleSet: 'Click to reveal rule set',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/preloading/components/PreloadingDetailsReportView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
class PreloadingUIUtils {
    static detailedStatus({ status }) {
        // See content/public/browser/preloading.h PreloadingAttemptOutcome.
        switch (status) {
            case "NotTriggered" /* SDK.PreloadingModel.PreloadingStatus.NOT_TRIGGERED */:
                return i18nString(UIStrings.detailedStatusNotTriggered);
            case "Pending" /* SDK.PreloadingModel.PreloadingStatus.PENDING */:
                return i18nString(UIStrings.detailedStatusPending);
            case "Running" /* SDK.PreloadingModel.PreloadingStatus.RUNNING */:
                return i18nString(UIStrings.detailedStatusRunning);
            case "Ready" /* SDK.PreloadingModel.PreloadingStatus.READY */:
                return i18nString(UIStrings.detailedStatusReady);
            case "Success" /* SDK.PreloadingModel.PreloadingStatus.SUCCESS */:
                return i18nString(UIStrings.detailedStatusSuccess);
            case "Failure" /* SDK.PreloadingModel.PreloadingStatus.FAILURE */:
                return i18nString(UIStrings.detailedStatusFailure);
            // NotSupported is used to handle unreachable case. For example,
            // there is no code path for
            // PreloadingTriggeringOutcome::kTriggeredButPending in prefetch,
            // which is mapped to NotSupported. So, we regard it as an
            // internal error.
            case "NotSupported" /* SDK.PreloadingModel.PreloadingStatus.NOT_SUPPORTED */:
                return i18n.i18n.lockedString('Internal error');
        }
    }
    static detailedTargetHint(key) {
        assertNotNullOrUndefined(key.targetHint);
        switch (key.targetHint) {
            case "Blank" /* Protocol.Preload.SpeculationTargetHint.Blank */:
                return '_blank';
            case "Self" /* Protocol.Preload.SpeculationTargetHint.Self */:
                return '_self';
        }
    }
}
function url(data) {
    const attempt = data.pipeline.getOriginallyTriggered();
    const prefetchStatus = data.pipeline.getPrefetch()?.status;
    let value;
    if (attempt.action === "Prefetch" /* Protocol.Preload.SpeculationAction.Prefetch */ && attempt.requestId !== undefined &&
        prefetchStatus !== "NotTriggered" /* SDK.PreloadingModel.PreloadingStatus.NOT_TRIGGERED */) {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        const { requestId, key: { url } } = attempt;
        const affectedRequest = { requestId, url };
        value = html `
        <devtools-request-link-icon
          .data=${{
            affectedRequest,
            requestResolver: data.requestResolver || new Logs.RequestResolver.RequestResolver(),
            displayURL: true,
            urlToDisplay: url,
        }}
        >
        </devtools-request-link-icon>
    `;
    }
    else {
        value = html `<div class="text-ellipsis" title=${attempt.key.url}>${attempt.key.url}</div>`;
    }
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html `
      <devtools-report-key>${i18n.i18n.lockedString('URL')}</devtools-report-key>
      <devtools-report-value>
        ${value}
      </devtools-report-value>
  `;
    // clang-format on
}
function isPrerenderLike(speculationAction) {
    return [
        "Prerender" /* Protocol.Preload.SpeculationAction.Prerender */, "PrerenderUntilScript" /* Protocol.Preload.SpeculationAction.PrerenderUntilScript */
    ].includes(speculationAction);
}
function action(data, isFallbackToPrefetch) {
    const attempt = data.pipeline.getOriginallyTriggered();
    const action = PreloadingString.capitalizedAction(attempt.action);
    let maybeFallback = Lit.nothing;
    if (isFallbackToPrefetch) {
        maybeFallback = html `${i18nString(UIStrings.automaticallyFellBackToPrefetch)}`;
    }
    let maybeInspectButton = Lit.nothing;
    (() => {
        if (!isPrerenderLike(attempt.action)) {
            return;
        }
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (target === null) {
            return;
        }
        const prerenderTarget = SDK.TargetManager.TargetManager.instance().targets().find(child => child.targetInfo()?.subtype === 'prerender' && child.inspectedURL() === attempt.key.url);
        const disabled = (prerenderTarget === undefined);
        const inspect = () => {
            if (prerenderTarget === undefined) {
                return;
            }
            UI.Context.Context.instance().setFlavor(SDK.Target.Target, prerenderTarget);
        };
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        maybeInspectButton = html `
        <devtools-button
          @click=${inspect}
          .title=${i18nString(UIStrings.buttonClickToInspect)}
          .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
          .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
          .disabled=${disabled}
          jslog=${VisualLogging.action('inspect-prerendered-page').track({ click: true })}
        >
          ${i18nString(UIStrings.buttonInspect)}
        </devtools-button>
    `;
        // clang-format on
    })();
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html `
      <devtools-report-key>${i18nString(UIStrings.detailsAction)}</devtools-report-key>
      <devtools-report-value>
        <div class="text-ellipsis" title="">
          ${action} ${maybeFallback} ${maybeInspectButton}
        </div>
      </devtools-report-value>
  `;
    // clang-format on
}
function status(data, isFallbackToPrefetch) {
    const attempt = data.pipeline.getOriginallyTriggered();
    const detailedStatus = isFallbackToPrefetch ? i18nString(UIStrings.detailedStatusFallbackToPrefetch) :
        PreloadingUIUtils.detailedStatus(attempt);
    return html `
      <devtools-report-key>${i18nString(UIStrings.detailsStatus)}</devtools-report-key>
      <devtools-report-value>
        ${detailedStatus}
      </devtools-report-value>
  `;
}
function maybePrefetchFailureReason(data) {
    const attempt = data.pipeline.getOriginallyTriggered();
    if (attempt.action !== "Prefetch" /* Protocol.Preload.SpeculationAction.Prefetch */) {
        return Lit.nothing;
    }
    const failureDescription = prefetchFailureReason(attempt);
    if (failureDescription === null) {
        return Lit.nothing;
    }
    return html `
      <devtools-report-key>${i18nString(UIStrings.detailsFailureReason)}</devtools-report-key>
      <devtools-report-value>
        ${failureDescription}
      </devtools-report-value>
  `;
}
function targetHint(data) {
    const attempt = data.pipeline.getOriginallyTriggered();
    const hasTargetHint = isPrerenderLike(attempt.action) && attempt.key.targetHint !== undefined;
    if (!hasTargetHint) {
        return Lit.nothing;
    }
    return html `
      <devtools-report-key>${i18nString(UIStrings.detailsTargetHint)}</devtools-report-key>
      <devtools-report-value>
        ${PreloadingUIUtils.detailedTargetHint(attempt.key)}
      </devtools-report-value>
  `;
}
function maybePrerenderFailureReason(data) {
    const attempt = data.pipeline.getOriginallyTriggered();
    if (!isPrerenderLike(attempt.action)) {
        return Lit.nothing;
    }
    const failureReason = prerenderFailureReason(attempt);
    if (failureReason === null) {
        return Lit.nothing;
    }
    return html `
      <devtools-report-key>${i18nString(UIStrings.detailsFailureReason)}</devtools-report-key>
      <devtools-report-value>
        ${failureReason}
      </devtools-report-value>
  `;
}
const DEFAULT_VIEW = ({ data, onRevealRuleSet }, _, target) => {
    if (data === null) {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        Lit.render(html `
      <style>${preloadingDetailsReportViewStyles}</style>
      <style>${UI.inspectorCommonStyles}</style>
      <div class="empty-state">
        <span class="empty-state-header">${i18nString(UIStrings.noElementSelected)}</span>
        <span class="empty-state-description">${i18nString(UIStrings.selectAnElementForMoreDetails)}</span>
      </div>
    `, target, { host: target });
        // clang-format on
        return;
    }
    const pipeline = data.pipeline;
    const pageURL = data.pageURL;
    const isFallbackToPrefetch = pipeline.getPrerender()?.status === "Failure" /* SDK.PreloadingModel.PreloadingStatus.FAILURE */ &&
        (pipeline.getPrefetch()?.status === "Ready" /* SDK.PreloadingModel.PreloadingStatus.READY */ ||
            pipeline.getPrefetch()?.status === "Success" /* SDK.PreloadingModel.PreloadingStatus.SUCCESS */);
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    Lit.render(html `
    <style>${preloadingDetailsReportViewStyles}</style>
    <style>${UI.inspectorCommonStyles}</style>
    <devtools-report
      .data=${{ reportTitle: 'Speculative Loading Attempt' }}
      jslog=${VisualLogging.section('preloading-details')}>
      <devtools-report-section-header>${i18nString(UIStrings.detailsDetailedInformation)}</devtools-report-section-header>

      ${url(data)}
      ${action(data, isFallbackToPrefetch)}
      ${status(data, isFallbackToPrefetch)}
      ${targetHint(data)}
      ${maybePrefetchFailureReason(data)}
      ${maybePrerenderFailureReason(data)}

      ${data.ruleSets.map(ruleSet => {
        const location = ruleSetLocationShort(ruleSet, pageURL);
        return html `
          <devtools-report-key>${i18nString(UIStrings.detailsRuleSet)}</devtools-report-key>
          <devtools-report-value>
            <div class="text-ellipsis" title="">
              <button class="link" role="link"
                @click=${() => onRevealRuleSet(ruleSet)}
                title=${i18nString(UIStrings.buttonClickToRevealRuleSet)}
                style=${Lit.Directives.styleMap({
            color: 'var(--sys-color-primary)',
            'text-decoration': 'underline',
        })}
                jslog=${VisualLogging.action('reveal-rule-set').track({ click: true })}
              >
                ${location}
              </button>
            </div>
          </devtools-report-value>
        `;
    })}
    </devtools-report>
  `, target, { host: target });
    // clang-format on
};
export class PreloadingDetailsReportView extends UI.Widget.VBox {
    #view;
    #data = null;
    constructor(view = DEFAULT_VIEW) {
        super();
        this.#view = view;
    }
    set data(data) {
        this.#data = data;
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            data: this.#data,
            onRevealRuleSet: (ruleSet) => {
                void Common.Revealer.reveal(new PreloadingHelper.PreloadingForward.RuleSetView(ruleSet.id));
            },
        }, undefined, this.contentElement);
    }
}
//# sourceMappingURL=PreloadingDetailsReportView.js.map
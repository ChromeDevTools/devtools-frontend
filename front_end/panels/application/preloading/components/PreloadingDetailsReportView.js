// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../../ui/components/report_view/report_view.js';
import '../../../../ui/components/request_link_icon/request_link_icon.js';
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
     * @description Empty state header in the preloading details report of the Application panel when no element is selected.
     */
    noElementSelected: 'No element selected',
    /**
     * @description Empty state description in the preloading details report of the Application panel prompting the user to select an element.
     */
    selectAnElementForMoreDetails: 'Select an element for more details',
    /**
     * @description Section header in the preloading details report for detailed information.
     */
    detailsDetailedInformation: 'Detailed information',
    /**
     * @description Field label in the preloading details report for the speculation action.
     */
    detailsAction: 'Action',
    /**
     * @description Field label in the preloading details report for the preloading status.
     */
    detailsStatus: 'Status',
    /**
     * @description Field label in the preloading details report for the target hint.
     */
    detailsTargetHint: 'Target hint',
    /**
     * @description Field label in the preloading details report for form submission.
     */
    detailsFormSubmission: 'Form submission',
    /**
     * @description Field label in the preloading details report for the failure reason.
     */
    detailsFailureReason: 'Failure reason',
    /**
     * @description Field label in the preloading details report for the rule set.
     */
    detailsRuleSet: 'Rule set',
    /**
     * @description Field value in the preloading details report indicating true or enabled.
     */
    yes: 'Yes',
    /**
     * @description Field value in the preloading details report indicating false or disabled.
     */
    no: 'No',
    /**
     * @description Status note in the preloading details report indicating prerender automatically fell back to prefetch.
     */
    automaticallyFellBackToPrefetch: '(automatically fell back to prefetch)',
    /**
     * @description Detailed status in the preloading details report indicating the speculative load attempt isn't yet triggered.
     */
    detailedStatusNotTriggered: 'Speculative load attempt isn’t yet triggered',
    /**
     * @description Detailed status in the preloading details report indicating the speculative load attempt is eligible but pending.
     */
    detailedStatusPending: 'Speculative load attempt is eligible but pending',
    /**
     * @description Detailed status in the preloading details report indicating the speculative load is running.
     */
    detailedStatusRunning: 'Speculative load is running',
    /**
     * @description Detailed status in the preloading details report indicating the speculative load finished and the result is ready for the next navigation.
     */
    detailedStatusReady: 'Speculative load finished and the result is ready for the next navigation',
    /**
     * @description Detailed status in the preloading details report indicating the speculative load finished and was used for a navigation.
     */
    detailedStatusSuccess: 'Speculative load finished and used for a navigation',
    /**
     * @description Detailed status in the preloading details report indicating the speculative load failed.
     */
    detailedStatusFailure: 'Speculative load failed',
    /**
     * @description Detailed status in the preloading details report indicating the speculative load failed, but fallback to prefetch succeeded.
     */
    detailedStatusFallbackToPrefetch: 'Speculative load failed, but fallback to prefetch succeeded',
    /**
     * @description Button text to inspect the prerendered page.
     */
    buttonInspect: 'Inspect',
    /**
     * @description Tooltip text for the button to inspect the prerendered page.
     */
    buttonClickToInspect: 'Inspect prerendered page',
    /**
     * @description Tooltip text for the button to reveal the rule set in the speculation rules view.
     */
    buttonClickToRevealRuleSet: 'Reveal rule set',
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
const DEFAULT_VIEW = (input, _output, target) => {
    if (input.data === null) {
        // clang-format off
        Lit.render(html `
      <style>${preloadingDetailsReportViewStyles}</style>
      <style>${UI.inspectorCommonStyles}</style>
      <div class="empty-state">
        <span class="empty-state-header">${i18nString(UIStrings.noElementSelected)}</span>
        <span class="empty-state-description">${i18nString(UIStrings.selectAnElementForMoreDetails)}</span>
      </div>
    `, target);
        // clang-format on
        return;
    }
    const pipeline = input.data.pipeline;
    const pageURL = input.data.pageURL;
    const isFallbackToPrefetch = pipeline.getPrerender()?.status === "Failure" /* SDK.PreloadingModel.PreloadingStatus.FAILURE */ &&
        (pipeline.getPrefetch()?.status === "Ready" /* SDK.PreloadingModel.PreloadingStatus.READY */ ||
            pipeline.getPrefetch()?.status === "Success" /* SDK.PreloadingModel.PreloadingStatus.SUCCESS */);
    const isPrerenderLike = (speculationAction) => {
        return [
            "Prerender" /* Protocol.Preload.SpeculationAction.Prerender */,
            "PrerenderUntilScript" /* Protocol.Preload.SpeculationAction.PrerenderUntilScript */,
        ].includes(speculationAction);
    };
    const url = () => {
        assertNotNullOrUndefined(input.data);
        const attempt = input.data.pipeline.getOriginallyTriggered();
        const prefetchStatus = input.data.pipeline.getPrefetch()?.status;
        let value;
        if (attempt.action === "Prefetch" /* Protocol.Preload.SpeculationAction.Prefetch */ && attempt.requestId !== undefined &&
            prefetchStatus !== "NotTriggered" /* SDK.PreloadingModel.PreloadingStatus.NOT_TRIGGERED */) {
            const { requestId, key: { url } } = attempt;
            const affectedRequest = { requestId, url };
            // clang-format off
            value = html `
          <devtools-request-link-icon
            .data=${{
                affectedRequest,
                requestResolver: input.data.requestResolver || new Logs.RequestResolver.RequestResolver(Logs.NetworkLog.NetworkLog.instance()),
                displayURL: true,
                urlToDisplay: url,
            }}
          >
          </devtools-request-link-icon>
      `;
            // clang-format on
        }
        else {
            value = html `
          <div class="text-ellipsis" title=${attempt.key.url}>${attempt.key.url}</div>
      `;
        }
        return html `
        <devtools-report-key>${i18n.i18n.lockedString('URL')}</devtools-report-key>
        <devtools-report-value>
          ${value}
        </devtools-report-value>
    `;
    };
    const action = (isFallbackToPrefetch) => {
        assertNotNullOrUndefined(input.data);
        const attempt = input.data.pipeline.getOriginallyTriggered();
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
        })();
        return html `
        <devtools-report-key>${i18nString(UIStrings.detailsAction)}</devtools-report-key>
        <devtools-report-value>
          <div class="text-ellipsis" title="">
            ${action} ${maybeFallback} ${maybeInspectButton}
          </div>
        </devtools-report-value>
    `;
    };
    const status = (isFallbackToPrefetch) => {
        assertNotNullOrUndefined(input.data);
        const attempt = input.data.pipeline.getOriginallyTriggered();
        const detailedStatus = isFallbackToPrefetch ? i18nString(UIStrings.detailedStatusFallbackToPrefetch) :
            PreloadingUIUtils.detailedStatus(attempt);
        return html `
        <devtools-report-key>${i18nString(UIStrings.detailsStatus)}</devtools-report-key>
        <devtools-report-value>
          ${detailedStatus}
        </devtools-report-value>
    `;
    };
    const maybePrefetchFailureReason = () => {
        assertNotNullOrUndefined(input.data);
        const attempt = input.data.pipeline.getOriginallyTriggered();
        if (attempt.action !== "Prefetch" /* Protocol.Preload.SpeculationAction.Prefetch */) {
            return Lit.nothing;
        }
        // Lookup status code for Non2XX failures.
        const statusCode = PreloadingHelper.PreloadingForward.preloadStatusCode(attempt);
        const failureDescription = prefetchFailureReason(attempt, statusCode);
        if (failureDescription === null) {
            return Lit.nothing;
        }
        return html `
        <devtools-report-key>${i18nString(UIStrings.detailsFailureReason)}</devtools-report-key>
        <devtools-report-value>
          ${failureDescription}
        </devtools-report-value>
    `;
    };
    const targetHint = () => {
        assertNotNullOrUndefined(input.data);
        const attempt = input.data.pipeline.getOriginallyTriggered();
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
    };
    const formSubmission = () => {
        assertNotNullOrUndefined(input.data);
        const attempt = input.data.pipeline.getOriginallyTriggered();
        const hasFormSubmission = attempt.key.formSubmission !== undefined;
        if (!hasFormSubmission || !isPrerenderLike(attempt.action)) {
            return Lit.nothing;
        }
        return html `
        <devtools-report-key>${i18nString(UIStrings.detailsFormSubmission)}</devtools-report-key>
        <devtools-report-value>
          ${attempt.key.formSubmission ? i18nString(UIStrings.yes) : i18nString(UIStrings.no)}
        </devtools-report-value>
    `;
    };
    const maybePrerenderFailureReason = () => {
        assertNotNullOrUndefined(input.data);
        const attempt = input.data.pipeline.getOriginallyTriggered();
        if (!isPrerenderLike(attempt.action)) {
            return Lit.nothing;
        }
        // Lookup status code from the network log for NavigationBadHttpStatus.
        const statusCode = PreloadingHelper.PreloadingForward.preloadStatusCode(attempt);
        const failureReason = prerenderFailureReason(attempt, statusCode);
        if (failureReason === null) {
            return Lit.nothing;
        }
        return html `
        <devtools-report-key>${i18nString(UIStrings.detailsFailureReason)}</devtools-report-key>
        <devtools-report-value>
          ${failureReason}
        </devtools-report-value>
    `;
    };
    const renderRuleSet = (ruleSet, pageURL) => {
        const revealRuleSetView = () => {
            void Common.Revealer.reveal(new PreloadingHelper.PreloadingForward.RuleSetView(ruleSet.id));
        };
        const location = ruleSetLocationShort(ruleSet, pageURL);
        return html `
      <devtools-report-key>${i18nString(UIStrings.detailsRuleSet)}</devtools-report-key>
      <devtools-report-value>
        <div class="text-ellipsis" title="">
          <button class="link" role="link"
            @click=${revealRuleSetView}
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
    };
    // clang-format off
    Lit.render(html `
    <style>${preloadingDetailsReportViewStyles}</style>
    <style>${UI.inspectorCommonStyles}</style>
    <devtools-report
      .data=${{ reportTitle: 'Speculative Loading Attempt' }}
      jslog=${VisualLogging.section('preloading-details')}>
      <devtools-report-section-header>${i18nString(UIStrings.detailsDetailedInformation)}</devtools-report-section-header>

      ${url()}
      ${action(isFallbackToPrefetch)}
      ${status(isFallbackToPrefetch)}
      ${targetHint()}
      ${formSubmission()}
      ${maybePrefetchFailureReason()}
      ${maybePrerenderFailureReason()}

      ${input.data.ruleSets.map(ruleSet => renderRuleSet(ruleSet, pageURL))}
    </devtools-report>
  `, target);
    // clang-format on
};
export class PreloadingDetailsReportView extends UI.Widget.VBox {
    #data = null;
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    set data(data) {
        this.#data = data;
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    performUpdate() {
        const viewInput = {
            data: this.#data,
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
}
//# sourceMappingURL=PreloadingDetailsReportView.js.map
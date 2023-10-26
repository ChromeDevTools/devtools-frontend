// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Platform from '../../../../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import * as Logs from '../../../../models/logs/logs.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as Coordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../../ui/components/report_view/report_view.js';
import * as RequestLinkIcon from '../../../../ui/components/request_link_icon/request_link_icon.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import * as PreloadingHelper from '../helper/helper.js';

import preloadingDetailsReportViewStyles from './preloadingDetailsReportView.css.js';
import * as PreloadingString from './PreloadingString.js';
import {prefetchFailureReason, prerenderFailureReason, ruleSetLocationShort} from './PreloadingString.js';

const UIStrings = {
  /**
   *@description Text in PreloadingDetailsReportView of the Application panel
   */
  selectAnElementForMoreDetails: 'Select an element for more details',
  /**
   *@description Text in details
   */
  detailsDetailedInformation: 'Detailed information',
  /**
   *@description Text in details
   */
  detailsAction: 'Action',
  /**
   *@description Text in details
   */
  detailsStatus: 'Status',
  /**
   *@description Text in details
   */
  detailsFailureReason: 'Failure reason',
  /**
   *@description Header of rule set
   */
  detailsRuleSet: 'Rule set',
  /**
   *@description Description: status
   */
  detailedStatusNotTriggered: 'Speculative load attempt is not yet triggered.',
  /**
   *@description Description: status
   */
  detailedStatusPending: 'Speculative load attempt is eligible but pending.',
  /**
   *@description Description: status
   */
  detailedStatusRunning: 'Speculative load is running.',
  /**
   *@description Description: status
   */
  detailedStatusReady: 'Speculative load finished and the result is ready for the next navigation.',
  /**
   *@description Description: status
   */
  detailedStatusSuccess: 'Speculative load finished and used for a navigation.',
  /**
   *@description Description: status
   */
  detailedStatusFailure: 'Speculative load failed.',
  /**
   *@description button: Contents of button to inspect prerendered page
   */
  buttonInspect: 'Inspect',
  /**
   *@description button: Title of button to inspect prerendered page
   */
  buttonClickToInspect: 'Click to inspect prerendered page',
  /**
   *@description button: Title of button to reveal rule set
   */
  buttonClickToRevealRuleSet: 'Click to reveal rule set',
};
const str_ =
    i18n.i18n.registerUIStrings('panels/application/preloading/components/PreloadingDetailsReportView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

class PreloadingUIUtils {
  static detailedStatus({status}: SDK.PreloadingModel.PreloadingAttempt): string {
    // See content/public/browser/preloading.h PreloadingAttemptOutcome.
    switch (status) {
      case SDK.PreloadingModel.PreloadingStatus.NotTriggered:
        return i18nString(UIStrings.detailedStatusNotTriggered);
      case SDK.PreloadingModel.PreloadingStatus.Pending:
        return i18nString(UIStrings.detailedStatusPending);
      case SDK.PreloadingModel.PreloadingStatus.Running:
        return i18nString(UIStrings.detailedStatusRunning);
      case SDK.PreloadingModel.PreloadingStatus.Ready:
        return i18nString(UIStrings.detailedStatusReady);
      case SDK.PreloadingModel.PreloadingStatus.Success:
        return i18nString(UIStrings.detailedStatusSuccess);
      case SDK.PreloadingModel.PreloadingStatus.Failure:
        return i18nString(UIStrings.detailedStatusFailure);
      // NotSupported is used to handle unreachable case. For example,
      // there is no code path for
      // PreloadingTriggeringOutcome::kTriggeredButPending in prefetch,
      // which is mapped to NotSupported. So, we regard it as an
      // internal error.
      case SDK.PreloadingModel.PreloadingStatus.NotSupported:
        return i18n.i18n.lockedString('Internal error');
    }
  }
}

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

export type PreloadingDetailsReportViewData = PreloadingDetailsReportViewDataInternal|null;
interface PreloadingDetailsReportViewDataInternal {
  preloadingAttempt: SDK.PreloadingModel.PreloadingAttempt;
  ruleSets: Protocol.Preload.RuleSet[];
  pageURL: Platform.DevToolsPath.UrlString;
  requestResolver?: Logs.RequestResolver.RequestResolver;
}

export class PreloadingDetailsReportView extends LegacyWrapper.LegacyWrapper.WrappableComponent<UI.Widget.VBox> {
  static readonly litTagName = LitHtml.literal`devtools-resources-preloading-details-report-view`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  #data: PreloadingDetailsReportViewData = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [preloadingDetailsReportViewStyles];
  }

  set data(data: PreloadingDetailsReportViewData) {
    this.#data = data;
    void this.#render();
  }

  async #render(): Promise<void> {
    await coordinator.write('PreloadingDetailsReportView render', () => {
      if (this.#data === null) {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        LitHtml.render(LitHtml.html`
          <div class="preloading-noselected">
            <div>
              <p>${i18nString(UIStrings.selectAnElementForMoreDetails)}</p>
            </div>
          </div>
        `, this.#shadow, {host: this});
        // clang-format on
        return;
      }

      const detailedStatus = PreloadingUIUtils.detailedStatus(this.#data.preloadingAttempt);
      const pageURL = this.#data.pageURL;

      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      LitHtml.render(LitHtml.html`
        <${ReportView.ReportView.Report.litTagName} .data=${{reportTitle: 'Speculative Loading Attempt'} as ReportView.ReportView.ReportData}>
          <${ReportView.ReportView.ReportSectionHeader.litTagName}>${i18nString(UIStrings.detailsDetailedInformation)}</${
            ReportView.ReportView.ReportSectionHeader.litTagName}>

          ${this.#url()}
          ${this.#action()}

          <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.detailsStatus)}</${
            ReportView.ReportView.ReportKey.litTagName}>
          <${ReportView.ReportView.ReportValue.litTagName}>
            ${detailedStatus}
          </${ReportView.ReportView.ReportValue.litTagName}>

          ${this.#maybePrefetchFailureReason()}
          ${this.#maybePrerenderFailureReason()}

          ${this.#data.ruleSets.map(ruleSet => this.#renderRuleSet(ruleSet, pageURL))}
        </${ReportView.ReportView.Report.litTagName}>
      `, this.#shadow, {host: this});
      // clang-format on
    });
  }

  #url(): LitHtml.LitTemplate {
    assertNotNullOrUndefined(this.#data);
    const attempt = this.#data.preloadingAttempt;

    let value;
    if (attempt.action === Protocol.Preload.SpeculationAction.Prefetch && attempt.requestId !== undefined) {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      value = LitHtml.html`
          <${RequestLinkIcon.RequestLinkIcon.RequestLinkIcon.litTagName}
            .data=${
              {
                affectedRequest: {
                  requestId: attempt.requestId,
                  url: attempt.key.url,
                },
                requestResolver: this.#data.requestResolver || new Logs.RequestResolver.RequestResolver(),
                displayURL: true,
                urlToDisplay: attempt.key.url,
              } as RequestLinkIcon.RequestLinkIcon.RequestLinkIconData
            }
          >
          </${RequestLinkIcon.RequestLinkIcon.RequestLinkIcon.litTagName}>
      `;
    } else {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      value = LitHtml.html`
          <div class="text-ellipsis" title=${attempt.key.url}>${attempt.key.url}</div>
      `;
      // clang-format on
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
        <${ReportView.ReportView.ReportKey.litTagName}>${i18n.i18n.lockedString('URL')}</${
          ReportView.ReportView.ReportKey.litTagName}>
        <${ReportView.ReportView.ReportValue.litTagName}>
          ${value}
        </${ReportView.ReportView.ReportValue.litTagName}>
    `;
    // clang-format on
  }

  #action(): LitHtml.LitTemplate {
    assertNotNullOrUndefined(this.#data);
    const attempt = this.#data.preloadingAttempt;

    const action = PreloadingString.capitalizedAction(this.#data.preloadingAttempt.action);

    let maybeInspectButton: LitHtml.LitTemplate = LitHtml.nothing;
    ((): void => {
      if (attempt.action !== Protocol.Preload.SpeculationAction.Prerender) {
        return;
      }

      const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      if (target === null) {
        return;
      }

      const prerenderTarget = SDK.TargetManager.TargetManager.instance().targets().find(
          child => child.targetInfo()?.subtype === 'prerender' && child.inspectedURL() === attempt.key.url);

      const disabled = (prerenderTarget === undefined);
      const inspect = (): void => {
        if (prerenderTarget === undefined) {
          return;
        }
        UI.Context.Context.instance().setFlavor(SDK.Target.Target, prerenderTarget);
      };
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      maybeInspectButton = LitHtml.html`
          <${Buttons.Button.Button.litTagName}
            @click=${inspect}
            .title=${i18nString(UIStrings.buttonClickToInspect)}
            .size=${Buttons.Button.Size.SMALL}
            .variant=${Buttons.Button.Variant.SECONDARY}
            .disabled=${disabled}
          >
            ${i18nString(UIStrings.buttonInspect)}
          </${Buttons.Button.Button.litTagName}>
      `;
      // clang-format on
    })();

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
        <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.detailsAction)}</${
          ReportView.ReportView.ReportKey.litTagName}>
        <${ReportView.ReportView.ReportValue.litTagName}>
          <div class="text-ellipsis" title="">
            ${action}
            ${maybeInspectButton}
          </div>
        </${ReportView.ReportView.ReportValue.litTagName}>
    `;
    // clang-format on
  }

  #maybePrefetchFailureReason(): LitHtml.LitTemplate {
    assertNotNullOrUndefined(this.#data);
    const attempt = this.#data.preloadingAttempt;

    if (attempt.action !== Protocol.Preload.SpeculationAction.Prefetch) {
      return LitHtml.nothing;
    }

    const failureDescription = prefetchFailureReason(attempt);
    if (failureDescription === null) {
      return LitHtml.nothing;
    }

    return LitHtml.html`
        <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.detailsFailureReason)}</${
        ReportView.ReportView.ReportKey.litTagName}>
        <${ReportView.ReportView.ReportValue.litTagName}>
          ${failureDescription}
        </${ReportView.ReportView.ReportValue.litTagName}>
    `;
  }

  #maybePrerenderFailureReason(): LitHtml.LitTemplate {
    assertNotNullOrUndefined(this.#data);
    const attempt = this.#data.preloadingAttempt;

    if (attempt.action !== Protocol.Preload.SpeculationAction.Prerender) {
      return LitHtml.nothing;
    }

    const failureReason = prerenderFailureReason(attempt);
    if (failureReason === null) {
      return LitHtml.nothing;
    }

    return LitHtml.html`
        <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.detailsFailureReason)}</${
        ReportView.ReportView.ReportKey.litTagName}>
        <${ReportView.ReportView.ReportValue.litTagName}>
          ${failureReason}
        </${ReportView.ReportView.ReportValue.litTagName}>
    `;
  }

  #renderRuleSet(ruleSet: Protocol.Preload.RuleSet, pageURL: Platform.DevToolsPath.UrlString): LitHtml.LitTemplate {
    const revealRuleSetView = (): void => {
      void Common.Revealer.reveal(new PreloadingHelper.PreloadingForward.RuleSetView(ruleSet.id));
    };
    const location = ruleSetLocationShort(ruleSet, pageURL);

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
      <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.detailsRuleSet)}</${
        ReportView.ReportView.ReportKey.litTagName}>
      <${ReportView.ReportView.ReportValue.litTagName}>
        <div class="text-ellipsis" title="">
          <button class="link" role="link"
            @click=${revealRuleSetView}
            title=${i18nString(UIStrings.buttonClickToRevealRuleSet)}
            style=${LitHtml.Directives.styleMap({
              color: 'var(--sys-color-primary)',
              'text-decoration': 'underline',
            })}
          >
            ${location}
          </button>
        </div>
      </${ReportView.ReportView.ReportValue.litTagName}>
    `;
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent(
    'devtools-resources-preloading-details-report-view', PreloadingDetailsReportView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-resources-preloading-details-report-view': PreloadingDetailsReportView;
  }
}

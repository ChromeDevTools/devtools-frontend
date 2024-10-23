// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/components/report_view/report_view.js';
import '../../../../ui/components/request_link_icon/request_link_icon.js';

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Platform from '../../../../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import * as Logs from '../../../../models/logs/logs.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as Coordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import * as PreloadingHelper from '../helper/helper.js';

import preloadingDetailsReportViewStyles from './preloadingDetailsReportView.css.js';
import * as PreloadingString from './PreloadingString.js';
import {prefetchFailureReason, prerenderFailureReason, ruleSetLocationShort} from './PreloadingString.js';

const {html} = LitHtml;

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
      case SDK.PreloadingModel.PreloadingStatus.NOT_TRIGGERED:
        return i18nString(UIStrings.detailedStatusNotTriggered);
      case SDK.PreloadingModel.PreloadingStatus.PENDING:
        return i18nString(UIStrings.detailedStatusPending);
      case SDK.PreloadingModel.PreloadingStatus.RUNNING:
        return i18nString(UIStrings.detailedStatusRunning);
      case SDK.PreloadingModel.PreloadingStatus.READY:
        return i18nString(UIStrings.detailedStatusReady);
      case SDK.PreloadingModel.PreloadingStatus.SUCCESS:
        return i18nString(UIStrings.detailedStatusSuccess);
      case SDK.PreloadingModel.PreloadingStatus.FAILURE:
        return i18nString(UIStrings.detailedStatusFailure);
      // NotSupported is used to handle unreachable case. For example,
      // there is no code path for
      // PreloadingTriggeringOutcome::kTriggeredButPending in prefetch,
      // which is mapped to NotSupported. So, we regard it as an
      // internal error.
      case SDK.PreloadingModel.PreloadingStatus.NOT_SUPPORTED:
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
        LitHtml.render(html`
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
      LitHtml.render(html`
        <devtools-report .data=${{reportTitle: 'Speculative Loading Attempt'}}
        jslog=${VisualLogging.section('preloading-details')}>
          <devtools-report-section-header>${i18nString(UIStrings.detailsDetailedInformation)}</devtools-report-section-header>

          ${this.#url()}
          ${this.#action()}

          <devtools-report-key>${i18nString(UIStrings.detailsStatus)}</devtools-report-key>
          <devtools-report-value>
            ${detailedStatus}
          </devtools-report-value>

          ${this.#maybePrefetchFailureReason()}
          ${this.#maybePrerenderFailureReason()}

          ${this.#data.ruleSets.map(ruleSet => this.#renderRuleSet(ruleSet, pageURL))}
        </devtools-report>
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
      value = html`
          <devtools-request-link-icon
            .data=${
              {
                affectedRequest: {
                  requestId: attempt.requestId,
                  url: attempt.key.url,
                },
                requestResolver: this.#data.requestResolver || new Logs.RequestResolver.RequestResolver(),
                displayURL: true,
                urlToDisplay: attempt.key.url,
              }
            }
          >
          </devtools-request-link-icon>
      `;
    } else {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      value = html`
          <div class="text-ellipsis" title=${attempt.key.url}>${attempt.key.url}</div>
      `;
      // clang-format on
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
        <devtools-report-key>${i18n.i18n.lockedString('URL')}</devtools-report-key>
        <devtools-report-value>
          ${value}
        </devtools-report-value>
    `;
    // clang-format on
  }

  #action(): LitHtml.LitTemplate {
    assertNotNullOrUndefined(this.#data);
    const attempt = this.#data.preloadingAttempt;

    const action = PreloadingString.capitalizedAction(this.#data.preloadingAttempt.action);

    let maybeInspectButton: LitHtml.LitTemplate = LitHtml.nothing;
    (() => {
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
      maybeInspectButton = html`
          <devtools-button
            @click=${inspect}
            .title=${i18nString(UIStrings.buttonClickToInspect)}
            .size=${Buttons.Button.Size.SMALL}
            .variant=${Buttons.Button.Variant.OUTLINED}
            .disabled=${disabled}
            jslog=${VisualLogging.action('inspect-prerendered-page').track({click: true})}
          >
            ${i18nString(UIStrings.buttonInspect)}
          </devtools-button>
      `;
      // clang-format on
    })();

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
        <devtools-report-key>${i18nString(UIStrings.detailsAction)}</devtools-report-key>
        <devtools-report-value>
          <div class="text-ellipsis" title="">
            ${action}
            ${maybeInspectButton}
          </div>
        </devtools-report-value>
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

    return html`
        <devtools-report-key>${i18nString(UIStrings.detailsFailureReason)}</devtools-report-key>
        <devtools-report-value>
          ${failureDescription}
        </devtools-report-value>
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

    return html`
        <devtools-report-key>${i18nString(UIStrings.detailsFailureReason)}</devtools-report-key>
        <devtools-report-value>
          ${failureReason}
        </devtools-report-value>
    `;
  }

  #renderRuleSet(ruleSet: Protocol.Preload.RuleSet, pageURL: Platform.DevToolsPath.UrlString): LitHtml.LitTemplate {
    const revealRuleSetView = (): void => {
      void Common.Revealer.reveal(new PreloadingHelper.PreloadingForward.RuleSetView(ruleSet.id));
    };
    const location = ruleSetLocationShort(ruleSet, pageURL);

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <devtools-report-key>${i18nString(UIStrings.detailsRuleSet)}</devtools-report-key>
      <devtools-report-value>
        <div class="text-ellipsis" title="">
          <button class="link" role="link"
            @click=${revealRuleSetView}
            title=${i18nString(UIStrings.buttonClickToRevealRuleSet)}
            style=${LitHtml.Directives.styleMap({
              color: 'var(--sys-color-primary)',
              'text-decoration': 'underline',
            })}
            jslog=${VisualLogging.action('reveal-rule-set').track({click: true})}
          >
            ${location}
          </button>
        </div>
      </devtools-report-value>
    `;
    // clang-format on
  }
}

customElements.define('devtools-resources-preloading-details-report-view', PreloadingDetailsReportView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-preloading-details-report-view': PreloadingDetailsReportView;
  }
}

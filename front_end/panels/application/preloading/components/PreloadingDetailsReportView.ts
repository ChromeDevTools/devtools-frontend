// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as Coordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../../ui/components/report_view/report_view.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';

import preloadingDetailsReportViewStyles from './preloadingDetailsReportView.css.js';

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
   *@description Header of rule set
   */
  detailsRuleSet: 'Rule set',
  /**
   *@description Description: status
   */
  detailedStatusNotTriggered: 'Preloading attempt is not yet triggered.',
  /**
   *@description Description: status
   */
  detailedStatusPending: 'Preloading attempt is eligible but pending.',
  /**
   *@description Description: status
   */
  detailedStatusRunning: 'Preloading is running.',
  /**
   *@description Description: status
   */
  detailedStatusReady: 'Preloading finished and the result is ready for the next navigation.',
  /**
   *@description Description: status
   */
  detailedStatusSuccess: 'Preloading finished and used for a navigation.',
  /**
   *@description Description: status
   */
  detailedStatusFailure: 'Preloading failed.',
};
const str_ =
    i18n.i18n.registerUIStrings('panels/application/preloading/components/PreloadingDetailsReportView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

class PreloadingUIUtils {
  static action({key}: SDK.PreloadingModel.PreloadingAttempt): string {
    // Use "prefetch"/"prerender" as is in SpeculationRules.
    switch (key.action) {
      case Protocol.Preload.SpeculationAction.Prefetch:
        return i18n.i18n.lockedString('prefetch');
      case Protocol.Preload.SpeculationAction.Prerender:
        return i18n.i18n.lockedString('prerender');
    }
  }

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
}

export class PreloadingDetailsReportView extends HTMLElement {
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

      const action = PreloadingUIUtils.action(this.#data.preloadingAttempt);
      const detailedStatus = PreloadingUIUtils.detailedStatus(this.#data.preloadingAttempt);

      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      LitHtml.render(LitHtml.html`
        <${ReportView.ReportView.Report.litTagName} .data=${{reportTitle: 'Preloading Attempt'} as ReportView.ReportView.ReportData}>
          <${ReportView.ReportView.ReportSectionHeader.litTagName}>${i18nString(UIStrings.detailsDetailedInformation)}</${
            ReportView.ReportView.ReportSectionHeader.litTagName}>

          <${ReportView.ReportView.ReportKey.litTagName}>${i18n.i18n.lockedString('URL')}</${
            ReportView.ReportView.ReportKey.litTagName}>
          <${ReportView.ReportView.ReportValue.litTagName}>
            <div class="text-ellipsis" title=${this.#data.preloadingAttempt.key.url}>${this.#data.preloadingAttempt.key.url}</div>
          </${ReportView.ReportView.ReportValue.litTagName}>

          <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.detailsAction)}</${
            ReportView.ReportView.ReportKey.litTagName}>
          <${ReportView.ReportView.ReportValue.litTagName}>
            <div class="text-ellipsis" title="">
              ${action}
            </div>
          </${ReportView.ReportView.ReportValue.litTagName}>

          <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.detailsStatus)}</${
            ReportView.ReportView.ReportKey.litTagName}>
          <${ReportView.ReportView.ReportValue.litTagName}>
            ${detailedStatus}
          </${ReportView.ReportView.ReportValue.litTagName}>

${this.#data.ruleSets.map(ruleSet => this.#renderRuleSet(ruleSet))}
          }
        </${ReportView.ReportView.Report.litTagName}>
      `, this.#shadow, {host: this});
      // clang-format on
    });
  }

  #renderRuleSet(ruleSet: Protocol.Preload.RuleSet): LitHtml.LitTemplate {
    // We can assume `sourceText` is a valid JSON because this triggered the preloading attempt.
    const json = JSON.stringify(JSON.parse(ruleSet.sourceText));

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
          <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.detailsRuleSet)}</${
            ReportView.ReportView.ReportKey.litTagName}>
          <${ReportView.ReportView.ReportValue.litTagName}>
            <div class="text-ellipsis" title="">
              ${json}
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

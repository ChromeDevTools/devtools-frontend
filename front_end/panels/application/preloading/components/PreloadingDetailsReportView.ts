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
      case SDK.PreloadingModel.SpeculationAction.Prefetch:
        return i18n.i18n.lockedString('prefetch');
      case SDK.PreloadingModel.SpeculationAction.Prerender:
        return i18n.i18n.lockedString('prerender');
    }
  }

  static detailedStatus({status}: SDK.PreloadingModel.PreloadingAttempt): string {
    // See content/public/browser/preloading.h PreloadingAttemptOutcome.
    switch (status) {
      case Protocol.Preload.PreloadingStatus.Pending:
        return i18nString(UIStrings.detailedStatusPending);
      case Protocol.Preload.PreloadingStatus.Running:
        return i18nString(UIStrings.detailedStatusRunning);
      case Protocol.Preload.PreloadingStatus.Ready:
        return i18nString(UIStrings.detailedStatusReady);
      case Protocol.Preload.PreloadingStatus.Success:
        return i18nString(UIStrings.detailedStatusSuccess);
      case Protocol.Preload.PreloadingStatus.Failure:
        return i18nString(UIStrings.detailedStatusFailure);
      // NotSupported is used to handle unreachable case. For example,
      // there is no code path for
      // PreloadingTriggeringOutcome::kTriggeredButPending in prefetch,
      // which is mapped to NotSupported. So, we regard it as an
      // internal error.
      case Protocol.Preload.PreloadingStatus.NotSupported:
        return i18n.i18n.lockedString('Internal error');
    }
  }
}

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

export type PreloadingDetailsReportViewData = SDK.PreloadingModel.PreloadingAttempt|null;

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

      const action = PreloadingUIUtils.action(this.#data);
      const detailedStatus = PreloadingUIUtils.detailedStatus(this.#data);

      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      LitHtml.render(LitHtml.html`
        <${ReportView.ReportView.Report.litTagName} .data=${{reportTitle: 'Preloading Attempt'} as ReportView.ReportView.ReportData}>
          <${ReportView.ReportView.ReportSectionHeader.litTagName}>${i18nString(UIStrings.detailsDetailedInformation)}</${
            ReportView.ReportView.ReportSectionHeader.litTagName}>

          <${ReportView.ReportView.ReportKey.litTagName}>${i18n.i18n.lockedString('URL')}</${
            ReportView.ReportView.ReportKey.litTagName}>
          <${ReportView.ReportView.ReportValue.litTagName}>
            <div class="text-ellipsis" title=${this.#data.key.url}>${this.#data.key.url}</div>
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
        </${ReportView.ReportView.Report.litTagName}>
      `, this.#shadow, {host: this});
      // clang-format on
    });
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

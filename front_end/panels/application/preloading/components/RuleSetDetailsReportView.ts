// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Protocol from '../../../../generated/protocol.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as Coordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../../ui/components/report_view/report_view.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';

type RuleSet = Protocol.Preload.RuleSet;

const UIStrings = {
  /**
   *@description Section header: detailed information of SpeculationRules rule set
   */
  detailsDetailedInformation: 'Detailed information',
  /**
   *@description Description term: validity of rule set
   */
  detailsValidity: 'Validity',
  /**
   *@description Description term: error detail of rule set
   */
  detailsError: 'Error',
  /**
   *@description Description term: source text of rule set
   */
  detailsSource: 'Source',
  /**
   *@description Validity: Rule set is valid
   */
  validityValid: 'Valid',
  /**
   *@description validity: Rule set must be a valid JSON object
   */
  validityInvalid: 'Invalid; source is not a JSON object',
  /**
   *@description validity: Rule set contains invalid rules and they are ignored
   */
  validitySomeRulesInvalid: 'Some rules are invalid and ignored',
};
const str_ =
    i18n.i18n.registerUIStrings('panels/application/preloading/components/RuleSetDetailsReportView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

class PreloadingUIUtils {
  // Summary of error of rule set.
  static validity({errorType}: Protocol.Preload.RuleSet): string {
    switch (errorType) {
      case undefined:
        return i18nString(UIStrings.validityValid);
      case Protocol.Preload.RuleSetErrorType.SourceIsNotJsonObject:
        return i18nString(UIStrings.validityInvalid);
      case Protocol.Preload.RuleSetErrorType.InvalidRulesSkipped:
        return i18nString(UIStrings.validitySomeRulesInvalid);
    }
  }
}

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

export type RuleSetDetailsReportViewData = RuleSet|null;

export class RuleSetDetailsReportView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-resources-rulesets-details-report-view`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  #data: RuleSetDetailsReportViewData = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [];
  }

  set data(data: RuleSetDetailsReportViewData) {
    this.#data = data;
    void this.#render();
  }

  async #render(): Promise<void> {
    await coordinator.write('RuleSetDetailsReportView render', () => {
      if (this.#data === null) {
        LitHtml.render(LitHtml.nothing, this.#shadow, {host: this});
        return;
      }

      const validity = PreloadingUIUtils.validity(this.#data);
      // TODO(https://crbug.com/1425354): Support i18n.
      const error = this.#data.errorMessage || '';

      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      LitHtml.render(LitHtml.html`
        <${ReportView.ReportView.Report.litTagName} .data=${{reportTitle: 'SpeculationRules rule set'} as ReportView.ReportView.ReportData}>
          <${ReportView.ReportView.ReportSectionHeader.litTagName}>${i18nString(UIStrings.detailsDetailedInformation)}</${
            ReportView.ReportView.ReportSectionHeader.litTagName}>

          <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.detailsValidity)}</${
            ReportView.ReportView.ReportKey.litTagName}>
          <${ReportView.ReportView.ReportValue.litTagName}>
            <div class="text-ellipsis" title="">
              ${validity}
            </div>
          </${ReportView.ReportView.ReportValue.litTagName}>

          <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.detailsError)}</${
            ReportView.ReportView.ReportKey.litTagName}>
          <${ReportView.ReportView.ReportValue.litTagName}>
            <div class="text-ellipsis" title="">
              ${error}
            </div>
          </${ReportView.ReportView.ReportValue.litTagName}>

          ${this.#source(this.#data.sourceText)}
        </${ReportView.ReportView.Report.litTagName}>
      `, this.#shadow, {host: this});
      // clang-format on
    });
  }

  #source(sourceText: string): LitHtml.LitTemplate {
    let sourceJson;
    try {
      sourceJson = JSON.parse(sourceText);
    } catch (_) {
    }

    if (sourceJson === undefined) {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      return LitHtml.html`
          <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.detailsSource)}</${
            ReportView.ReportView.ReportKey.litTagName}>
          <${ReportView.ReportView.ReportValue.litTagName}>
            <div class="text-ellipsis" title="">
              ${sourceText}
            </div>
          </${ReportView.ReportView.ReportValue.litTagName}>
      `;
      // clang-format on
    }

    // TODO(https://crbug.com/1384419): Consider to add another pane and use SourceFrame.JSONView.JSONView.
    const json = JSON.stringify(sourceJson);

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
      return LitHtml.html`
          <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.detailsSource)}</${
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
    'devtools-resources-rulesets-details-report-view', RuleSetDetailsReportView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-resources-rulesets-details-report-view': RuleSetDetailsReportView;
  }
}

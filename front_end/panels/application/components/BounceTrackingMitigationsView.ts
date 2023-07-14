// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ChromeLink from '../../../ui/components/chrome_link/chrome_link.js';
import * as DataGrid from '../../../ui/components/data_grid/data_grid.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as ReportView from '../../../ui/components/report_view/report_view.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import bounceTrackingMitigationsViewStyles from './bounceTrackingMitigationsView.css.js';

const UIStrings = {
  /**
   * @description Title text in bounce tracking mitigations view of the Application panel.
   */
  bounceTrackingMitigationsTitle: 'Bounce tracking mitigations',
  /**
   * @description Label for the button to force bounce tracking mitigations to run.
   */
  forceRun: 'Force run',
  /**
   * @description Label for the disabled button while bounce tracking mitigations are running
   */
  runningMitigations: 'Running',
  /**
   * @description Heading of table which displays sites whose state was deleted by bounce tracking mitigations.
   */
  stateDeletedFor: 'State was deleted for the following sites:',
  /**
   * @description Text shown once the deletion command has been sent to the browser process.
   */
  checkingPotentialTrackers: 'Checking for potential bounce tracking sites.',
  /**
   * @description Link text about explanation of Bounce Tracking Mitigations.
   */
  learnMore: 'Learn more: Bounce Tracking Mitigations',
  /**
   * @description Text shown when bounce tracking mitigations have been forced to run and
   * identified no potential bounce tracking sites to delete state for. This may also
   * indicate that bounce tracking mitigations are disabled or third-party cookies aren't being blocked.
   */
  noPotentialBounceTrackersIdentified:
      'State was not cleared for any potential bounce tracking sites. Either none were identified or third-party cookies are not blocked.',
  /**
   * @description Text shown when bounce tracking mitigations bounce tracking mitigations are disabled. Has a link.
   * @example {Bounce Tracking Mitigations Feature Flag} PH1
   */
  featureDisabled:
      'Bounce tracking mitigations are disabled. To enable them, set the flag at {PH1} to "Enabled With Deletion".',
  /**
   * @description Text for link to Bounce Tracking Mitigations feature flag entry in the chrome://flags page.
   */
  featureFlag: 'Bounce Tracking Mitigations Feature Flag',
};

const str_ = i18n.i18n.registerUIStrings('panels/application/components/BounceTrackingMitigationsView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const enum ScreenStatusType {
  Running = 'Running',
  Result = 'Result',
  Disabled = 'Disabled',
}

export interface BounceTrackingMitigationsViewData {
  trackingSites: string[];
}

export class BounceTrackingMitigationsView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  static readonly litTagName = LitHtml.literal`devtools-bounce-tracking-mitigations-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #trackingSites: string[] = [];
  #screenStatus = ScreenStatusType.Result;
  #checkedFeature = false;
  #seenButtonClick = false;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [bounceTrackingMitigationsViewStyles];
    void this.#render();
  }

  async #render(): Promise<void> {
    // clang-format off
    LitHtml.render(LitHtml.html`
      <${ReportView.ReportView.Report.litTagName} .data=${
          {reportTitle: i18nString(UIStrings.bounceTrackingMitigationsTitle)} as ReportView.ReportView.ReportData
      }>
        ${await this.#renderMainFrameInformation()}
      </${ReportView.ReportView.Report.litTagName}>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  async #renderMainFrameInformation(): Promise<LitHtml.TemplateResult> {
    if (!this.#checkedFeature) {
      await this.#checkFeatureState();
    }

    if (this.#screenStatus === ScreenStatusType.Disabled) {
      const mitigationsFlagLink = new ChromeLink.ChromeLink.ChromeLink();
      mitigationsFlagLink.href = 'chrome://flags/#bounce-tracking-mitigations';
      mitigationsFlagLink.textContent = i18nString(UIStrings.featureFlag);

      // clang-format off
      return LitHtml.html`
        <${ReportView.ReportView.ReportSection.litTagName}>
          ${i18n.i18n.getFormatLocalizedString(
              str_, UIStrings.featureDisabled,
              {PH1: mitigationsFlagLink})}
        </${ReportView.ReportView.ReportSection.litTagName}>
      `;
      // clang-format on
    }

    // clang-format off
    return LitHtml.html`
      <${ReportView.ReportView.ReportSection.litTagName}>
        ${this.#renderForceRunButton()}
      </${ReportView.ReportView.ReportSection.litTagName}>
        ${this.#renderDeletedSitesOrNoSitesMessage()}
      <${ReportView.ReportView.ReportSectionDivider.litTagName}>
      </${ReportView.ReportView.ReportSectionDivider.litTagName}>
      <${ReportView.ReportView.ReportSection.litTagName}>
        <x-link href="https://privacycg.github.io/nav-tracking-mitigations/#bounce-tracking-mitigations" class="link">
          ${i18nString(UIStrings.learnMore)}
        </x-link>
      </${ReportView.ReportView.ReportSection.litTagName}>
    `;
    // clang-format on
  }

  #renderForceRunButton(): LitHtml.TemplateResult {
    const isMitigationRunning = (this.#screenStatus === ScreenStatusType.Running);

    // clang-format off
    return LitHtml.html`
      <${Buttons.Button.Button.litTagName}
        aria-label=${i18nString(UIStrings.forceRun)}
        .disabled=${isMitigationRunning}
        .spinner=${isMitigationRunning}
        .variant=${Buttons.Button.Variant.PRIMARY}
        @click=${this.#runMitigations}>
        ${isMitigationRunning ? LitHtml.html`
          ${i18nString(UIStrings.runningMitigations)}`:`
          ${i18nString(UIStrings.forceRun)}
        `}
      </${Buttons.Button.Button.litTagName}>
    `;
    // clang-format on
  }

  #renderDeletedSitesOrNoSitesMessage(): LitHtml.TemplateResult {
    if (!this.#seenButtonClick) {
      return LitHtml.html``;
    }

    if (this.#trackingSites.length === 0) {
      // clang-format off
      return LitHtml.html`
        <${ReportView.ReportView.ReportSection.litTagName}>
        ${(this.#screenStatus === ScreenStatusType.Running) ? LitHtml.html`
          ${i18nString(UIStrings.checkingPotentialTrackers)}`:`
          ${i18nString(UIStrings.noPotentialBounceTrackersIdentified)}
        `}
        </${ReportView.ReportView.ReportSection.litTagName}>
      `;
      // clang-format on
    }

    const gridData: DataGrid.DataGridController.DataGridControllerData = {
      columns: [
        {
          id: 'sites',
          title: i18nString(UIStrings.stateDeletedFor),
          widthWeighting: 10,
          hideable: false,
          visible: true,
          sortable: true,
        },
      ],
      rows: this.#buildRowsFromDeletedSites(),
      initialSort: {
        columnId: 'sites',
        direction: DataGrid.DataGridUtils.SortDirection.ASC,
      },
    };

    // clang-format off
    return LitHtml.html`
      <${ReportView.ReportView.ReportSection.litTagName}>
        <${DataGrid.DataGridController.DataGridController.litTagName} .data=${
            gridData as DataGrid.DataGridController.DataGridControllerData}>
        </${DataGrid.DataGridController.DataGridController.litTagName}>
      </${ReportView.ReportView.ReportSection.litTagName}>
    `;
    // clang-format on
  }

  async #runMitigations(): Promise<void> {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }

    this.#seenButtonClick = true;
    this.#screenStatus = ScreenStatusType.Running;

    void this.#render();

    const response = await mainTarget.storageAgent().invoke_runBounceTrackingMitigations();
    this.#trackingSites = [];
    response.deletedSites.forEach(element => {
      this.#trackingSites.push(element);
    });

    this.#renderMitigationsResult();
  }

  #renderMitigationsResult(): void {
    this.#screenStatus = ScreenStatusType.Result;
    void this.#render();
  }

  #buildRowsFromDeletedSites(): DataGrid.DataGridUtils.Row[] {
    const trackingSites = this.#trackingSites;
    return trackingSites.map(site => ({
                               cells: [
                                 {columnId: 'sites', value: site},
                               ],
                             }));
  }

  async #checkFeatureState(): Promise<void> {
    this.#checkedFeature = true;

    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }

    if (!(await mainTarget.systemInfo().invoke_getFeatureState({featureState: 'DIPS'})).featureEnabled) {
      this.#screenStatus = ScreenStatusType.Disabled;
    }
  }
}

ComponentHelpers.CustomElements.defineComponent(
    'devtools-bounce-tracking-mitigations-view', BounceTrackingMitigationsView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-bounce-tracking-mitigations-view': BounceTrackingMitigationsView;
  }
}

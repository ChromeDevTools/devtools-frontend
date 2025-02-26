// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/report_view/report_view.js';
import '../../../ui/legacy/components/data_grid/data_grid.js';

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ChromeLink from '../../../ui/components/chrome_link/chrome_link.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import bounceTrackingMitigationsViewStylesRaw from './bounceTrackingMitigationsView.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const bounceTrackingMitigationsViewStyles = new CSSStyleSheet();
bounceTrackingMitigationsViewStyles.replaceSync(bounceTrackingMitigationsViewStylesRaw.cssContent);

const {html} = Lit;

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
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/application/components/BounceTrackingMitigationsView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const enum ScreenStatusType {
  RUNNING = 'Running',
  RESULT = 'Result',
  DISABLED = 'Disabled',
}

export interface BounceTrackingMitigationsViewData {
  trackingSites: string[];
}

export class BounceTrackingMitigationsView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #trackingSites: string[] = [];
  #screenStatus = ScreenStatusType.RESULT;
  #checkedFeature = false;
  #seenButtonClick = false;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [bounceTrackingMitigationsViewStyles];
    void this.#render();
  }

  async #render(): Promise<void> {
    // clang-format off
    Lit.render(html`
      <devtools-report .data=${{reportTitle: i18nString(UIStrings.bounceTrackingMitigationsTitle)}}
                       jslog=${VisualLogging.pane('bounce-tracking-mitigations')}>
        ${await this.#renderMainFrameInformation()}
      </devtools-report>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  async #renderMainFrameInformation(): Promise<Lit.TemplateResult> {
    if (!this.#checkedFeature) {
      await this.#checkFeatureState();
    }

    if (this.#screenStatus === ScreenStatusType.DISABLED) {
      const mitigationsFlagLink = new ChromeLink.ChromeLink.ChromeLink();
      mitigationsFlagLink.href = 'chrome://flags/#bounce-tracking-mitigations' as Platform.DevToolsPath.UrlString;
      mitigationsFlagLink.textContent = i18nString(UIStrings.featureFlag);

      // clang-format off
      return html`
        <devtools-report-section>
          ${i18n.i18n.getFormatLocalizedString(
              str_, UIStrings.featureDisabled,
              {PH1: mitigationsFlagLink})}
        </devtools-report-section>
      `;
      // clang-format on
    }

    // clang-format off
    return html`
      <devtools-report-section>
        ${this.#renderForceRunButton()}
      </devtools-report-section>
      ${this.#renderDeletedSitesOrNoSitesMessage()}
      <devtools-report-divider>
      </devtools-report-divider>
      <devtools-report-section>
        <x-link href="https://privacycg.github.io/nav-tracking-mitigations/#bounce-tracking-mitigations" class="link"
        jslog=${VisualLogging.link('learn-more').track({click: true})}>
          ${i18nString(UIStrings.learnMore)}
        </x-link>
      </devtools-report-section>
    `;
    // clang-format on
  }

  #renderForceRunButton(): Lit.TemplateResult {
    const isMitigationRunning = (this.#screenStatus === ScreenStatusType.RUNNING);

    // clang-format off
    return html`
      <devtools-button
        aria-label=${i18nString(UIStrings.forceRun)}
        .disabled=${isMitigationRunning}
        .spinner=${isMitigationRunning}
        .variant=${Buttons.Button.Variant.PRIMARY}
        @click=${this.#runMitigations}
        jslog=${VisualLogging.action('force-run').track({click: true})}>
        ${isMitigationRunning ? html`
          ${i18nString(UIStrings.runningMitigations)}`:`
          ${i18nString(UIStrings.forceRun)}
        `}
      </devtools-button>
    `;
    // clang-format on
  }

  #renderDeletedSitesOrNoSitesMessage(): Lit.TemplateResult {
    if (!this.#seenButtonClick) {
      return html``;
    }

    if (this.#trackingSites.length === 0) {
      // clang-format off
      return html`
        <devtools-report-section>
        ${(this.#screenStatus === ScreenStatusType.RUNNING) ? html`
          ${i18nString(UIStrings.checkingPotentialTrackers)}`:`
          ${i18nString(UIStrings.noPotentialBounceTrackersIdentified)}
        `}
        </devtools-report-section>
      `;
      // clang-format on
    }

    // clang-format off
    return html`
      <devtools-report-section>
        <devtools-data-grid striped inline>
          <table>
            <tr>
              <th id="sites" weight="10" sortable>
                ${i18nString(UIStrings.stateDeletedFor)}
              </th>
            </tr>
            ${this.#trackingSites.map(site => html`
              <tr><td>${site}</td></tr>`)}
          </table>
        </devtools-data-grid>
      </devtools-report-section>
    `;
    // clang-format on
  }

  async #runMitigations(): Promise<void> {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }

    this.#seenButtonClick = true;
    this.#screenStatus = ScreenStatusType.RUNNING;

    void this.#render();

    const response = await mainTarget.storageAgent().invoke_runBounceTrackingMitigations();
    this.#trackingSites = [];
    response.deletedSites.forEach(element => {
      this.#trackingSites.push(element);
    });

    this.#renderMitigationsResult();
  }

  #renderMitigationsResult(): void {
    this.#screenStatus = ScreenStatusType.RESULT;
    void this.#render();
  }

  async #checkFeatureState(): Promise<void> {
    this.#checkedFeature = true;

    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }

    if (!(await mainTarget.systemInfo().invoke_getFeatureState({featureState: 'DIPS'})).featureEnabled) {
      this.#screenStatus = ScreenStatusType.DISABLED;
    }
  }
}

customElements.define('devtools-bounce-tracking-mitigations-view', BounceTrackingMitigationsView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-bounce-tracking-mitigations-view': BounceTrackingMitigationsView;
  }
}

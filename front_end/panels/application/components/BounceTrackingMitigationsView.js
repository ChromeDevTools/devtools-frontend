// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/components/report_view/report_view.js';
import '../../../ui/legacy/components/data_grid/data_grid.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import bounceTrackingMitigationsViewStyles from './bounceTrackingMitigationsView.css.js';
const { html } = Lit;
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
    noPotentialBounceTrackersIdentified: 'State was not cleared for any potential bounce tracking sites. Either none were identified or third-party cookies are not blocked.',
    /**
     * @description Text shown when bounce tracking mitigations are disabled.
     */
    featureDisabled: 'Bounce tracking mitigations are disabled.',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/BounceTrackingMitigationsView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class BounceTrackingMitigationsView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
    #shadow = this.attachShadow({ mode: 'open' });
    #trackingSites = [];
    #screenStatus = "Result" /* ScreenStatusType.RESULT */;
    #checkedFeature = false;
    #seenButtonClick = false;
    connectedCallback() {
        void this.#render();
        this.parentElement?.classList.add('overflow-auto');
    }
    async #render() {
        // clang-format off
        Lit.render(html `
      <style>${bounceTrackingMitigationsViewStyles}</style>
      <devtools-report .data=${{ reportTitle: i18nString(UIStrings.bounceTrackingMitigationsTitle) }}
                       jslog=${VisualLogging.pane('bounce-tracking-mitigations')}>
        ${await this.#renderMainFrameInformation()}
      </devtools-report>
    `, this.#shadow, { host: this });
        // clang-format on
    }
    async #renderMainFrameInformation() {
        if (!this.#checkedFeature) {
            await this.#checkFeatureState();
        }
        if (this.#screenStatus === "Disabled" /* ScreenStatusType.DISABLED */) {
            // clang-format off
            return html `
        <devtools-report-section>
          ${i18nString(UIStrings.featureDisabled)}
        </devtools-report-section>
      `;
            // clang-format on
        }
        // clang-format off
        return html `
      <devtools-report-section>
        ${this.#renderForceRunButton()}
      </devtools-report-section>
      ${this.#renderDeletedSitesOrNoSitesMessage()}
      <devtools-report-divider>
      </devtools-report-divider>
      <devtools-report-section>
        <x-link href="https://privacycg.github.io/nav-tracking-mitigations/#bounce-tracking-mitigations" class="link"
        jslog=${VisualLogging.link('learn-more').track({ click: true })}>
          ${i18nString(UIStrings.learnMore)}
        </x-link>
      </devtools-report-section>
    `;
        // clang-format on
    }
    #renderForceRunButton() {
        const isMitigationRunning = (this.#screenStatus === "Running" /* ScreenStatusType.RUNNING */);
        // clang-format off
        return html `
      <devtools-button
        aria-label=${i18nString(UIStrings.forceRun)}
        .disabled=${isMitigationRunning}
        .spinner=${isMitigationRunning}
        .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */}
        @click=${this.#runMitigations}
        jslog=${VisualLogging.action('force-run').track({ click: true })}>
        ${isMitigationRunning ? html `
          ${i18nString(UIStrings.runningMitigations)}` : `
          ${i18nString(UIStrings.forceRun)}
        `}
      </devtools-button>
    `;
        // clang-format on
    }
    #renderDeletedSitesOrNoSitesMessage() {
        if (!this.#seenButtonClick) {
            return Lit.nothing;
        }
        if (this.#trackingSites.length === 0) {
            // clang-format off
            return html `
        <devtools-report-section>
        ${(this.#screenStatus === "Running" /* ScreenStatusType.RUNNING */) ? html `
          ${i18nString(UIStrings.checkingPotentialTrackers)}` : `
          ${i18nString(UIStrings.noPotentialBounceTrackersIdentified)}
        `}
        </devtools-report-section>
      `;
            // clang-format on
        }
        // clang-format off
        return html `
      <devtools-report-section>
        <devtools-data-grid striped inline>
          <table>
            <tr>
              <th id="sites" weight="10" sortable>
                ${i18nString(UIStrings.stateDeletedFor)}
              </th>
            </tr>
            ${this.#trackingSites.map(site => html `
              <tr><td>${site}</td></tr>`)}
          </table>
        </devtools-data-grid>
      </devtools-report-section>
    `;
        // clang-format on
    }
    async #runMitigations() {
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!mainTarget) {
            return;
        }
        this.#seenButtonClick = true;
        this.#screenStatus = "Running" /* ScreenStatusType.RUNNING */;
        void this.#render();
        const response = await mainTarget.storageAgent().invoke_runBounceTrackingMitigations();
        this.#trackingSites = [];
        response.deletedSites.forEach(element => {
            this.#trackingSites.push(element);
        });
        this.#renderMitigationsResult();
    }
    #renderMitigationsResult() {
        this.#screenStatus = "Result" /* ScreenStatusType.RESULT */;
        void this.#render();
    }
    async #checkFeatureState() {
        this.#checkedFeature = true;
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!mainTarget) {
            return;
        }
        if (!(await mainTarget.systemInfo().invoke_getFeatureState({ featureState: 'DIPS' })).featureEnabled) {
            this.#screenStatus = "Disabled" /* ScreenStatusType.DISABLED */;
        }
    }
}
customElements.define('devtools-bounce-tracking-mitigations-view', BounceTrackingMitigationsView);
//# sourceMappingURL=BounceTrackingMitigationsView.js.map
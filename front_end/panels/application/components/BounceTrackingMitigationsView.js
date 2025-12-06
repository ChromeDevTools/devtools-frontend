// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/components/report_view/report_view.js';
import '../../../ui/legacy/components/data_grid/data_grid.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
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
const renderForceRunButton = (input) => {
    const isMitigationRunning = (input.screenStatus === "Running" /* ScreenStatusType.RUNNING */);
    // clang-format off
    return html `
    <devtools-button
      aria-label=${i18nString(UIStrings.forceRun)}
      .disabled=${isMitigationRunning}
      .spinner=${isMitigationRunning}
      .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */}
      @click=${input.runMitigations}
      jslog=${VisualLogging.action('force-run').track({ click: true })}>
      ${isMitigationRunning ? html `
        ${i18nString(UIStrings.runningMitigations)}` : `
        ${i18nString(UIStrings.forceRun)}
      `}
    </devtools-button>
  `;
    // clang-format on
};
const renderDeletedSitesOrNoSitesMessage = (input) => {
    if (!input.seenButtonClick) {
        return Lit.nothing;
    }
    if (input.trackingSites.length === 0) {
        // clang-format off
        return html `
      <devtools-report-section>
      ${(input.screenStatus === "Running" /* ScreenStatusType.RUNNING */) ? html `
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
          ${input.trackingSites.map(site => html `
            <tr><td>${site}</td></tr>`)}
        </table>
      </devtools-data-grid>
    </devtools-report-section>
  `;
    // clang-format on
};
const renderMainFrameInformation = (input) => {
    if (input.screenStatus === "Initializing" /* ScreenStatusType.INITIALIZING */) {
        return Lit.nothing;
    }
    if (input.screenStatus === "Disabled" /* ScreenStatusType.DISABLED */) {
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
      ${renderForceRunButton(input)}
    </devtools-report-section>
    ${renderDeletedSitesOrNoSitesMessage(input)}
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
};
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    Lit.render(html `
    <style>${bounceTrackingMitigationsViewStyles}</style>
    <style>${UI.inspectorCommonStyles}</style>
    <devtools-report .data=${{ reportTitle: i18nString(UIStrings.bounceTrackingMitigationsTitle) }}
                      jslog=${VisualLogging.pane('bounce-tracking-mitigations')}>
      ${renderMainFrameInformation(input)}
    </devtools-report>
  `, target);
    // clang-format on
};
export class BounceTrackingMitigationsView extends UI.Widget.Widget {
    #trackingSites = [];
    #screenStatus = "Initializing" /* ScreenStatusType.INITIALIZING */;
    #seenButtonClick = false;
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true, classes: ['overflow-auto'] });
        this.#view = view;
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!mainTarget) {
            this.#screenStatus = "Result" /* ScreenStatusType.RESULT */;
        }
        else {
            void mainTarget.systemInfo().invoke_getFeatureState({ featureState: 'DIPS' }).then(state => {
                this.#screenStatus = state.featureEnabled ? "Result" /* ScreenStatusType.RESULT */ : "Disabled" /* ScreenStatusType.DISABLED */;
                this.requestUpdate();
            });
        }
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            screenStatus: this.#screenStatus,
            trackingSites: this.#trackingSites,
            seenButtonClick: this.#seenButtonClick,
            runMitigations: this.#runMitigations.bind(this),
        }, undefined, this.contentElement);
    }
    async #runMitigations() {
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!mainTarget) {
            return;
        }
        this.#seenButtonClick = true;
        this.#screenStatus = "Running" /* ScreenStatusType.RUNNING */;
        this.requestUpdate();
        const response = await mainTarget.storageAgent().invoke_runBounceTrackingMitigations();
        this.#trackingSites = [];
        response.deletedSites.forEach(element => {
            this.#trackingSites.push(element);
        });
        this.#renderMitigationsResult();
    }
    #renderMitigationsResult() {
        this.#screenStatus = "Result" /* ScreenStatusType.RESULT */;
        this.requestUpdate();
    }
}
//# sourceMappingURL=BounceTrackingMitigationsView.js.map
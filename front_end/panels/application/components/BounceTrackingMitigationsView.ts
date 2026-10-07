// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/report_view/report_view.js';
import '../../../ui/legacy/components/data_grid/data_grid.js';
import '../../../ui/kit/kit.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import bounceTrackingMitigationsViewStyles from './bounceTrackingMitigationsView.css.js';

const {html} = Lit;

const UIStrings = {
  /**
   * @description Title text in the bounce tracking mitigations view of the Application panel.
   */
  bounceTrackingMitigationsTitle: 'Bounce tracking mitigations',
  /**
   * @description Button text to force bounce tracking mitigations to run in the bounce tracking mitigations view of the Application panel.
   */
  forceRun: 'Force run',
  /**
   * @description Button text for the disabled button while bounce tracking mitigations are running in the bounce tracking mitigations view of the Application panel.
   */
  runningMitigations: 'Running',
  /**
   * @description Heading of the table that displays sites whose state was deleted by bounce tracking mitigations in the bounce tracking mitigations view of the Application panel.
   */
  stateDeletedFor: 'State was deleted for the following sites:',
  /**
   * @description Status text shown while checking for potential bounce tracking sites in the bounce tracking mitigations view of the Application panel.
   */
  checkingPotentialTrackers: 'Checking for potential bounce tracking sites',
  /**
   * @description Link text explaining bounce tracking mitigations in the bounce tracking mitigations view of the Application panel.
   */
  learnMore: 'Learn more: bounce tracking mitigations',
  /**
   * @description Text shown when bounce tracking mitigations have run and no potential bounce tracking sites were identified to delete state for in the bounce tracking mitigations view of the Application panel.
   */
  noPotentialBounceTrackersIdentified:
      'State wasn’t cleared for any potential bounce tracking sites. Either none were identified or third-party cookies aren’t blocked.',
  /**
   * @description Text shown when bounce tracking mitigations are disabled in the bounce tracking mitigations view of the Application panel.
   */
  featureDisabled: 'Bounce tracking mitigations are disabled',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/application/components/BounceTrackingMitigationsView.ts', UIStrings);
export const i18nString: i18n.LocalizeString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const enum ScreenStatusType {
  INITIALIZING = 'Initializing',
  RUNNING = 'Running',
  RESULT = 'Result',
  DISABLED = 'Disabled',
}

export interface BounceTrackingMitigationsViewData {
  trackingSites: string[];
}

export interface ViewInput {
  screenStatus: ScreenStatusType;
  trackingSites: string[];
  seenButtonClick: boolean;
  runMitigations: () => Promise<void>;
}

const renderForceRunButton = (input: ViewInput): Lit.TemplateResult => {
  const isMitigationRunning = (input.screenStatus === ScreenStatusType.RUNNING);

  // clang-format off
  return html`
    <devtools-button
      aria-label=${i18nString(UIStrings.forceRun)}
      .disabled=${isMitigationRunning}
      .spinner=${isMitigationRunning}
      .variant=${Buttons.Button.Variant.PRIMARY}
      @click=${input.runMitigations}
      jslog=${VisualLogging.action('force-run').track({click: true})}>
      ${isMitigationRunning ? html`
        ${i18nString(UIStrings.runningMitigations)}`:`
        ${i18nString(UIStrings.forceRun)}
      `}
    </devtools-button>
  `;
  // clang-format on
};

const renderDeletedSitesOrNoSitesMessage = (input: ViewInput): Lit.LitTemplate => {
  if (!input.seenButtonClick) {
    return Lit.nothing;
  }

  if (input.trackingSites.length === 0) {
    // clang-format off
    return html`
      <devtools-report-section>
      ${(input.screenStatus === ScreenStatusType.RUNNING) ? html`
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
          ${input.trackingSites.map(site => html`
            <tr><td>${site}</td></tr>`)}
        </table>
      </devtools-data-grid>
    </devtools-report-section>
  `;
  // clang-format on
};

const renderMainFrameInformation = (input: ViewInput): Lit.LitTemplate => {
  if (input.screenStatus === ScreenStatusType.INITIALIZING) {
    return Lit.nothing;
  }

  if (input.screenStatus === ScreenStatusType.DISABLED) {
    // clang-format off
    return html`
      <devtools-report-section>
        ${i18nString(UIStrings.featureDisabled)}
      </devtools-report-section>
    `;
    // clang-format on
  }

  // clang-format off
  return html`
    <devtools-report-section>
      ${renderForceRunButton(input)}
    </devtools-report-section>
    ${renderDeletedSitesOrNoSitesMessage(input)}
    <devtools-report-divider>
    </devtools-report-divider>
    <devtools-report-section>
      <devtools-link href="https://privacycg.github.io/nav-tracking-mitigations/#bounce-tracking-mitigations" class="link"
      jslogcontext="learn-more">
        ${i18nString(UIStrings.learnMore)}
      </devtools-link>
    </devtools-report-section>
  `;
  // clang-format on
};

export const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement|DocumentFragment): void => {
  // clang-format off
  Lit.render(html`
    <style>${bounceTrackingMitigationsViewStyles}</style>
    <style>${UI.inspectorCommonStyles}</style>
    <devtools-report .data=${{reportTitle: i18nString(UIStrings.bounceTrackingMitigationsTitle)}}
                      jslog=${VisualLogging.pane('bounce-tracking-mitigations')}>
      ${renderMainFrameInformation(input)}
    </devtools-report>
  `, target, {container: {classes: ['overflow-auto']}});
  // clang-format on
};

type ViewFunction = typeof DEFAULT_VIEW;

export class BounceTrackingMitigationsView extends UI.Widget.Widget<ShadowRoot> {
  #trackingSites: string[] = [];
  #screenStatus = ScreenStatusType.INITIALIZING;
  #seenButtonClick = false;
  #view: ViewFunction;

  constructor(element?: HTMLElement, view: ViewFunction = DEFAULT_VIEW) {
    super(element, {useShadowDom: 'pure'});

    this.#view = view;

    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      this.#screenStatus = ScreenStatusType.RESULT;
    } else {
      void mainTarget.systemInfo().invoke_getFeatureState({featureState: 'DIPS'}).then(state => {
        this.#screenStatus = state.featureEnabled ? ScreenStatusType.RESULT : ScreenStatusType.DISABLED;
        this.requestUpdate();
      });
    }
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view(
        {
          screenStatus: this.#screenStatus,
          trackingSites: this.#trackingSites,
          seenButtonClick: this.#seenButtonClick,
          runMitigations: this.#runMitigations.bind(this),
        },
        undefined, this.contentElement);
  }

  async #runMitigations(): Promise<void> {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }

    this.#seenButtonClick = true;
    this.#screenStatus = ScreenStatusType.RUNNING;

    this.requestUpdate();

    const response = await mainTarget.storageAgent().invoke_runBounceTrackingMitigations();
    this.#trackingSites = [];
    response.deletedSites.forEach(element => {
      this.#trackingSites.push(element);
    });

    this.#renderMitigationsResult();
  }

  #renderMitigationsResult(): void {
    this.#screenStatus = ScreenStatusType.RESULT;
    this.requestUpdate();
  }
}

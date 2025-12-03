// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import {RuntimeSettings} from './LighthouseController.js';
import lighthouseDialogStyles from './lighthouseDialog.css.js';
import type {LighthousePanel} from './LighthousePanel.js';

const {html} = Lit;

const UIStrings = {
  /**
   * @description Text to cancel something
   */
  cancel: 'Cancel',
  /**
   * @description Text when something is loading
   */
  loading: 'Loading…',
  /**
   * @description Status text in Lighthouse splash screen while an audit is being performed
   * @example {github.com} PH1
   */
  auditingS: 'Auditing {PH1}',
  /**
   * @description Status text in Lighthouse splash screen while an audit is being performed
   */
  auditingYourWebPage: 'Auditing your web page',
  /**
   * @description Status text in Lighthouse splash screen while an audit is being performed, and cancellation to take effect
   */
  cancelling: 'Cancelling…',
  /**
   * @description Status text in Lighthouse splash screen while preparing for an audit
   */
  lighthouseIsWarmingUp: '`Lighthouse` is warming up…',
  /**
   * @description Status text in Lighthouse splash screen while an audit is being performed
   */
  lighthouseIsLoadingYourPage: '`Lighthouse` is loading your page',
  /**
   * @description Text in Lighthouse Status View
   * @example {75% of global mobile users in 2016 were on 2G or 3G [Source: GSMA Mobile]} PH1
   */
  fastFactMessageWithPlaceholder: '💡 {PH1}',
  /**
   * @description Text of a DOM element in Lighthouse Status View
   */
  ahSorryWeRanIntoAnError: 'Ah, sorry! We ran into an error.',
  /**
   * @description Text in Lighthouse Status View
   */
  tryToNavigateToTheUrlInAFresh:
      'Try to navigate to the URL in a fresh `Chrome` profile without any other tabs or extensions open and try again.',
  /**
   * @description Text of a DOM element in Lighthouse Status View
   */
  ifThisIssueIsReproduciblePlease: 'If this issue is reproducible, please report it at the `Lighthouse` `GitHub` repo.',
  /**
   * @description Text in Lighthouse splash screen when loading the page for auditing
   */
  lighthouseIsLoadingThePage: 'Lighthouse is loading the page.',
  /**
   * @description Text in Lighthouse splash screen when Lighthouse is gathering information for display
   */
  lighthouseIsGatheringInformation: '`Lighthouse` is gathering information about the page to compute your score.',
  /**
   * @description Text in Lighthouse splash screen when Lighthouse is generating a report.
   */
  almostThereLighthouseIsNow: 'Almost there! `Lighthouse` is now generating your report.',
  /**
   * @description Text in Lighthouse splash screen when loading the page for auditing
   */
  lighthouseIsLoadingYourPageWith:
      '`Lighthouse` is loading your page with throttling to measure performance on a mobile device on 3G.',
  /**
   * @description Text in Lighthouse splash screen when loading the page for auditing
   */
  lighthouseIsLoadingYourPageWithThrottling:
      '`Lighthouse` is loading your page with throttling to measure performance on a slow desktop on 3G.',
  /**
   * @description Text in Lighthouse splash screen when loading the page for auditing
   */
  lighthouseIsLoadingYourPageWithMobile: '`Lighthouse` is loading your page with mobile emulation.',
  /**
   * @description Fast fact in the splash screen while Lighthouse is performing an audit
   */
  mbTakesAMinimumOfSecondsTo:
      '1MB takes a minimum of 5 seconds to download on a typical 3G connection [Source: `WebPageTest` and `DevTools` 3G definition].',
  /**
   * @description Fast fact in the splash screen while Lighthouse is performing an audit
   */
  rebuildingPinterestPagesFor:
      'Rebuilding Pinterest pages for performance increased conversion rates by 15% [Source: `WPO Stats`]',
  /**
   * @description Fast fact in the splash screen while Lighthouse is performing an audit
   */
  byReducingTheResponseSizeOfJson:
      'By reducing the response size of JSON needed for displaying comments, Instagram saw increased impressions [Source: `WPO Stats`]',
  /**
   * @description Fast fact in the splash screen while Lighthouse is performing an audit
   */
  walmartSawAIncreaseInRevenueFor:
      'Walmart saw a 1% increase in revenue for every 100ms improvement in page load [Source: `WPO Stats`]',
  /**
   * @description Fast fact in the splash screen while Lighthouse is performing an audit
   */
  ifASiteTakesSecondToBecome:
      'If a site takes >1 second to become interactive, users lose attention, and their perception of completing the page task is broken [Source: `Google Developers Blog`]',
  /**
   * @description Fast fact in the splash screen while Lighthouse is performing an audit
   */
  OfGlobalMobileUsersInWereOnGOrG: '75% of global mobile users in 2016 were on 2G or 3G [Source: `GSMA Mobile`]',
  /**
   * @description Fast fact in the splash screen while Lighthouse is performing an audit
   */
  theAverageUserDeviceCostsLess:
      'The average user device costs less than 200 USD. [Source: `International Data Corporation`]',
  /**
   * @description Fast fact in the splash screen while Lighthouse is performing an audit
   */
  SecondsIsTheAverageTimeAMobile:
      '19 seconds is the average time a mobile web page takes to load on a 3G connection [Source: `Google DoubleClick blog`]',
  /**
   * @description Fast fact in the splash screen while Lighthouse is performing an audit
   */
  OfMobilePagesTakeNearlySeconds:
      '70% of mobile pages take nearly 7 seconds for the visual content above the fold to display on the screen. [Source: `Think with Google`]',
  /**
   * @description Fast fact in the splash screen while Lighthouse is performing an audit
   */
  asPageLoadTimeIncreasesFromOne:
      'As page load time increases from one second to seven seconds, the probability of a mobile site visitor bouncing increases 113%. [Source: `Think with Google`]',
  /**
   * @description Fast fact in the splash screen while Lighthouse is performing an audit
   */
  asTheNumberOfElementsOnAPage:
      'As the number of elements on a page increases from 400 to 6,000, the probability of conversion drops 95%. [Source: `Think with Google`]',
  /**
   * @description Fast fact in the splash screen while Lighthouse is performing an audit
   */
  lighthouseOnlySimulatesMobile:
      '`Lighthouse` only simulates mobile performance; to measure performance on a real device, try WebPageTest.org [Source: `Lighthouse` team]',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/lighthouse/LighthouseStatusView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export interface ViewInput {
  statusHeader: string;
  statusText: string;
  progressBarClass: string;
  progressBarValue: number;
  progressBarTotal: number;
  cancelButtonVisible: boolean;
  onCancel: () => void;
  bugReport?: {
    error: Error,
    auditURL: string,
    knownBugPattern?: boolean,
  };
}

export const DEFAULT_VIEW = (input: ViewInput, _output: object, target: HTMLElement|DocumentFragment): void => {
  const {
    statusHeader,
    statusText,
    progressBarClass,
    progressBarValue,
    progressBarTotal,
    cancelButtonVisible,
    onCancel,
    bugReport,
  } = input;

  const renderBugReportBody = (err: Error, auditURL: string): Lit.TemplateResult => {
    const chromeVersion = navigator.userAgent.match(/Chrome\/(\S+)/) || ['', 'Unknown'];
    // @ts-expect-error Lighthouse sets `friendlyMessage` on certain
    // important errors such as PROTOCOL_TIMEOUT.
    const errorMessage = err.friendlyMessage || err.message;
    const issueBody = `
${errorMessage}
\`\`\`
Channel: DevTools
Initial URL: ${auditURL}
Chrome Version: ${chromeVersion[1]}
Stack Trace: ${err.stack}
\`\`\`
`;
    return html`
      <p>${i18nString(UIStrings.ifThisIssueIsReproduciblePlease)}</p>
      <code class="monospace">${issueBody.trim()}</code>
    `;
  };

  // clang-format off
  Lit.render(html`
    <div class="lighthouse-view vbox">
      <span class="header">${statusHeader}</span>
      <div class="lighthouse-status vbox">
        <div class="lighthouse-progress-wrapper">
          <div
            class="lighthouse-progress-bar ${progressBarClass}"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax=${progressBarTotal}
            aria-valuenow=${progressBarValue}
            aria-valuetext=${statusText}
          ></div>
        </div>
        <div class="lighthouse-status-text" role="status">
          ${bugReport ? html`
            <p>${i18nString(UIStrings.ahSorryWeRanIntoAnError)}</p>
            ${bugReport.knownBugPattern ? html`
              <p>${i18nString(UIStrings.tryToNavigateToTheUrlInAFresh)}</p>
            ` : renderBugReportBody(bugReport.error, bugReport.auditURL)}
          ` : statusText}
        </div>
      </div>
      <div class="lighthouse-action-buttons">
        <devtools-button
          .variant=${Buttons.Button.Variant.TONAL}
          .jslogContext=${'lighthouse.cancel'}
          @click=${onCancel}
          style=${Lit.Directives.styleMap({visibility: cancelButtonVisible ? 'visible' : 'hidden'})}
        >${i18nString(UIStrings.cancel)}</devtools-button>
      </div>
    </div>
  `, target);
  // clang-format on
};

export class StatusView {
  private readonly panel: LighthousePanel;
  private inspectedURL: string;
  private textChangedAt: number;
  private fastFactsQueued: Common.UIString.LocalizedString[];
  private currentPhase: StatusPhase|null;
  private scheduledFastFactTimeout: number|null;
  private dialogRoot: ShadowRoot|null = null;
  private readonly dialog: UI.Dialog.Dialog;

  private statusHeader: string;
  private statusText: string;
  private progressBarClass: string;
  private progressBarValue: number;
  private cancelButtonVisible: boolean;
  private bugReport: {error: Error, auditURL: string, knownBugPattern?: boolean}|null;

  constructor(panel: LighthousePanel) {
    this.panel = panel;

    this.inspectedURL = '';
    this.textChangedAt = 0;
    this.fastFactsQueued = FastFacts.map(lazyString => lazyString());
    this.currentPhase = null;
    this.scheduledFastFactTimeout = null;

    this.dialog = new UI.Dialog.Dialog();
    this.dialog.setDimmed(true);
    this.dialog.setCloseOnEscape(false);
    this.dialog.setOutsideClickCallback(event => event.consume(true));

    this.statusHeader = '';
    this.statusText = '';
    this.progressBarClass = '';
    this.progressBarValue = 0;
    this.cancelButtonVisible = true;
    this.bugReport = null;

    this.render();
  }

  private render(): void {
    if (!this.dialogRoot) {
      this.dialogRoot =
          UI.UIUtils.createShadowRootWithCoreStyles(this.dialog.contentElement, {cssFile: lighthouseDialogStyles});
      this.dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.SET_EXACT_WIDTH_MAX_HEIGHT);
      this.dialog.setMaxContentSize(new Geometry.Size(500, 400));
    }
    DEFAULT_VIEW(
        {
          statusHeader: this.statusHeader,
          statusText: this.statusText,
          progressBarClass: this.progressBarClass,
          progressBarValue: this.progressBarValue,
          progressBarTotal: StatusPhases.length - 1,
          cancelButtonVisible: this.cancelButtonVisible,
          onCancel: this.cancel.bind(this),
          bugReport: this.bugReport || undefined,
        },
        {}, this.dialogRoot);
  }

  private reset(): void {
    this.resetProgressBarClasses();
    clearTimeout(this.scheduledFastFactTimeout as number);

    this.textChangedAt = 0;
    this.fastFactsQueued = FastFacts.map(lazyString => lazyString());
    this.currentPhase = null;
    this.scheduledFastFactTimeout = null;
    this.bugReport = null;
    this.statusText = '';
    this.progressBarValue = 0;
    this.cancelButtonVisible = true;
  }

  show(dialogRenderElement: Element): void {
    this.reset();
    this.updateStatus(i18nString(UIStrings.loading));

    const parsedURL = Common.ParsedURL.ParsedURL.fromString(this.inspectedURL);
    const pageHost = parsedURL?.host;
    const statusHeader =
        pageHost ? i18nString(UIStrings.auditingS, {PH1: pageHost}) : i18nString(UIStrings.auditingYourWebPage);
    this.renderStatusHeader(statusHeader);
    this.dialog.show(dialogRenderElement);
    this.render();
  }

  private renderStatusHeader(statusHeader?: string): void {
    this.statusHeader = `${statusHeader}…`;
    this.render();
  }

  hide(): void {
    if (this.dialog.isShowing()) {
      this.dialog.hide();
    }
  }

  setInspectedURL(url = ''): void {
    this.inspectedURL = url;
  }

  updateStatus(message: string|null): void {
    if (!message) {
      return;
    }

    if (message.startsWith('Cancel')) {
      this.commitTextChange(i18nString(UIStrings.cancelling));
      clearTimeout(this.scheduledFastFactTimeout as number);
      return;
    }

    const nextPhase = this.getPhaseForMessage(message);
    if (!nextPhase && !this.currentPhase) {
      this.commitTextChange(i18nString(UIStrings.lighthouseIsWarmingUp));
      clearTimeout(this.scheduledFastFactTimeout as number);
    } else if (nextPhase) {
      this.currentPhase = nextPhase;
      const text = this.getMessageForPhase(nextPhase);
      this.commitTextChange(text);
      this.scheduleFastFactCheck();
      this.resetProgressBarClasses();

      this.progressBarClass = nextPhase.progressBarClass;
      this.progressBarValue = StatusPhases.indexOf(nextPhase);
      this.render();
    }
  }

  private cancel(): void {
    void this.panel.handleRunCancel();
  }

  private getMessageForPhase(phase: StatusPhase): string {
    if (phase.message()) {
      return phase.message();
    }

    const deviceTypeSetting = RuntimeSettings.find(item => item.setting.name === 'lighthouse.device-type');
    const throttleSetting = RuntimeSettings.find(item => item.setting.name === 'lighthouse.throttling');
    const deviceType = deviceTypeSetting ? deviceTypeSetting.setting.get() : '';
    const throttling = throttleSetting ? throttleSetting.setting.get() : '';
    const match = LoadingMessages.find(item => {
      return item.deviceType === deviceType && item.throttling === throttling;
    });

    return match ? match.message() : i18nString(UIStrings.lighthouseIsLoadingYourPage);
  }

  private getPhaseForMessage(message: string): StatusPhase|null {
    return StatusPhases.find(phase => phase.statusMessageRegex.test(message)) || null;
  }

  private resetProgressBarClasses(): void {
    this.progressBarClass = '';
    this.render();
  }

  private scheduleFastFactCheck(): void {
    if (!this.currentPhase || this.scheduledFastFactTimeout) {
      return;
    }

    this.scheduledFastFactTimeout = window.setTimeout(() => {
      this.updateFastFactIfNecessary();
      this.scheduledFastFactTimeout = null;

      this.scheduleFastFactCheck();
    }, 100);
  }

  private updateFastFactIfNecessary(): void {
    const now = performance.now();
    if (now - this.textChangedAt < fastFactRotationInterval) {
      return;
    }
    if (!this.fastFactsQueued.length) {
      return;
    }

    const fastFactIndex = Math.floor(Math.random() * this.fastFactsQueued.length);
    this.commitTextChange(
        i18nString(UIStrings.fastFactMessageWithPlaceholder, {PH1: this.fastFactsQueued[fastFactIndex]}));
    this.fastFactsQueued.splice(fastFactIndex, 1);
  }

  private commitTextChange(text: string): void {
    this.textChangedAt = performance.now();
    this.statusText = text;
    this.render();
  }

  renderBugReport(err: Error): void {
    console.error(err);
    if (this.scheduledFastFactTimeout) {
      window.clearTimeout(this.scheduledFastFactTimeout);
    }

    this.resetProgressBarClasses();
    this.progressBarClass = 'errored';
    this.statusText = '';

    this.bugReport = {
      error: err,
      auditURL: this.inspectedURL,
      knownBugPattern: KnownBugPatterns.some(pattern => pattern.test(err.message)),
    };
    this.render();
  }

  renderText(statusHeader: string, text: string): void {
    this.statusHeader = `${statusHeader}…`;
    this.commitTextChange(text);
  }

  toggleCancelButton(show: boolean): void {
    this.cancelButtonVisible = show;
    this.render();
  }
}

export const fastFactRotationInterval = 6000;

export const minimumTextVisibilityDuration = 3000;

const KnownBugPatterns: RegExp[] = [
  /PARSING_PROBLEM/,
  /DOCUMENT_REQUEST/,
  /READ_FAILED/,
  /TRACING_ALREADY_STARTED/,
  /^You must provide a url to the runner/,
  /^You probably have multiple tabs open/,
];

export interface StatusPhase {
  id: string;
  progressBarClass: string;
  message: () => Common.UIString.LocalizedString;
  statusMessageRegex: RegExp;
}

export const StatusPhases: StatusPhase[] = [
  {
    id: 'loading',
    progressBarClass: 'loading',
    message: i18nLazyString(UIStrings.lighthouseIsLoadingThePage),
    statusMessageRegex: /^(Navigating to)/,
  },
  {
    id: 'gathering',
    progressBarClass: 'gathering',
    message: i18nLazyString(UIStrings.lighthouseIsGatheringInformation),
    statusMessageRegex: /(Gather|artifact)/i,
  },
  {
    id: 'auditing',
    progressBarClass: 'auditing',
    message: i18nLazyString(UIStrings.almostThereLighthouseIsNow),
    statusMessageRegex: /^Audit/,
  },
];

const LoadingMessages = [
  {
    deviceType: 'mobile',
    throttling: 'on',
    message: i18nLazyString(UIStrings.lighthouseIsLoadingYourPageWith),
  },
  {
    deviceType: 'desktop',
    throttling: 'on',
    message: i18nLazyString(UIStrings.lighthouseIsLoadingYourPageWithThrottling),
  },
  {
    deviceType: 'mobile',
    throttling: 'off',
    message: i18nLazyString(UIStrings.lighthouseIsLoadingYourPageWithMobile),
  },
  {
    deviceType: 'desktop',
    throttling: 'off',
    message: i18nLazyString(UIStrings.lighthouseIsLoadingThePage),
  },
];

const FastFacts = [
  i18nLazyString(UIStrings.mbTakesAMinimumOfSecondsTo),
  i18nLazyString(UIStrings.rebuildingPinterestPagesFor),
  i18nLazyString(UIStrings.byReducingTheResponseSizeOfJson),
  i18nLazyString(UIStrings.walmartSawAIncreaseInRevenueFor),
  i18nLazyString(UIStrings.ifASiteTakesSecondToBecome),
  i18nLazyString(UIStrings.OfGlobalMobileUsersInWereOnGOrG),
  i18nLazyString(UIStrings.theAverageUserDeviceCostsLess),
  i18nLazyString(UIStrings.SecondsIsTheAverageTimeAMobile),
  i18nLazyString(UIStrings.OfMobilePagesTakeNearlySeconds),
  i18nLazyString(UIStrings.asPageLoadTimeIncreasesFromOne),
  i18nLazyString(UIStrings.asTheNumberOfElementsOnAPage),
  i18nLazyString(UIStrings.OfMobilePagesTakeNearlySeconds),
  i18nLazyString(UIStrings.lighthouseOnlySimulatesMobile),
];

// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as i18n from '../i18n/i18n.js';
import * as UI from '../ui/ui.js';

import {Events, LighthouseController, RuntimeSettings} from './LighthouseController.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Text to cancel something
  */
  cancel: 'Cancel',
  /**
  *@description Text when something is loading
  */
  loading: 'Loading…',
  /**
  *@description Text in Lighthouse Status View
  *@example {github.com} PH1
  */
  auditingS: 'Auditing {PH1}',
  /**
  *@description Text in Lighthouse Status View
  */
  auditingYourWebPage: 'Auditing your web page',
  /**
  *@description Text in Lighthouse Status View
  */
  cancelling: 'Cancelling…',
  /**
  *@description Text in Lighthouse Status View
  */
  lighthouseIsWarmingUp: '`Lighthouse` is warming up…',
  /**
  *@description Text in Lighthouse Status View
  */
  lighthouseIsLoadingYourPage: '`Lighthouse` is loading your page',
  /**
  *@description Text in Lighthouse Status View
  *@example {75% of global mobile users in 2016 were on 2G or 3G [Source: GSMA Mobile]} PH1
  */
  fastFactMessageWithPlaceholder: '💡 {PH1}',
  /**
  *@description Text of a DOM element in Lighthouse Status View
  */
  ahSorryWeRanIntoAnError: 'Ah, sorry! We ran into an error.',
  /**
  *@description Text in Lighthouse Status View
  */
  tryToNavigateToTheUrlInAFresh:
      'Try to navigate to the URL in a fresh `Chrome` profile without any other tabs or extensions open and try again.',
  /**
  *@description Text of a DOM element in Lighthouse Status View
  */
  ifThisIssueIsReproduciblePlease: 'If this issue is reproducible, please report it at the `Lighthouse` `GitHub` repo.',
  /**
  *@description Text in Lighthouse Status View
  */
  lighthouseIsLoadingThePage: 'Lighthouse is loading the page.',
  /**
  *@description Text in the pop-up dialog when lighthouse is gathering information in the Lighthouse panel
  */
  lighthouseIsGatheringInformation: '`Lighthouse` is gathering information about the page to compute your score.',
  /**
  *@description Text in the pop-up dialog when lighthouse is auditing in the Lighthouse panel
  */
  almostThereLighthouseIsNow: 'Almost there! `Lighthouse` is now generating your report.',
  /**
  *@description Text when lighthouse is loading the page in the Lighthouse panel
  */
  lighthouseIsLoadingYourPageWith:
      '`Lighthouse` is loading your page with throttling to measure performance on a mobile device on 3G.',
  /**
  *@description Text when lighthouse is loading the page in the Lighthouse panel
  */
  lighthouseIsLoadingYourPageWithThrottling:
      '`Lighthouse` is loading your page with throttling to measure performance on a slow desktop on 3G.',
  /**
  *@description Text when lighthouse is loading the page in the Lighthouse panel
  */
  lighthouseIsLoadingYourPageWithMobile: '`Lighthouse` is loading your page with mobile emulation.',
  /**
  *@description Fast fact in the pop-up dialog when lighthouse is running in the Lighthouse panel
  */
  mbTakesAMinimumOfSecondsTo:
      '1MB takes a minimum of 5 seconds to download on a typical 3G connection [Source: `WebPageTest` and `DevTools` 3G definition].',
  /**
  *@description Fast fact in the pop-up dialog when lighthouse is running in the Lighthouse panel
  */
  rebuildingPinterestPagesFor:
      'Rebuilding Pinterest pages for performance increased conversion rates by 15% [Source: `WPO Stats`]',
  /**
  *@description Fast fact in the pop-up dialog when lighthouse is running in the Lighthouse panel
  */
  byReducingTheResponseSizeOfJson:
      'By reducing the response size of JSON needed for displaying comments, Instagram saw increased impressions [Source: `WPO Stats`]',
  /**
  *@description Fast fact in the pop-up dialog when lighthouse is running in the Lighthouse panel
  */
  walmartSawAIncreaseInRevenueFor:
      'Walmart saw a 1% increase in revenue for every 100ms improvement in page load [Source: `WPO Stats`]',
  /**
  *@description Fast fact in the pop-up dialog when lighthouse is running in the Lighthouse panel
  */
  ifASiteTakesSecondToBecome:
      'If a site takes >1 second to become interactive, users lose attention, and their perception of completing the page task is broken [Source: `Google Developers Blog`]',
  /**
  *@description Fast fact in the pop-up dialog when lighthouse is running in the Lighthouse panel
  */
  OfGlobalMobileUsersInWereOnGOrG: '75% of global mobile users in 2016 were on 2G or 3G [Source: `GSMA Mobile`]',
  /**
  *@description Fast fact in the pop-up dialog when lighthouse is running in the Lighthouse panel
  */
  theAverageUserDeviceCostsLess:
      'The average user device costs less than 200 USD. [Source: `International Data Corporation`]',
  /**
  *@description Fast fact in the pop-up dialog when lighthouse is running in the Lighthouse panel
  */
  SecondsIsTheAverageTimeAMobile:
      '19 seconds is the average time a mobile web page takes to load on a 3G connection [Source: `Google DoubleClick blog`]',
  /**
  *@description Fast fact in the pop-up dialog when lighthouse is running in the Lighthouse panel
  */
  OfMobilePagesTakeNearlySeconds:
      '70% of mobile pages take nearly 7 seconds for the visual content above the fold to display on the screen. [Source: `Think with Google`]',
  /**
  *@description Fast fact in the pop-up dialog when lighthouse is running in the Lighthouse panel
  */
  asPageLoadTimeIncreasesFromOne:
      'As page load time increases from one second to seven seconds, the probability of a mobile site visitor bouncing increases 113%. [Source: `Think with Google`]',
  /**
  *@description Fast fact in the pop-up dialog when lighthouse is running in the Lighthouse panel
  */
  asTheNumberOfElementsOnAPage:
      'As the number of elements on a page increases from 400 to 6,000, the probability of conversion drops 95%. [Source: `Think with Google`]',
  /**
  *@description Fast fact in the pop-up dialog when lighthouse is running in the Lighthouse panel
  */
  lighthouseOnlySimulatesMobile:
      '`Lighthouse` only simulates mobile performance; to measure performance on a real device, try WebPageTest.org [Source: `Lighthouse` team]',
};
const str_ = i18n.i18n.registerUIStrings('lighthouse/LighthouseStatusView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class StatusView {
  _controller: LighthouseController;
  _statusView: Element|null;
  _statusHeader: Element|null;
  _progressWrapper: Element|null;
  _progressBar: Element|null;
  _statusText: Element|null;
  _cancelButton: HTMLButtonElement|null;
  _inspectedURL: string;
  _textChangedAt: number;
  _fastFactsQueued: Common.UIString.LocalizedString[];
  _currentPhase: {id: string, message: string, progressBarClass: string, statusMessagePrefix: string}|null;
  _scheduledTextChangeTimeout: number|null;
  _scheduledFastFactTimeout: number|null;
  _dialog: UI.Dialog.Dialog;

  constructor(controller: LighthouseController) {
    this._controller = controller;

    this._statusView = null;
    this._statusHeader = null;
    this._progressWrapper = null;
    this._progressBar = null;
    this._statusText = null;
    this._cancelButton = null;

    this._inspectedURL = '';
    this._textChangedAt = 0;
    this._fastFactsQueued = FastFacts.slice();
    this._currentPhase = null;
    this._scheduledTextChangeTimeout = null;
    this._scheduledFastFactTimeout = null;

    this._dialog = new UI.Dialog.Dialog();
    this._dialog.setDimmed(true);
    this._dialog.setCloseOnEscape(false);
    this._dialog.setOutsideClickCallback(event => event.consume(true));
    this._render();
  }

  _render(): void {
    const dialogRoot = UI.Utils.createShadowRootWithCoreStyles(
        this._dialog.contentElement,
        {cssFile: 'lighthouse/lighthouseDialog.css', enableLegacyPatching: false, delegatesFocus: undefined});
    const lighthouseViewElement = dialogRoot.createChild('div', 'lighthouse-view vbox');

    const cancelButton = UI.UIUtils.createTextButton(i18nString(UIStrings.cancel), this._cancel.bind(this));
    const fragment = UI.Fragment.Fragment.build`
  <div class="lighthouse-view vbox">
  <h2 $="status-header">Auditing your web page…</h2>
  <div class="lighthouse-status vbox" $="status-view">
  <div class="lighthouse-progress-wrapper" $="progress-wrapper">
  <div class="lighthouse-progress-bar" $="progress-bar"></div>
  </div>
  <div class="lighthouse-status-text" $="status-text"></div>
  </div>
  ${cancelButton}
  </div>
  `;

    lighthouseViewElement.appendChild(fragment.element());

    this._statusView = fragment.$('status-view');
    this._statusHeader = fragment.$('status-header');
    this._progressWrapper = fragment.$('progress-wrapper');
    this._progressBar = fragment.$('progress-bar');
    this._statusText = fragment.$('status-text');
    // Use StatusPhases array index as progress bar value
    UI.ARIAUtils.markAsProgressBar(this._progressBar, 0, StatusPhases.length - 1);
    this._cancelButton = cancelButton;
    UI.ARIAUtils.markAsStatus(this._statusText);

    this._dialog.setDefaultFocusedElement(cancelButton);
    this._dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.SetExactWidthMaxHeight);
    this._dialog.setMaxContentSize(new UI.Geometry.Size(500, 400));
  }

  _reset(): void {
    this._resetProgressBarClasses();
    clearTimeout(this._scheduledFastFactTimeout as number);

    this._textChangedAt = 0;
    this._fastFactsQueued = FastFacts.slice();
    this._currentPhase = null;
    this._scheduledTextChangeTimeout = null;
    this._scheduledFastFactTimeout = null;
  }

  show(dialogRenderElement: Element): void {
    this._reset();
    this.updateStatus(i18nString(UIStrings.loading));

    const parsedURL = Common.ParsedURL.ParsedURL.fromString(this._inspectedURL);
    const pageHost = parsedURL && parsedURL.host;
    const statusHeader =
        pageHost ? i18nString(UIStrings.auditingS, {PH1: pageHost}) : i18nString(UIStrings.auditingYourWebPage);
    this._renderStatusHeader(statusHeader);
    // @ts-ignore TS expects Document, but gets Element (show takes Element|Document)
    this._dialog.show(dialogRenderElement);
  }

  _renderStatusHeader(statusHeader?: string): void {
    if (this._statusHeader) {
      this._statusHeader.textContent = `${statusHeader}…`;
    }
  }

  hide(): void {
    if (this._dialog.isShowing()) {
      this._dialog.hide();
    }
  }

  setInspectedURL(url: string = ''): void {
    this._inspectedURL = url;
  }

  updateStatus(message: string|null): void {
    if (!message || !this._statusText) {
      return;
    }

    if (message.startsWith('Cancel')) {
      this._commitTextChange(i18nString(UIStrings.cancelling));
      clearTimeout(this._scheduledFastFactTimeout as number);
      return;
    }

    const nextPhase = this._getPhaseForMessage(message);

    // @ts-ignore indexOf null is valid.
    const nextPhaseIndex = StatusPhases.indexOf(nextPhase);

    // @ts-ignore indexOf null is valid.
    const currentPhaseIndex = StatusPhases.indexOf(this._currentPhase);
    if (!nextPhase && !this._currentPhase) {
      this._commitTextChange(i18nString(UIStrings.lighthouseIsWarmingUp));
      clearTimeout(this._scheduledFastFactTimeout as number);
    } else if (nextPhase && (!this._currentPhase || currentPhaseIndex < nextPhaseIndex)) {
      this._currentPhase = nextPhase;
      const text = this._getMessageForPhase(nextPhase);
      this._scheduleTextChange(text);
      this._scheduleFastFactCheck();
      this._resetProgressBarClasses();

      if (this._progressBar) {
        this._progressBar.classList.add(nextPhase.progressBarClass);
        UI.ARIAUtils.setProgressBarValue(this._progressBar, nextPhaseIndex, text);
      }
    }
  }

  _cancel(): void {
    this._controller.dispatchEventToListeners(Events.RequestLighthouseCancel);
  }

  _getMessageForPhase(phase: StatusPhase): string {
    if (phase.message) {
      return phase.message;
    }

    const deviceTypeSetting = RuntimeSettings.find(item => item.setting.name === 'lighthouse.device_type');
    const throttleSetting = RuntimeSettings.find(item => item.setting.name === 'lighthouse.throttling');
    const deviceType = deviceTypeSetting ? deviceTypeSetting.setting.get() : '';
    const throttling = throttleSetting ? throttleSetting.setting.get() : '';
    const match = LoadingMessages.find(item => {
      return item.deviceType === deviceType && item.throttling === throttling;
    });

    return match ? match.message : i18nString(UIStrings.lighthouseIsLoadingYourPage);
  }

  _getPhaseForMessage(message: string): StatusPhase|null {
    return StatusPhases.find(phase => message.startsWith(phase.statusMessagePrefix)) || null;
  }

  _resetProgressBarClasses(): void {
    if (this._progressBar) {
      this._progressBar.className = 'lighthouse-progress-bar';
    }
  }

  _scheduleFastFactCheck(): void {
    if (!this._currentPhase || this._scheduledFastFactTimeout) {
      return;
    }

    this._scheduledFastFactTimeout = window.setTimeout(() => {
      this._updateFastFactIfNecessary();
      this._scheduledFastFactTimeout = null;

      this._scheduleFastFactCheck();
    }, 100);
  }

  _updateFastFactIfNecessary(): void {
    const now = performance.now();
    if (now - this._textChangedAt < fastFactRotationInterval) {
      return;
    }
    if (!this._fastFactsQueued.length) {
      return;
    }

    const fastFactIndex = Math.floor(Math.random() * this._fastFactsQueued.length);
    this._scheduleTextChange(
        i18nString(UIStrings.fastFactMessageWithPlaceholder, {PH1: this._fastFactsQueued[fastFactIndex]}));
    this._fastFactsQueued.splice(fastFactIndex, 1);
  }

  _commitTextChange(text: string): void {
    if (!this._statusText) {
      return;
    }
    this._textChangedAt = performance.now();
    this._statusText.textContent = text;
  }

  _scheduleTextChange(text: string): void {
    if (this._scheduledTextChangeTimeout) {
      clearTimeout(this._scheduledTextChangeTimeout);
    }

    const msSinceLastChange = performance.now() - this._textChangedAt;
    const msToTextChange = minimumTextVisibilityDuration - msSinceLastChange;

    this._scheduledTextChangeTimeout = window.setTimeout(() => {
      this._commitTextChange(text);
    }, Math.max(msToTextChange, 0));
  }

  renderBugReport(err: Error): void {
    console.error(err);
    if (this._scheduledFastFactTimeout) {
      window.clearTimeout(this._scheduledFastFactTimeout);
    }

    if (this._scheduledTextChangeTimeout) {
      window.clearTimeout(this._scheduledTextChangeTimeout);
    }

    this._resetProgressBarClasses();

    if (this._progressBar) {
      this._progressBar.classList.add('errored');
    }

    if (this._statusText) {
      this._commitTextChange('');
      UI.UIUtils.createTextChild(this._statusText.createChild('p'), i18nString(UIStrings.ahSorryWeRanIntoAnError));
      if (KnownBugPatterns.some(pattern => pattern.test(err.message))) {
        const message = i18nString(UIStrings.tryToNavigateToTheUrlInAFresh);
        UI.UIUtils.createTextChild(this._statusText.createChild('p'), message);
      } else {
        this._renderBugReportBody(err, this._inspectedURL);
      }
    }
  }

  renderText(statusHeader: string, text: string): void {
    this._renderStatusHeader(statusHeader);
    this._commitTextChange(text);
  }

  toggleCancelButton(show: boolean): void {
    if (this._cancelButton) {
      this._cancelButton.style.visibility = show ? 'visible' : 'hidden';
    }
  }

  _renderBugReportBody(err: Error, auditURL: string): void {
    const chromeVersion = navigator.userAgent.match(/Chrome\/(\S+)/) || ['', 'Unknown'];
    // @ts-ignore Lighthouse sets `friendlyMessage` on certain
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
    if (this._statusText) {
      UI.UIUtils.createTextChild(
          this._statusText.createChild('p'), i18nString(UIStrings.ifThisIssueIsReproduciblePlease));
      UI.UIUtils.createTextChild(this._statusText.createChild('code', 'monospace'), issueBody.trim());
    }
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
  message: string;
  statusMessagePrefix: string;
}

export const StatusPhases: StatusPhase[] = [
  {
    id: 'loading',
    progressBarClass: 'loading',
    message: i18nString(UIStrings.lighthouseIsLoadingThePage),
    statusMessagePrefix: 'Loading page',
  },
  {
    id: 'gathering',
    progressBarClass: 'gathering',
    message: i18nString(UIStrings.lighthouseIsGatheringInformation),
    statusMessagePrefix: 'Gathering',
  },
  {
    id: 'auditing',
    progressBarClass: 'auditing',
    message: i18nString(UIStrings.almostThereLighthouseIsNow),
    statusMessagePrefix: 'Auditing',
  },
];


const LoadingMessages = [
  {
    deviceType: 'mobile',
    throttling: 'on',
    message: i18nString(UIStrings.lighthouseIsLoadingYourPageWith),
  },
  {
    deviceType: 'desktop',
    throttling: 'on',
    message: i18nString(UIStrings.lighthouseIsLoadingYourPageWithThrottling),
  },
  {
    deviceType: 'mobile',
    throttling: 'off',
    message: i18nString(UIStrings.lighthouseIsLoadingYourPageWithMobile),
  },
  {
    deviceType: 'desktop',
    throttling: 'off',
    message: i18nString(UIStrings.lighthouseIsLoadingThePage),
  },
];

const FastFacts = [
  i18nString(UIStrings.mbTakesAMinimumOfSecondsTo),
  i18nString(UIStrings.rebuildingPinterestPagesFor),
  i18nString(UIStrings.byReducingTheResponseSizeOfJson),
  i18nString(UIStrings.walmartSawAIncreaseInRevenueFor),
  i18nString(UIStrings.ifASiteTakesSecondToBecome),
  i18nString(UIStrings.OfGlobalMobileUsersInWereOnGOrG),
  i18nString(UIStrings.theAverageUserDeviceCostsLess),
  i18nString(UIStrings.SecondsIsTheAverageTimeAMobile),
  i18nString(UIStrings.OfMobilePagesTakeNearlySeconds),
  i18nString(UIStrings.asPageLoadTimeIncreasesFromOne),
  i18nString(UIStrings.asTheNumberOfElementsOnAPage),
  i18nString(UIStrings.OfMobilePagesTakeNearlySeconds),
  i18nString(UIStrings.lighthouseOnlySimulatesMobile),
];

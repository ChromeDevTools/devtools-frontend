// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

import {Events, LighthouseController, RuntimeSettings} from './LighthouseController.js';  // eslint-disable-line no-unused-vars

export class StatusView {
  /**
   * @param {!LighthouseController} controller
   */
  constructor(controller) {
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

  _render() {
    const dialogRoot =
        UI.Utils.createShadowRootWithCoreStyles(this._dialog.contentElement, 'lighthouse/lighthouseDialog.css');
    const lighthouseViewElement = dialogRoot.createChild('div', 'lighthouse-view vbox');

    const cancelButton = UI.UIUtils.createTextButton(ls`Cancel`, this._cancel.bind(this));
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

  _reset() {
    this._resetProgressBarClasses();
    clearTimeout(this._scheduledFastFactTimeout);

    this._textChangedAt = 0;
    this._fastFactsQueued = FastFacts.slice();
    this._currentPhase = null;
    this._scheduledTextChangeTimeout = null;
    this._scheduledFastFactTimeout = null;
  }

  /**
   * @param {!Element} dialogRenderElement
   */
  show(dialogRenderElement) {
    this._reset();
    this.updateStatus(ls`Loading…`);

    const parsedURL = Common.ParsedURL.ParsedURL.fromString(this._inspectedURL);
    const pageHost = parsedURL && parsedURL.host;
    const statusHeader = pageHost ? ls`Auditing ${pageHost}` : ls`Auditing your web page`;
    this._renderStatusHeader(statusHeader);
    this._dialog.show(dialogRenderElement);
  }

  /**
   * @param {string=} statusHeader
   */
  _renderStatusHeader(statusHeader) {
    this._statusHeader.textContent = `${statusHeader}…`;
  }

  hide() {
    if (this._dialog.isShowing()) {
      this._dialog.hide();
    }
  }

  /**
   * @param {string=} url
   */
  setInspectedURL(url = '') {
    this._inspectedURL = url;
  }

  /**
   * @param {?string} message
   */
  updateStatus(message) {
    if (!message || !this._statusText) {
      return;
    }

    if (message.startsWith('Cancel')) {
      this._commitTextChange(Common.UIString.UIString('Cancelling…'));
      clearTimeout(this._scheduledFastFactTimeout);
      return;
    }

    const nextPhase = this._getPhaseForMessage(message);
    const nextPhaseIndex = StatusPhases.indexOf(nextPhase);
    const currentPhaseIndex = StatusPhases.indexOf(this._currentPhase);
    if (!nextPhase && !this._currentPhase) {
      this._commitTextChange(Common.UIString.UIString('Lighthouse is warming up…'));
      clearTimeout(this._scheduledFastFactTimeout);
    } else if (nextPhase && (!this._currentPhase || currentPhaseIndex < nextPhaseIndex)) {
      this._currentPhase = nextPhase;
      const text = this._getMessageForPhase(nextPhase);
      this._scheduleTextChange(text);
      this._scheduleFastFactCheck();
      this._resetProgressBarClasses();
      this._progressBar.classList.add(nextPhase.progressBarClass);
      UI.ARIAUtils.setProgressBarValue(this._progressBar, nextPhaseIndex, text);
    }
  }

  _cancel() {
    this._controller.dispatchEventToListeners(Events.RequestLighthouseCancel);
  }

  /**
   * @param {!StatusPhases} phase
   * @return {string}
   */
  _getMessageForPhase(phase) {
    if (phase.message) {
      return phase.message;
    }

    const deviceType = RuntimeSettings.find(item => item.setting.name === 'lighthouse.device_type').setting.get();
    const throttling = RuntimeSettings.find(item => item.setting.name === 'lighthouse.throttling').setting.get();
    const match = LoadingMessages.find(item => {
      return item.deviceType === deviceType && item.throttling === throttling;
    });

    return match ? match.message : ls`Lighthouse is loading your page`;
  }

  /**
   * @param {string} message
   * @return {?StatusPhases}
   */
  _getPhaseForMessage(message) {
    return StatusPhases.find(phase => message.startsWith(phase.statusMessagePrefix));
  }

  _resetProgressBarClasses() {
    if (!this._progressBar) {
      return;
    }

    this._progressBar.className = 'lighthouse-progress-bar';
  }

  _scheduleFastFactCheck() {
    if (!this._currentPhase || this._scheduledFastFactTimeout) {
      return;
    }

    this._scheduledFastFactTimeout = setTimeout(() => {
      this._updateFastFactIfNecessary();
      this._scheduledFastFactTimeout = null;

      this._scheduleFastFactCheck();
    }, 100);
  }

  _updateFastFactIfNecessary() {
    const now = performance.now();
    if (now - this._textChangedAt < fastFactRotationInterval) {
      return;
    }
    if (!this._fastFactsQueued.length) {
      return;
    }

    const fastFactIndex = Math.floor(Math.random() * this._fastFactsQueued.length);
    this._scheduleTextChange(ls`\ud83d\udca1 ${this._fastFactsQueued[fastFactIndex]}`);
    this._fastFactsQueued.splice(fastFactIndex, 1);
  }

  /**
   * @param {string} text
   */
  _commitTextChange(text) {
    if (!this._statusText) {
      return;
    }
    this._textChangedAt = performance.now();
    this._statusText.textContent = text;
  }

  /**
   * @param {string} text
   */
  _scheduleTextChange(text) {
    if (this._scheduledTextChangeTimeout) {
      clearTimeout(this._scheduledTextChangeTimeout);
    }

    const msSinceLastChange = performance.now() - this._textChangedAt;
    const msToTextChange = minimumTextVisibilityDuration - msSinceLastChange;

    this._scheduledTextChangeTimeout = setTimeout(() => {
      this._commitTextChange(text);
    }, Math.max(msToTextChange, 0));
  }

  /**
   * @param {!Error} err
   */
  renderBugReport(err) {
    console.error(err);
    clearTimeout(this._scheduledFastFactTimeout);
    clearTimeout(this._scheduledTextChangeTimeout);
    this._resetProgressBarClasses();
    this._progressBar.classList.add('errored');

    this._commitTextChange('');
    this._statusText.createChild('p').createTextChild(Common.UIString.UIString('Ah, sorry! We ran into an error.'));
    if (KnownBugPatterns.some(pattern => pattern.test(err.message))) {
      const message = Common.UIString.UIString(
          'Try to navigate to the URL in a fresh Chrome profile without any other tabs or extensions open and try again.');
      this._statusText.createChild('p').createTextChild(message);
    } else {
      this._renderBugReportBody(err, this._inspectedURL);
    }
  }

  /**
   * @param {string} statusHeader
   * @param {string} text
   */
  renderText(statusHeader, text) {
    this._renderStatusHeader(statusHeader);
    this._commitTextChange(text);
  }

  /**
   * @param {boolean} show
   */
  toggleCancelButton(show) {
    this._cancelButton.style.visibility = show ? 'visible' : 'hidden';
  }

  /**
   * @param {!Error} err
   * @param {string} auditURL
   */
  _renderBugReportBody(err, auditURL) {
    const issueBody = `
${err.message}
\`\`\`
Channel: DevTools
Initial URL: ${auditURL}
Chrome Version: ${navigator.userAgent.match(/Chrome\/(\S+)/)[1]}
Stack Trace: ${err.stack}
\`\`\`
`;
    this._statusText.createChild('p').createTextChild(
        ls`If this issue is reproducible, please report it at the Lighthouse GitHub repo.`);
    this._statusText.createChild('code', 'monospace').createTextChild(issueBody.trim());
  }
}

/** @const */
export const fastFactRotationInterval = 6000;

/** @const */
export const minimumTextVisibilityDuration = 3000;

/** @type {!Array.<!RegExp>} */
const KnownBugPatterns = [
  /PARSING_PROBLEM/,
  /DOCUMENT_REQUEST/,
  /READ_FAILED/,
  /TRACING_ALREADY_STARTED/,
  /^You must provide a url to the runner/,
  /^You probably have multiple tabs open/,
];

/** @typedef {{message: string, progressBarClass: string}} */
export const StatusPhases = [
  {
    id: 'loading',
    progressBarClass: 'loading',
    statusMessagePrefix: 'Loading page',
  },
  {
    id: 'gathering',
    progressBarClass: 'gathering',
    message: ls`Lighthouse is gathering information about the page to compute your score.`,
    statusMessagePrefix: 'Gathering',
  },
  {
    id: 'auditing',
    progressBarClass: 'auditing',
    message: ls`Almost there! Lighthouse is now generating your report.`,
    statusMessagePrefix: 'Auditing',
  }
];

/** @typedef {{message: string, deviceType: string, throttling: string}} */
const LoadingMessages = [
  {
    deviceType: 'mobile',
    throttling: 'on',
    message: ls`Lighthouse is loading your page with throttling to measure performance on a mobile device on 3G.`,
  },
  {
    deviceType: 'desktop',
    throttling: 'on',
    message: ls`Lighthouse is loading your page with throttling to measure performance on a slow desktop on 3G.`,
  },
  {
    deviceType: 'mobile',
    throttling: 'off',
    message: ls`Lighthouse is loading your page with mobile emulation.`,
  },
  {
    deviceType: 'desktop',
    throttling: 'off',
    message: ls`Lighthouse is loading your page.`,
  },
];

const FastFacts = [
  ls
`1MB takes a minimum of 5 seconds to download on a typical 3G connection [Source: WebPageTest and DevTools 3G definition].`,
    ls`Rebuilding Pinterest pages for performance increased conversion rates by 15% [Source: WPO Stats]`, ls
`By reducing the response size of JSON needed for displaying comments, Instagram saw increased impressions [Source: WPO Stats]`,
    ls`Walmart saw a 1% increase in revenue for every 100ms improvement in page load [Source: WPO Stats]`, ls
`If a site takes >1 second to become interactive, users lose attention, and their perception of completing the page task is broken [Source: Google Developers Blog]`,
    ls`75% of global mobile users in 2016 were on 2G or 3G [Source: GSMA Mobile]`,
    ls`The average user device costs less than 200 USD. [Source: International Data Corporation]`, ls
`19 seconds is the average time a mobile web page takes to load on a 3G connection [Source: Google DoubleClick blog]`,
    ls
`70% of mobile pages take nearly 7 seconds for the visual content above the fold to display on the screen. [Source: Think with Google]`,
    ls
`As page load time increases from one second to seven seconds, the probability of a mobile site visitor bouncing increases 113%. [Source: Think with Google]`,
    ls
`As the number of elements on a page increases from 400 to 6,000, the probability of conversion drops 95%. [Source: Think with Google]`,
    ls`70% of mobile pages weigh over 1MB, 36% over 2MB, and 12% over 4MB. [Source: Think with Google]`, ls
  `Lighthouse only simulates mobile performance; to measure performance on a real device, try WebPageTest.org [Source: Lighthouse team]`,
];

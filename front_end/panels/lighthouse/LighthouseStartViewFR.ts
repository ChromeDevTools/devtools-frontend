// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as Platform from '../../core/platform/platform.js';

import {StartView} from './LighthouseStartView.js';
import {Events} from './LighthouseController.js';

const UIStrings = {
  /**
   * @description Text displayed as the title of a panel that can be used to audit a web page with Lighthouse.
   */
  generateLighthouseReport: 'Generate a Lighthouse report',
  /**
   * @description Text that refers to the Lighthouse mode
   */
  mode: 'Mode',
  /**
   * @description Title in the Lighthouse Start View for list of categories to run during audit
   */
  categories: 'Categories',
  /**
   * @description Title in the Lighthouse Start View for list of available start plugins
   */
  plugins: 'Plugins',
  /**
   * @description Label for a button to start analyzing a page navigation with Lighthouse
   */
  analyzeNavigation: 'Analyze page load',
  /**
   * @description Label for a button to start analyzing the current page state with Lighthouse
   */
  analyzeSnapshot: 'Analyze page state',
  /**
   * @description Label for a button that starts a Lighthouse mode that analyzes user interactions over a period of time.
   */
  startTimespan: 'Start timespan',
};

const str_ = i18n.i18n.registerUIStrings('panels/lighthouse/LighthouseStartViewFR.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class StartViewFR extends StartView {
  protected render(): void {
    super.render();
    const fragment = UI.Fragment.Fragment.build`
<form class="lighthouse-start-view-fr">
  <header class="hbox">
    <div class="lighthouse-logo"></div>
    <div class="lighthouse-title">${i18nString(UIStrings.generateLighthouseReport)}</div>
    <div class="lighthouse-start-button-container">${this.startButton}</div>
  </header>
  <div $="help-text" class="lighthouse-help-text hidden"></div>
  <div class="lighthouse-options hbox">
    <div class="lighthouse-form-section">
      <div class="lighthouse-form-elements" $="mode-form-elements"></div>
    </div>
    <div class="lighthouse-form-section">
      <div class="lighthouse-form-elements" $="device-type-form-elements"></div>
    </div>
    <div class="lighthouse-form-categories">
      <div class="lighthouse-form-section">
        <div class="lighthouse-form-section-label">${i18nString(UIStrings.categories)}</div>
        <div class="lighthouse-form-elements" $="categories-form-elements"></div>
      </div>
      <div class="lighthouse-form-section">
        <div class="lighthouse-form-section-label">
          <div class="lighthouse-icon-label">${i18nString(UIStrings.plugins)}</div>
        </div>
        <div class="lighthouse-form-elements" $="plugins-form-elements"></div>
      </div>
    </div>
  </div>
  <div $="warning-text" class="lighthouse-warning-text hidden"></div>
</form>
    `;

    this.helpText = fragment.$('help-text');
    this.warningText = fragment.$('warning-text');

    // The previous radios are removed later and don't exist on the new fragment yet.
    this.populateFormControls(fragment);

    // Populate the Lighthouse mode
    const modeFormElements = fragment.$('mode-form-elements');
    this.populateRuntimeSettingAsRadio('lighthouse.mode', i18nString(UIStrings.mode), modeFormElements);

    this.contentElement.textContent = '';
    this.contentElement.append(fragment.element());
    this.updateMode();
  }

  onResize(): void {
    const useNarrowLayout = this.contentElement.offsetWidth < 500;
    const useWideLayout = this.contentElement.offsetWidth > 800;
    const headerEl = this.contentElement.querySelector('.lighthouse-start-view-fr header');
    const optionsEl = this.contentElement.querySelector('.lighthouse-options');
    if (headerEl) {
      headerEl.classList.toggle('hbox', !useNarrowLayout);
      headerEl.classList.toggle('vbox', useNarrowLayout);
    }
    if (optionsEl) {
      optionsEl.classList.toggle('wide', useWideLayout);
      optionsEl.classList.toggle('narrow', useNarrowLayout);
    }
  }

  updateMode(): void {
    const {mode} = this.controller.getFlags();

    let buttonLabel: Platform.UIString.LocalizedString;
    let callback: () => void;

    if (mode === 'timespan') {
      buttonLabel = i18nString(UIStrings.startTimespan);
      callback = (): void => {
        this.controller.dispatchEventToListeners(
            Events.RequestLighthouseTimespanStart,
            /* keyboardInitiated */ this.startButton.matches(':focus-visible'),
        );
      };
    } else if (mode === 'snapshot') {
      buttonLabel = i18nString(UIStrings.analyzeSnapshot);
      callback = (): void => {
        this.controller.dispatchEventToListeners(
            Events.RequestLighthouseStart,
            /* keyboardInitiated */ this.startButton.matches(':focus-visible'),
        );
      };
    } else {
      buttonLabel = i18nString(UIStrings.analyzeNavigation);
      callback = (): void => {
        this.controller.dispatchEventToListeners(
            Events.RequestLighthouseStart,
            /* keyboardInitiated */ this.startButton.matches(':focus-visible'),
        );
      };
    }

    this.startButton = UI.UIUtils.createTextButton(
        buttonLabel,
        callback,
        /* className */ '',
        /* primary */ true,
    );

    const startButtonContainerEl = this.contentElement.querySelector('.lighthouse-start-button-container');
    if (startButtonContainerEl) {
      startButtonContainerEl.textContent = '';
      startButtonContainerEl.appendChild(this.startButton);
    }
  }
}

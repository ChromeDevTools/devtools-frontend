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
   * @description Text that refers to the Lighthouse mode
   */
  mode: 'Mode',
  /**
   * @description Label for a button to start analyzing a page navigation with Lighthouse
   */
  analyzeNavigation: 'Analyze navigation',
  /**
   * @description Label for a button to start analyzing the current page state with Lighthouse
   */
  analyzeSnapshot: 'Analyze snapshot',
  /**
   * @description Label for a button that ends a Lighthouse timespan
   */
  startTimespan: 'Start timespan',
};

const str_ = i18n.i18n.registerUIStrings('panels/lighthouse/LighthouseStartViewFR.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class StartViewFR extends StartView {
  protected render(): void {
    super.render();
    const fragment = UI.Fragment.Fragment.build`
  <div class="lighthouse-form-section">
  <div class="lighthouse-form-section-label">
  ${i18nString(UIStrings.mode)}
  </div>
  <div class="lighthouse-form-elements" $="mode-form-elements"></div>
  </div>
    `;

    // Populate the Lighthouse mode
    const modeFormElements = fragment.$('mode-form-elements');
    this.populateRuntimeSettingAsRadio('lighthouse.mode', i18nString(UIStrings.mode), modeFormElements);

    const form = this.contentElement.querySelector('form');
    form?.appendChild(fragment.element());
    this.updateStartButton();
  }

  updateStartButton(): void {
    const {mode} = this.controller.getFlags();

    let label: Platform.UIString.LocalizedString;
    let callback: () => void;

    if (mode === 'timespan') {
      label = i18nString(UIStrings.startTimespan);
      callback = (): void => {
        this.controller.dispatchEventToListeners(
            Events.RequestLighthouseTimespanStart,
            /* keyboardInitiated */ this.startButton.matches(':focus-visible'),
        );
      };
    } else if (mode === 'snapshot') {
      label = i18nString(UIStrings.analyzeSnapshot);
      callback = (): void => {
        this.controller.dispatchEventToListeners(
            Events.RequestLighthouseStart,
            /* keyboardInitiated */ this.startButton.matches(':focus-visible'),
        );
      };
    } else {
      label = i18nString(UIStrings.analyzeNavigation);
      callback = (): void => {
        this.controller.dispatchEventToListeners(
            Events.RequestLighthouseStart,
            /* keyboardInitiated */ this.startButton.matches(':focus-visible'),
        );
      };
    }

    this.startButton = UI.UIUtils.createTextButton(
        label,
        callback,
        /* className */ '',
        /* primary */ true,
    );

    const startButtonContainer = this.contentElement.querySelector('.lighthouse-start-button-container');
    if (startButtonContainer) {
      startButtonContainer.textContent = '';
      startButtonContainer.appendChild(this.startButton);
    }
  }
}

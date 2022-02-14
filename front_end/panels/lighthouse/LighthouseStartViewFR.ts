// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';

import {StartView} from './LighthouseStartView.js';

const UIStrings = {
  /**
   * @description Text that refers to the Lighthouse mode
   */
  mode: 'Mode',
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
  }
}

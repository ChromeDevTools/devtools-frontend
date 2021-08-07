// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';

import cssOverviewStartViewStyles from './cssOverviewStartView.css.js';

import type {OverviewController} from './CSSOverviewController.js';
import {Events} from './CSSOverviewController.js';

const UIStrings = {
  /**
  *@description Label for the capture button in the CSS Overview Panel
  */
  captureOverview: 'Capture overview',
  /**
  *@description Title of the CSS Overview Panel
  */
  cssOverview: 'CSS Overview',
};
const str_ = i18n.i18n.registerUIStrings('panels/css_overview/CSSOverviewStartView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class CSSOverviewStartView extends UI.Widget.Widget {
  private readonly controller: OverviewController;
  constructor(controller: OverviewController) {
    super();

    this.controller = controller;
    this.render();
  }

  private render(): void {
    const startButton = UI.UIUtils.createTextButton(
        i18nString(UIStrings.captureOverview),
        () => this.controller.dispatchEventToListeners(Events.RequestOverviewStart), '', true /* primary */);

    this.setDefaultFocusedElement(startButton);

    const fragment = UI.Fragment.Fragment.build`
  <div class="vbox overview-start-view">
  <h1>${i18nString(UIStrings.cssOverview)}</h1>
  <div>${startButton}</div>
  </div>
  `;

    this.contentElement.appendChild(fragment.element());
    this.contentElement.style.overflow = 'auto';
  }
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([cssOverviewStartViewStyles]);
  }
}

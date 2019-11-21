// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
export default class CSSOverviewProcessingView extends UI.Widget {
  constructor(controller) {
    super();
    this.registerRequiredCSS('css_overview/cssOverviewProcessingView.css');

    this._formatter = new Intl.NumberFormat('en-US');
    this._controller = controller;
    this._render();
  }

  _render() {
    const cancelButton = UI.createTextButton(
        ls`Cancel`, () => this._controller.dispatchEventToListeners(CssOverview.Events.RequestOverviewCancel), '',
        true /* primary */);
    this.setDefaultFocusedElement(cancelButton);

    this.fragment = UI.Fragment.build`
      <div class="vbox overview-processing-view">
        <h1>Processing page</h1>
        <div>${cancelButton}</div>
      </div>
    `;

    this.contentElement.appendChild(this.fragment.element());
    this.contentElement.style.overflow = 'auto';
  }
}

/* Legacy exported object */
self.CssOverview = self.CssOverview || {};

/* Legacy exported object */
CssOverview = CssOverview || {};

/**
 * @constructor
 */
CssOverview.CSSOverviewProcessingView = CSSOverviewProcessingView;

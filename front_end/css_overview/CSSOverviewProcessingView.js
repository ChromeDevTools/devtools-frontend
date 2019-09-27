// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
CssOverview.CSSOverviewProcessingView = class extends UI.Widget {
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

        <h2 $="processed"></h2>
      </div>
    `;

    this.contentElement.appendChild(this.fragment.element());
    this.contentElement.style.overflow = 'auto';
  }

  setElementsHandled(handled = 0, total = 0) {
    // TODO(aerotwist): We might want to switch this to using Intl.PluralRules in the future
    // @see https://v8.dev/features/intl-pluralrules
    const elementsTotal = total > 0 ? ls`document elements` : ls`document element`;
    this.fragment.$('processed').textContent =
        ls`Processed ${this._formatter.format(handled)} of ${this._formatter.format(total)} ${elementsTotal}.`;
  }
};

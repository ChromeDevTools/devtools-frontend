// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';

const UIStrings = {
  /**
  *@description Text to indicate that there are no breakpoints
  */
  noBreakpoints: 'No breakpoints',
};

const str_ = i18n.i18n.registerUIStrings('panels/sources/BreakpointsSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let breakpointsSidebarPaneInstance: BreakpointsSidebarPane;

export class BreakpointsSidebarPane extends UI.ThrottledWidget.ThrottledWidget {
  readonly #noBreakpointsView: HTMLElement;

  static instance(): BreakpointsSidebarPane {
    if (!breakpointsSidebarPaneInstance) {
      breakpointsSidebarPaneInstance = new BreakpointsSidebarPane();
    }
    return breakpointsSidebarPaneInstance;
  }

  constructor() {
    super(true);

    this.#noBreakpointsView = this.contentElement.createChild('div', 'gray-info-message');
    this.#noBreakpointsView.textContent = i18nString(UIStrings.noBreakpoints);
    this.#noBreakpointsView.tabIndex = -1;
  }
}

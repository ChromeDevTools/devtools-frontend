// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';

import cssOverviewProcessingViewStyles from './cssOverviewProcessingView.css.js';

const UIStrings = {
  /**
   * @description Text to cancel something
   */
  cancel: 'Cancel',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/css_overview/CSSOverviewProcessingView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ViewInput {
  onCancel: () => void;
}

type View = (input: ViewInput, output: object, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <style>${cssOverviewProcessingViewStyles}</style>
    <div style="overflow:auto">
      <div class="vbox overview-processing-view">
        <h1>Processing page</h1>
        <div>
          <devtools-button
              @click=${input.onCancel}
              .jslogContext=${'css-overview.cancel-processing'}
              .variant=${Buttons.Button.Variant.OUTLINED}>${i18nString(UIStrings.cancel)}</devtools-button>
        </div>
      </div>
    </div>`,
    target);
  // clang-format on
};

export class CSSOverviewProcessingView extends UI.Widget.Widget {
  #onCancel = (): void => {};
  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
    this.requestUpdate();
  }

  set onCancel(onCancel: () => void) {
    this.#onCancel = onCancel;
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view({onCancel: this.#onCancel}, {}, this.element);
  }
}

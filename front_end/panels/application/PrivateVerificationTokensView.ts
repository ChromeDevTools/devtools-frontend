// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import privateVerificationTokensViewStyles from './privateVerificationTokensView.css.js';

const UIStrings = {
  /**
   * @description Empty state message when no private verification tokens match the current origin.
   */
  noPrivateVerificationTokens: 'No private verification tokens for this origin',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/PrivateVerificationTokensView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export type ViewInput = Record<string, never>;

type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (_input, _output, target) => {
  // clang-format off
  render(html`
    <style>${privateVerificationTokensViewStyles}</style>
    <style>${UI.inspectorCommonStyles}</style>
    <div class="pvt-view" jslog=${VisualLogging.pane('private-verification-tokens')}>
      <div class="empty-state">${i18nString(UIStrings.noPrivateVerificationTokens)}</div>
    </div>
  `, target);
  // clang-format on
};

export class PrivateVerificationTokensView extends UI.Widget.VBox {
  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view({}, undefined, this.contentElement);
  }
}

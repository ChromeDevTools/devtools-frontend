// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/kit/kit.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import {html, type LitTemplate, render} from '../../../ui/lit/lit.js';

import cssHintDetailsViewStyles from './cssHintDetailsView.css.js';

const UIStrings = {
  /**
   * @description Text for button that redirects to CSS property documentation.
   */
  learnMore: 'Learn more',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/CSSHintDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface Hint {
  getMessage(): LitTemplate|string;
  getPossibleFixMessage(): LitTemplate|string|null;
  getLearnMoreLink(): string|undefined;
}

export interface ViewInput {
  authoringHint?: Hint;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  if (!input.authoringHint) {
    return;
  }
  const link = input.authoringHint.getLearnMoreLink();
  // clang-format off
  render(html`
    <style>${cssHintDetailsViewStyles}</style>
    <div class="hint-popup-wrapper">
      <div class="hint-popup-reason">
        ${input.authoringHint.getMessage()}
      </div>
      ${input.authoringHint.getPossibleFixMessage() ? html`
          <div class="hint-popup-possible-fix">
              ${input.authoringHint.getPossibleFixMessage()}
          </div>
      ` : ''}
      ${link ? html`
                  <div class="footer">
                    <devtools-link id="learn-more" href=${link} class="clickable underlined unbreakable-text">
                        ${i18nString(UIStrings.learnMore)}
                    </devtools-link>
                  </div>
              `: ''}
    </div>
  `, target, {container: {classes: ['css-hint-details-view']}});
  // clang-format on
};

export class CSSHintDetailsView extends UI.Widget.Widget {
  #authoringHint?: Hint;
  readonly #view: View;

  constructor(authoringHint?: Hint, element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#authoringHint = authoringHint;
    this.#view = view;
    this.performUpdate();
  }

  set authoringHint(authoringHint: Hint) {
    if (this.#authoringHint === authoringHint) {
      return;
    }
    this.#authoringHint = authoringHint;
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view({authoringHint: this.#authoringHint}, undefined, this.contentElement);
  }
}

// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/tooltips/tooltips.js';

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import consoleInsightTeaserStyles from './consoleInsightTeaser.css.js';
import type {ConsoleViewMessage} from './ConsoleViewMessage.js';

const {render, html} = Lit;

const UIStringsNotTranslate = {
  /**
   * @description Header text during loading state while an AI summary is being generated
   */
  summarizing: 'Summarizing…',
  /**
   * @description Label for an animation shown while an AI response is being generated
   */
  loading: 'Loading',
} as const;

const lockedString = i18n.i18n.lockedString;

interface ViewInput {
  // If multiple ConsoleInsightTeasers exist, each one needs a unique id. Otherwise showing and
  // hiding of the tooltip, and rendering the loading animation, does not work correctly.
  uuid: String;
  isInactive: boolean;
}

export const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  if (input.isInactive) {
    render(Lit.nothing, target);
    return;
  }

  // clang-format off
  render(html`
    <style>${consoleInsightTeaserStyles}</style>
    <devtools-tooltip
      id=${'teaser-' + input.uuid}
      hover-delay=500
      variant="rich"
      vertical-distance-increase=-6
      prefer-span-left
    >
      <div class="teaser-tooltip-container">
        <h2 tabindex="-1">${lockedString(UIStringsNotTranslate.summarizing)}</h2>
        <div
          role="presentation"
          aria-label=${lockedString(UIStringsNotTranslate.loading)}
          class="loader"
          style="clip-path: url(${'#clipPath-' + input.uuid});"
        >
          <svg width="100%" height="52">
            <defs>
            <clipPath id=${'clipPath-' + input.uuid}>
              <rect x="0" y="0" width="100%" height="12" rx="8"></rect>
              <rect x="0" y="20" width="100%" height="12" rx="8"></rect>
              <rect x="0" y="40" width="100%" height="12" rx="8"></rect>
            </clipPath>
          </defs>
          </svg>
        </div>
      </div>
    </devtools-tooltip>
  `, target);
  // clang-format on
};

export type View = typeof DEFAULT_VIEW;

export class ConsoleInsightTeaser extends UI.Widget.Widget {
  #view: View;
  #uuid: String;
  #isInactive = false;

  constructor(uuid: String, consoleViewMessage: ConsoleViewMessage, element?: HTMLElement, view?: View) {
    super(element);
    this.#view = view ?? DEFAULT_VIEW;
    this.#uuid = uuid;
    this.requestUpdate();
  }

  setInactive(isInactive: boolean): void {
    if (this.#isInactive === isInactive) {
      return;
    }
    this.#isInactive = isInactive;
    this.requestUpdate();
  }

  override performUpdate(): Promise<void>|void {
    this.#view(
        {
          uuid: this.#uuid,
          isInactive: this.#isInactive,
        },
        undefined, this.contentElement);
  }
}

// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import editableSpanStyles from './EditableSpan.css.js';

export interface ViewInput {
  value: string;
  onInput: (value: string) => void;
}

export interface ViewOutput {
  focus?: () => void;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target): void => {
  const onFocusIn = (event: Event): void => {
    const span = event.target as HTMLElement;
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(span);
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      (event.target as HTMLElement)?.blur();
    }
  };

  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
  render(html`
    <style>${editableSpanStyles}</style>
    <span
      ${Directives.ref(el => {
        if (el instanceof HTMLElement) {
          output.focus = () => el.focus();
        } else {
          output.focus = undefined;
        }
      })}
      contenteditable="plaintext-only"
      class="editable"
      tabindex="0"
      .innerText=${Directives.live(input.value)}
      jslog=${VisualLogging.value('header-editor').track({change: true, keydown: 'Enter|Escape'})}
      @focusin=${onFocusIn}
      @keydown=${onKeyDown}
      @input=${(event: Event) => input.onInput((event.target as HTMLElement).innerText)}
      ></span>`, target);
  // clang-format on
};

export class EditableSpan extends UI.Widget.Widget {
  readonly #view: View;
  readonly #viewOutput: ViewOutput = {};
  #value = '';

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  get value(): string {
    return this.#value;
  }

  set value(value: string) {
    if (this.#value === value) {
      return;
    }
    this.#value = value;
    this.requestUpdate();
  }

  #onInput = (value: string): void => {
    this.#value = value;
  };

  override performUpdate(): void {
    const viewInput: ViewInput = {
      value: this.#value,
      onInput: this.#onInput,
    };
    this.#view(viewInput, this.#viewOutput, this.contentElement);
  }

  override focus(): void {
    // Wait for any scheduled UI.Widget/Lit update to finish rendering before focusing.
    void this.updateComplete.then(() => {
      this.#viewOutput.focus?.();
    });
  }
}

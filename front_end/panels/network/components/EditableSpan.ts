// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
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

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement|ShadowRoot) => void;

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

export class EditableSpan extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #view: View = DEFAULT_VIEW;
  readonly #viewOutput: ViewOutput = {};
  #value = '';

  get value(): string {
    return this.#value;
  }

  set value(value: string) {
    this.#value = value;
    this.performUpdate();
  }

  #onInput = (value: string): void => {
    this.#value = value;
  };

  performUpdate(): void {
    const viewInput: ViewInput = {
      value: this.#value,
      onInput: this.#onInput,
    };
    this.#view(viewInput, this.#viewOutput, this.#shadow);
  }

  override focus(): void {
    requestAnimationFrame(() => {
      this.#viewOutput.focus?.();
    });
  }
}

customElements.define('devtools-editable-span', EditableSpan);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-editable-span': EditableSpan;
  }
}

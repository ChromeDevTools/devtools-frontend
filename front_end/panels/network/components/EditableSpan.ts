// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */

import {Directives, html, render} from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import editableSpanStyles from './EditableSpan.css.js';

export class EditableSpan extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #editableRef = Directives.createRef<HTMLElement>();
  #value = '';

  get value(): string {
    return this.#value;
  }

  set value(value: string) {
    this.#value = value;
    this.performUpdate();
  }

  #onKeyDown(event: Event): void {
    if ((event as KeyboardEvent).key === 'Enter') {
      event.preventDefault();
      (event.target as HTMLElement)?.blur();
    }
  }

  #onInput(event: Event): void {
    this.#value = (event.target as HTMLElement).innerText;
  }

  #selectAllText(event: Event): void {
    const target = event.target as HTMLElement;
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(target);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  performUpdate(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>${editableSpanStyles}</style>
      <span
        ${Directives.ref(this.#editableRef)}
        contenteditable="plaintext-only"
        class="editable"
        tabindex="0"
        .innerText=${Directives.live(this.#value)}
        jslog=${VisualLogging.value('header-editor').track({change: true, keydown: 'Enter|Escape'})}
        @focusin=${this.#selectAllText.bind(this)}
        @keydown=${this.#onKeyDown.bind(this)}
        @input=${this.#onInput.bind(this)}
        ></span>`, this.#shadow, {host: this});
    // clang-format on
  }

  override focus(): void {
    requestAnimationFrame(() => {
      this.#editableRef.value?.focus();
    });
  }
}

customElements.define('devtools-editable-span', EditableSpan);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-editable-span': EditableSpan;
  }
}

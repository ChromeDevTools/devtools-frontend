// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import editableSpanStyles from './EditableSpan.css.js';

const {render, html} = LitHtml;

export interface EditableSpanData {
  value: string;
}

export class EditableSpan extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-editable-span`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  #value: string = '';

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [editableSpanStyles];
    this.#shadow.addEventListener('focusin', this.#selectAllText.bind(this));
    this.#shadow.addEventListener('keydown', this.#onKeyDown.bind(this));
    this.#shadow.addEventListener('paste', this.#onPaste.bind(this));
    this.#shadow.addEventListener('input', this.#onInput.bind(this));
  }

  set data(data: EditableSpanData) {
    this.#value = data.value;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  get value(): string {
    return this.#shadow.querySelector<HTMLSpanElement>('span')?.innerText || '';
  }

  set value(value: string) {
    this.#value = value;
    const span = this.#shadow.querySelector<HTMLSpanElement>('span');
    if (span) {
      span.innerText = value;
    }
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

  #onPaste(event: Event): void {
    const clipboardEvent = event as ClipboardEvent;
    event.preventDefault();
    if (clipboardEvent.clipboardData) {
      const text = clipboardEvent.clipboardData.getData('text/plain');
      const range = this.#shadow.getSelection()?.getRangeAt(0);
      if (!range) {
        return;
      }
      range.deleteContents();

      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.selectNodeContents(textNode);
      range.collapse(false);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  #render(): void {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('HeaderSectionRow render was not scheduled');
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`<span contenteditable="true" class="editable" tabindex="0" .innerText=${this.#value}></span>`, this.#shadow, {host: this});
    // clang-format on
  }

  focus(): void {
    requestAnimationFrame(() => {
      const span = this.#shadow.querySelector<HTMLElement>('.editable');
      span?.focus();
    });
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-editable-span', EditableSpan);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-editable-span': EditableSpan;
  }
}

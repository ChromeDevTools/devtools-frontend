// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import * as Platform from '../../../core/platform/platform.js';
import {html, render} from '../../lit/lit.js';

import textPromptStyles from './textPrompt.css.js';

export interface TextPromptData {
  ariaLabel: string;
  prefix: string;
  suggestion: string;
}

export class PromptInputEvent extends Event {
  static readonly eventName = 'promptinputchanged';
  data: string;

  constructor(value: string) {
    super(PromptInputEvent.eventName);
    this.data = value;
  }
}

export class TextPrompt extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #ariaLabelText = '';
  #prefixText = '';
  #suggestionText = '';

  set data(data: TextPromptData) {
    this.#ariaLabelText = data.ariaLabel;
    this.#prefixText = data.prefix;
    this.#suggestionText = data.suggestion;
    this.#render();
  }

  get data(): TextPromptData {
    return {
      ariaLabel: this.#ariaLabelText,
      prefix: this.#prefixText,
      suggestion: this.#suggestionText,
    };
  }

  override focus(): void {
    this.#input().focus();
  }

  #input(): HTMLInputElement {
    const inputElement = this.#shadow.querySelector<HTMLInputElement>('.input');
    if (!inputElement) {
      throw new Error('Expected an input element!');
    }
    return inputElement;
  }

  moveCaretToEndOfInput(): void {
    this.setSelectedRange(this.#text().length, this.#text().length);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === Platform.KeyboardUtilities.ENTER_KEY) {
      event.preventDefault();
    }
  }

  setSelectedRange(startIndex: number, endIndex: number): void {
    if (startIndex < 0) {
      throw new RangeError('Selected range start must be a nonnegative integer');
    }
    const textContentLength = this.#text().length;
    if (endIndex > textContentLength) {
      endIndex = textContentLength;
    }
    if (endIndex < startIndex) {
      endIndex = startIndex;
    }
    this.#input().setSelectionRange(startIndex, endIndex);
  }

  setPrefix(prefix: string): void {
    this.#prefixText = prefix;
    this.#render();
  }

  setSuggestion(suggestion: string): void {
    this.#suggestionText = suggestion;
    this.#suggestion().value = this.#suggestionText;
    this.#render();
  }

  setText(text: string): void {
    this.#input().value = text;

    if (this.#input().hasFocus()) {
      this.moveCaretToEndOfInput();
      this.#input().scrollIntoView();
    }
  }

  #suggestion(): HTMLInputElement {
    const suggestionElement = this.#shadow.querySelector<HTMLInputElement>('.suggestion');
    if (!suggestionElement) {
      throw new Error('Expected an suggestion element!');
    }
    return suggestionElement;
  }

  #text(): string {
    return this.#input().value || '';
  }

  connectedCallback(): void {
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'dir') {
          const writingDirection = this.#input().getAttribute('dir');
          if (!writingDirection) {
            this.#suggestion().removeAttribute('dir');
            return;
          }
          this.#suggestion().setAttribute('dir', writingDirection);
        }
      }
    });
    observer.observe(this.#input(), {attributeFilter: ['dir']});
  }

  #render(): void {
    // clang-format off
    const output = html`
      <style>${textPromptStyles}</style>
      <span class="prefix">${this.#prefixText} </span>
      <span class="text-prompt-input">
        <input
            class="input" aria-label=${this.#ariaLabelText} spellcheck="false"
            @input=${() => this.dispatchEvent(new PromptInputEvent(this.#text()))}
            @keydown=${this.onKeyDown}>
        <input class="suggestion" tabindex=-1 aria-label=${this.#ariaLabelText + ' Suggestion'}>
      </span>`;
    // clang-format on
    render(output, this.#shadow, {host: this});
  }
}

customElements.define('devtools-text-prompt', TextPrompt);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-text-prompt': TextPrompt;
  }

  interface HTMLElementEventMap {
    promptinputchanged: PromptInputEvent;
  }
}

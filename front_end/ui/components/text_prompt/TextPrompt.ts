// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as ComponentHelpers from '../../components/helpers/helpers.js';
import * as LitHtml from '../../lit-html/lit-html.js';

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
  static readonly litTagName = LitHtml.literal`devtools-text-prompt`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #ariaLabelText = '';
  #prefixText = '';
  #suggestionText = '';

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [textPromptStyles];
  }

  set data(data: TextPromptData) {
    this.#ariaLabelText = data.ariaLabel;
    this.#prefixText = data.prefix;
    this.#suggestionText = data.suggestion;
    this.render();
  }

  get data(): TextPromptData {
    return {
      ariaLabel: this.#ariaLabelText,
      prefix: this.#prefixText,
      suggestion: this.#suggestionText,
    };
  }

  focus(): void {
    this.input().focus();
  }

  private input(): HTMLInputElement {
    const inputElement = this.#shadow.querySelector<HTMLInputElement>('input');
    if (!inputElement) {
      throw new Error('Expected an input element!');
    }
    return inputElement;
  }

  moveCaretToEndOfInput(): void {
    this.setSelectedRange(this.text().length, this.text().length);
  }

  onInput(): void {
    this.suggestion().textContent = this.text();
    this.dispatchEvent(new PromptInputEvent(this.text().trim()));
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
    const textContentLength = this.text().length;
    if (endIndex > textContentLength) {
      endIndex = textContentLength;
    }
    if (endIndex < startIndex) {
      endIndex = startIndex;
    }
    this.input().setSelectionRange(startIndex, endIndex);
  }

  setPrefix(prefix: string): void {
    this.#prefixText = prefix;
    this.render();
  }

  setSuggestion(suggestion: string): void {
    this.#suggestionText = suggestion;
    this.render();
  }

  setText(text: string): void {
    this.input().value = text;
    this.suggestion().textContent = this.text();

    if (this.input().hasFocus()) {
      this.moveCaretToEndOfInput();
      this.input().scrollIntoView();
    }
  }

  private suggestion(): HTMLSpanElement {
    const suggestionElement = this.#shadow.querySelector<HTMLSpanElement>('.suggestion');
    if (!suggestionElement) {
      throw new Error('Expected an suggestion element!');
    }
    return suggestionElement;
  }

  private text(): string {
    return this.input().value || '';
  }

  private render(): void {
    const output = LitHtml.html`
      <span class="prefix">${this.#prefixText} </span>
      <span class="text-prompt-input"><input aria-label=${this.#ariaLabelText} spellcheck="false" @input=${
        this.onInput} @keydown=${this.onKeyDown}/><span class='suggestion' suggestion="${
        this.#suggestionText}"></span></span>`;
    LitHtml.render(output, this.#shadow, {host: this});
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-text-prompt', TextPrompt);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-text-prompt': TextPrompt;
  }

  interface HTMLElementEventMap {
    'promptinputchanged': PromptInputEvent;
  }
}

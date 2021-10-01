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
  private readonly shadow = this.attachShadow({mode: 'open'});
  private ariaLabelText = '';
  private prefixText = '';
  private suggestionText = '';

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [textPromptStyles];
  }

  set data(data: TextPromptData) {
    this.ariaLabelText = data.ariaLabel;
    this.prefixText = data.prefix;
    this.suggestionText = data.suggestion;
    this.render();
  }

  get data(): TextPromptData {
    return {
      ariaLabel: this.ariaLabelText,
      prefix: this.prefixText,
      suggestion: this.suggestionText,
    };
  }

  focus(): void {
    this.input().focus();
  }

  private input(): HTMLElement {
    const inputElement = this.shadow.querySelector('.text-prompt-input');
    if (!inputElement) {
      throw new Error('Expected an input element!');
    }
    return /** @type {!HTMLElement} */ inputElement as HTMLElement;
  }

  moveCaretToEndOfInput(): void {
    this.setSelectedRange(this.text().length, this.text().length);
  }

  onInput(): void {
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
    const inputBox = this.input();
    const range = document.createRange();
    range.setStart(inputBox, startIndex);
    range.setEnd(inputBox, endIndex);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  setPrefix(prefix: string): void {
    this.prefixText = prefix;
    this.render();
  }

  setSuggestion(suggestion: string): void {
    this.suggestionText = suggestion;
    this.render();
  }

  setText(text: string): void {
    this.input().textContent = text;
    if (this.input().hasFocus()) {
      this.moveCaretToEndOfInput();
      this.input().scrollIntoView();
    }
  }

  private text(): string {
    return this.input().textContent || '';
  }

  private render(): void {
    const output = LitHtml.html`
      <span class="prefix">${this.prefixText}</span>
      <input aria-label=${this.ariaLabelText}>
        <div class="text-prompt-input" spellcheck="false" contenteditable="plaintext-only" @keydown=${
        this.onKeyDown} @input=${this.onInput} suggestion=" ${this.suggestionText}"></div>
      </input>`;
    LitHtml.render(output, this.shadow, {host: this});
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

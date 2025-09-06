// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../../ui/lit/lit.js';

const {html, Decorators} = Lit;
const {customElement} = Decorators as any;

@customElement('ai-chat-input')
export class ChatInput extends HTMLElement {
  static readonly litTagName = Lit.StaticHtml.literal`ai-chat-input`;

  #disabled = false;
  #placeholder = '';
  #value = '';

  get disabled(): boolean { return this.#disabled; }
  set disabled(v: boolean) { this.#disabled = v; this.#render(); }
  get placeholder(): string { return this.#placeholder; }
  set placeholder(v: string) { this.#placeholder = v ?? ''; this.#render(); }
  get value(): string { return this.#value; }
  set value(v: string) { this.#value = v ?? ''; this.#render(); }

  connectedCallback(): void { this.#render(); }
  focusInput(): void { (this.querySelector('textarea') as HTMLTextAreaElement | null)?.focus(); }
  clear(): void { this.#value = ''; this.#render(); this.#syncDomValue(); }

  // Ensure DOM reflects the internal value immediately
  #syncDomValue(): void {
    const ta = this.querySelector('textarea') as HTMLTextAreaElement | null;
    if (ta) { ta.value = this.#value; this.#autosize(ta); }
  }

  #onInput = (e: Event) => {
    const el = e.target as HTMLTextAreaElement;
    this.#value = el.value;
    this.dispatchEvent(new CustomEvent('inputchange', {bubbles: true, detail: { value: this.#value }}));
    this.#autosize(el);
  };
  #onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = this.#value.trim();
      if (!text || this.#disabled) return;
      this.dispatchEvent(new CustomEvent('send', {bubbles: true, detail: { text }}));
      this.#value = '';
      this.#render();
      this.#syncDomValue();
    }
  };

  #autosize(el: HTMLTextAreaElement): void { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }

  #render(): void {
    Lit.render(html`
      <textarea
        class="text-input"
        .value=${this.#value}
        placeholder=${this.#placeholder}
        rows="1"
        ?disabled=${this.#disabled}
        @input=${this.#onInput}
        @keydown=${this.#onKeyDown}
      ></textarea>
      <slot name="actions"></slot>
    `, this, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap { 'ai-chat-input': ChatInput; }
}

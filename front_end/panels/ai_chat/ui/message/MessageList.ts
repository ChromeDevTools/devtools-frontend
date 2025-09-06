// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../../ui/lit/lit.js';
import type { ChatMessage } from '../../models/ChatTypes.js';

const {html, Decorators} = Lit;
const {customElement} = Decorators as any;

@customElement('ai-message-list')
export class MessageList extends HTMLElement {
  static readonly litTagName = Lit.StaticHtml.literal`ai-message-list`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  // Public API properties (no decorators; manual setters trigger render)
  #messages: ChatMessage[] = [];
  #state: 'idle'|'loading'|'error' = 'idle';
  #agentViewMode: 'simplified'|'enhanced' = 'simplified';

  set messages(value: ChatMessage[]) { this.#messages = value; this.#render(); }
  get messages(): ChatMessage[] { return this.#messages; }
  set state(value: 'idle'|'loading'|'error') { this.#state = value; this.#render(); }
  get state(): 'idle'|'loading'|'error' { return this.#state; }
  set agentViewMode(value: 'simplified'|'enhanced') { this.#agentViewMode = value; this.#render(); }
  get agentViewMode(): 'simplified'|'enhanced' { return this.#agentViewMode; }

  // Internal state
  #pinToBottom = true;
  #container?: HTMLElement;
  #resizeObserver = new ResizeObserver(() => { if (this.#pinToBottom) this.#scrollToBottom(); });

  connectedCallback(): void { this.#render(); }
  disconnectedCallback(): void { this.#resizeObserver.disconnect(); }

  #onScroll = (e: Event) => {
    const el = e.target as HTMLElement;
    const SCROLL_ROUNDING_OFFSET = 1;
    this.#pinToBottom = el.scrollTop + el.clientHeight + SCROLL_ROUNDING_OFFSET >= el.scrollHeight;
  };

  #scrollToBottom(): void { if (this.#container) this.#container.scrollTop = this.#container.scrollHeight; }

  #render(): void {
    const refFn = (el?: Element) => {
      if (this.#container) { this.#resizeObserver.unobserve(this.#container); }
      this.#container = el as HTMLElement | undefined;
      if (this.#container) {
        this.#resizeObserver.observe(this.#container);
        this.#scrollToBottom();
      } else {
        this.#pinToBottom = true;
      }
    };

    // Container mode: project messages via slot from parent.
    Lit.render(html`
      <style>
        :host { display: block; height: 100%; flex: 1 1 auto; position: relative; z-index: 0; }
        .container {
          overflow-y: auto;
          height: 100%;
          display: flex;
          flex-direction: column;
          scroll-behavior: smooth;
          padding: 12px 16px;
          background-color: var(--color-background);
          /* Reduced bottom padding since input bar is no longer sticky */
          padding-bottom: 16px;
          min-height: 100px;
          position: relative;
          z-index: 0;
        }
        .container::-webkit-scrollbar { width: 4px; }
        .container::-webkit-scrollbar-track { background: transparent; }
        .container::-webkit-scrollbar-thumb { background-color: var(--color-scrollbar); border-radius: 4px; }
      </style>
      <div class="container" @scroll=${this.#onScroll} ${Lit.Directives.ref(refFn)}>
        <slot></slot>
      </div>
    `, this.#shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap { 'ai-message-list': MessageList; }
}

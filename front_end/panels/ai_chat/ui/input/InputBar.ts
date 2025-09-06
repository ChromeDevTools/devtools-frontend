// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../../ui/lit/lit.js';
import type { ImageInputData } from '../../models/ChatTypes.js';
import * as BaseOrchestratorAgent from '../../core/BaseOrchestratorAgent.js';

import '../model_selector/ModelSelector.js';
import './ChatInput.js';

const {html, Decorators} = Lit;
const {customElement} = Decorators as any;

@customElement('ai-input-bar')
export class InputBar extends HTMLElement {
  static readonly litTagName = Lit.StaticHtml.literal`ai-input-bar`;

  // Props
  #placeholder = '';
  #disabled = false;
  #sendDisabled = true;
  #imageInput?: ImageInputData;
  #modelOptions?: Array<{value: string, label: string}>;
  #selectedModel?: string;
  #modelSelectorDisabled = false;
  #selectedPromptType?: string|null;
  #agentButtonsHandler: (event: Event) => void = () => {};
  #centered = false;

  set placeholder(v: string) { this.#placeholder = v || ''; this.#render(); }
  set disabled(v: boolean) { this.#disabled = !!v; this.#render(); }
  set sendDisabled(v: boolean) { this.#sendDisabled = !!v; this.#render(); }
  set imageInput(v: ImageInputData|undefined) { this.#imageInput = v; this.#render(); }
  set modelOptions(v: Array<{value: string, label: string}>|undefined) { this.#modelOptions = v; this.#render(); }
  set selectedModel(v: string|undefined) { this.#selectedModel = v; this.#render(); }
  set modelSelectorDisabled(v: boolean) { this.#modelSelectorDisabled = !!v; this.#render(); }
  set selectedPromptType(v: string|null|undefined) { this.#selectedPromptType = v ?? null; this.#render(); }
  set agentButtonsHandler(fn: (event: Event) => void) { this.#agentButtonsHandler = fn || (() => {}); this.#render(); }
  set centered(v: boolean) { this.#centered = !!v; this.#render(); }

  connectedCallback(): void { this.#render(); }

  #emitSendAndClear(detail: any): void {
    // Re-emit send upward
    this.dispatchEvent(new CustomEvent('send', { bubbles: true, detail }));
    // Proactively clear the child input to avoid any stale content
    const inputEl = this.querySelector('ai-chat-input') as (HTMLElement & { clear?: () => void }) | null;
    if (inputEl) {
      // Prefer component clear() if available
      if (typeof (inputEl as any).clear === 'function') {
        (inputEl as any).clear();
      } else if ('value' in (inputEl as any)) {
        // Fall back to resetting value via setter
        (inputEl as any).value = '';
      }
    }
  }

  // Public API for parent to explicitly clear the input field
  clearInput(): void {
    const inputEl = this.querySelector('ai-chat-input') as (HTMLElement & { clear?: () => void, value?: string }) | null;
    if (typeof inputEl?.clear === 'function') {
      inputEl.clear();
    } else if (inputEl && 'value' in inputEl) {
      (inputEl as any).value = '';
    }
  }

  #sendFromInput(): void {
    const inputEl = this.querySelector('ai-chat-input') as (HTMLElement & { value?: string, clear?: () => void }) | null;
    const text = (inputEl?.value ?? '').trim();
    if (!text) {
      return;
    }
    this.dispatchEvent(new CustomEvent('send', { bubbles: true, detail: { text }}));
    if (typeof inputEl?.clear === 'function') {
      inputEl.clear();
    }
  }

  #render(): void {
    const imagePreview = this.#imageInput ? html`
      <div class="image-preview">
        <img src=${this.#imageInput.url} alt="Image input" />
        <button class="image-remove-button" @click=${() => this.dispatchEvent(new CustomEvent('image-clear', {bubbles: true}))}>
          <span class="icon">×</span>
        </button>
      </div>
    ` : Lit.nothing;

    const agentButtons = BaseOrchestratorAgent.renderAgentTypeButtons(this.#selectedPromptType ?? null, this.#agentButtonsHandler, this.#centered);

    const modelSelector = (this.#modelOptions && this.#modelOptions.length && this.#selectedModel) ? html`
      <ai-model-selector
        .options=${this.#modelOptions}
        .selected=${this.#selectedModel}
        .disabled=${this.#modelSelectorDisabled}
        @change=${(e: CustomEvent) => {
          const value = (e.detail as any)?.value as string | undefined;
          if (value) {
            this.dispatchEvent(new CustomEvent('model-changed', { bubbles: true, detail: { value }}));
          }
        }}
        @model-selector-focus=${() => this.dispatchEvent(new CustomEvent('model-selector-focus', { bubbles: true }))}
      ></ai-model-selector>
    ` : Lit.nothing;

    Lit.render(html`
      <div class="input-container ${this.#centered ? 'centered' : ''}">
        ${imagePreview}
        <div class="input-row">
          <ai-chat-input
            .placeholder=${this.#placeholder}
            .disabled=${this.#disabled}
            @send=${(e: Event) => this.#emitSendAndClear((e as CustomEvent).detail)}
            @inputchange=${(e: Event) => this.dispatchEvent(new CustomEvent('inputchange', { bubbles: true, detail: (e as CustomEvent).detail }))}
          ></ai-chat-input>
        </div>
        <div class="prompt-buttons-row">
          ${agentButtons}
          <div class="actions-container">
            ${modelSelector}
            <button
              class="send-button ${this.#sendDisabled ? 'disabled' : ''}"
              ?disabled=${this.#sendDisabled}
              @click=${() => this.#sendFromInput()}
              title="Send message"
              aria-label="Send message"
            >
              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M29.4,15.1 l-8.9-3.5 l-3.5-8.9 C16.8,2.3,16.4,2,16,2 s-0.8,0.3-0.9,0.6 l-3.5,8.9 l-8.9,3.5 C2.3,15.2,2,15.6,2,16 s0.3,0.8,0.6,0.9 l8.9,3.5 l3.5,8.9 c0.2,0.4,0.5,0.6,0.9,0.6 s0.8-0.3,0.9-0.6 l3.5-8.9 l8.9-3.5 c0.4-0.2,0.6-0.5,0.6-0.9 S29.7,15.2,29.4,15.1 z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    `, this, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap { 'ai-input-bar': InputBar; }
}

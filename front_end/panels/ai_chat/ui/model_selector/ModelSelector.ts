// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../../ui/lit/lit.js';

const {html, Decorators} = Lit;
const {customElement} = Decorators as any;

export interface ModelOption { value: string; label: string; }

@customElement('ai-model-selector')
export class ModelSelector extends HTMLElement {
  static readonly litTagName = Lit.StaticHtml.literal`ai-model-selector`;

  #options: ModelOption[] = [];
  #selected: string | undefined;
  #disabled = false;
  #open = false;
  #query = '';
  #highlighted = 0;
  #preferAbove = false;
  #forceSearchable = false;

  get options(): ModelOption[] { return this.#options; }
  set options(v: ModelOption[]) { this.#options = v || []; this.#render(); }
  get selected(): string | undefined { return this.#selected; }
  set selected(v: string | undefined) { this.#selected = v; this.#render(); }
  get disabled(): boolean { return this.#disabled; }
  set disabled(v: boolean) { this.#disabled = !!v; this.#render(); }
  get preferAbove(): boolean { return this.#preferAbove; }
  set preferAbove(v: boolean) { this.#preferAbove = !!v; this.#render(); }
  get forceSearchable(): boolean { return this.#forceSearchable; }
  set forceSearchable(v: boolean) { this.#forceSearchable = !!v; this.#render(); }

  connectedCallback(): void { this.#render(); }

  #emitChange(value: string): void {
    this.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value }}));
  }

  #toggle = (e: Event) => {
    e.preventDefault();
    if (this.#disabled) return;
    const wasOpen = this.#open;
    this.#open = !this.#open;
    this.#render();
    if (!wasOpen && this.#open) {
      // Notify host that the selector opened (used to lazily refresh models)
      this.dispatchEvent(new CustomEvent('model-selector-focus', {bubbles: true}));
    }
  };
  #onSearch = (e: Event) => { this.#query = (e.target as HTMLInputElement).value; this.#highlighted = 0; this.#render(); };
  #onKeydown = (e: KeyboardEvent) => {
    const filtered = this.#filtered();
    if (e.key === 'ArrowDown') { e.preventDefault(); this.#highlighted = Math.min(this.#highlighted + 1, filtered.length - 1); this.#render(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); this.#highlighted = Math.max(this.#highlighted - 1, 0); this.#render(); }
    if (e.key === 'Enter') { e.preventDefault(); const opt = filtered[this.#highlighted]; if (opt) { this.#selected = opt.value; this.#open = false; this.#emitChange(opt.value); this.#render(); } }
    if (e.key === 'Escape') { e.preventDefault(); this.#open = false; this.#render(); }
  };

  #filtered(): ModelOption[] {
    if (!this.#query) return this.#options;
    const q = this.#query.toLowerCase();
    return this.#options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }

  #isSearchable(): boolean { return this.#forceSearchable || (this.#options?.length || 0) >= 20; }

  #render(): void {
    const selectedLabel = this.#options.find(o => o.value === this.#selected)?.label || this.#selected || 'Select Model';
    if (!this.#isSearchable()) {
      Lit.render(html`
        <div class="model-selector">
          <select class="model-select" ?disabled=${this.#disabled} @change=${(e: Event) => this.#emitChange((e.target as HTMLSelectElement).value)} @focus=${() => this.dispatchEvent(new CustomEvent('model-selector-focus', {bubbles: true}))}>
            ${this.#options.map(o => html`<option value=${o.value} ?selected=${o.value === this.#selected}>${o.label}</option>`)}
          </select>
        </div>
      `, this, {host: this});
      return;
    }

    const filtered = this.#filtered();
    Lit.render(html`
      <div class="model-selector searchable">
        <button class="model-select-trigger" @click=${this.#toggle} ?disabled=${this.#disabled}>
          <span class="selected-model">${selectedLabel}</span>
          <span class="dropdown-arrow">${this.#open ? '▲' : '▼'}</span>
        </button>
        ${this.#open ? html`
          <div class="model-dropdown ${this.#preferAbove ? 'above' : 'below'}" @click=${(e: Event) => e.stopPropagation()}>
            <input class="model-search" type="text" placeholder="Search models..." @input=${this.#onSearch} @keydown=${this.#onKeydown} .value=${this.#query}>
            <div class="model-options">
              ${filtered.map((o, i) => html`
                <div class="model-option ${o.value === this.#selected ? 'selected' : ''} ${i === this.#highlighted ? 'highlighted' : ''}"
                  @click=${() => { this.#selected = o.value; this.#open = false; this.#emitChange(o.value); this.#render(); }}
                  @mouseenter=${() => this.#highlighted = i}
                >${o.label}</div>
              `)}
              ${filtered.length === 0 ? html`<div class="model-option no-results">No matching models found</div>` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `, this, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap { 'ai-model-selector': ModelSelector; }
}

// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../third_party/lit-html/lit-html.js';

const {render, html} = LitHtml;

export interface ComputedStylePropertyData {
  propertyName: string;
  propertyValue: string;
  inherited: boolean;
  traceable: boolean;
  expanded: boolean;
  onNavigateToSource: (event?: Event) => void;
}

export class TracesToggledEvent extends Event {
  data: {propertyName: string, shown: boolean};

  constructor(propertyName: string, shown: boolean) {
    super('traces-toggled', {});
    this.data = {propertyName, shown};
  }
}

export class ComputedStyleProperty extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});

  private propertyName = '';
  private propertyValue = '';
  private inherited = false;
  private traceable = false;
  private expanded = false;
  private onNavigateToSource: ((event?: Event) => void) = () => {};

  set data(data: ComputedStylePropertyData) {
    this.propertyName = data.propertyName;
    this.propertyValue = data.propertyValue;
    this.inherited = data.inherited;
    this.traceable = data.traceable;
    this.expanded = data.expanded;
    this.onNavigateToSource = data.onNavigateToSource;
    this.render();
  }

  // TODO: remove name and value getters after ComputedStyleWidget refactor
  getPropertyName(): string {
    return this.propertyName;
  }

  getPropertyValue(): string {
    return this.propertyValue;
  }

  isExpanded(): boolean {
    return this.expanded;
  }

  private onSummaryClick(event: Event) {
    event.preventDefault();
    this.expanded = !this.expanded;
    this.render();
    this.dispatchEvent(new TracesToggledEvent(this.propertyName, this.expanded));
  }

  private renderStyle() {
    return html`
      <style>
        :host {
          position: relative;
          overflow: hidden;
          flex: auto;
          text-overflow: ellipsis;
        }

        summary {
          outline: none;
        }

        summary::-webkit-details-marker {
          position: absolute;
          top: 4.5px;
          left: 4px;
          color: var(--active-control-bg-color, #727272);
        }

        .computed-style-property {
          min-height: 16px;
          padding-left: 1.4em;
          box-sizing: border-box;
          padding-top: 2px;
          white-space: nowrap;
        }

        .computed-style-property:hover,
        summary:focus .computed-style-property {
          background-color: var(--focus-bg-color);
          cursor: pointer;
        }

        .computed-style-property.inherited {
          opacity: 50%;
        }

        slot[name="property-name"],
        slot[name="property-value"] {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        slot[name="property-name"] {
          width: 16em;
          max-width: 52%;
          display: inline-block;
          vertical-align: text-top;
        }

        slot[name="property-value"] {
          margin-left: 2em;
        }

        .goto {
          --size: 16px;
          display: none;
          position: absolute;
          width: var(--size);
          height: var(--size);
          margin: -1px 0 0 calc(-1 * var(--size));
          -webkit-mask-image: url(Images/mediumIcons.svg);
          -webkit-mask-position: -32px 48px;
          background-color: var(--active-control-bg-color);
        }

        .computed-style-property:hover .goto {
          display: inline-block;
        }

        .hidden {
          display: none;
        }

        ::slotted([slot="property-traces"]) {
          margin-left: 16px;
        }

        /* narrowed styles */
        :host-context(.computed-narrow) .computed-style-property {
          white-space: normal;
        }

        :host-context(.computed-narrow) slot[name="property-name"],
        :host-context(.computed-narrow) slot[name="property-value"] {
          display: inline-block;
          width: 100%;
          max-width: 100%;
          margin-left: 0;
          white-space: nowrap;
        }

        :host-context(.computed-narrow) .goto {
          display: none;
        }

        /* high-contrast styles */
        @media (forced-colors: active) {
          .computed-style-property.inherited {
            opacity: 100%;
          }

          :host-context(.monospace.computed-properties) .computed-style-property:hover,
          :host-context(.monospace.computed-properties) summary:focus .computed-style-property {
            forced-color-adjust: none;
            background-color: Highlight;
          }

          :host-context(.monospace.computed-properties) .computed-style-property:hover *,
          :host-context(.monospace.computed-properties) summary:focus .computed-style-property *,
          :host-context(.monospace.computed-properties) details[open] > summary:hover::-webkit-details-marker {
            color: HighlightText;
          }

          :host-context(.monospace.computed-properties) .goto {
            background-color: HighlightText;
          }
        }
      </style>
    `;
  }

  private renderProperty() {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <div class="computed-style-property ${this.inherited ? 'inherited' : ''}">
        <slot name="property-name"></slot>
        <span class="hidden" aria-hidden="false">: </span>
        ${this.traceable ?
            html`<span class="goto" @click=${this.onNavigateToSource}></span>` :
            null}
        <slot name="property-value"></slot>
        <span class="hidden" aria-hidden="false">;</span>
      </div>
    `;
    // clang-format on
  }

  private render() {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    if (this.traceable) {
      render(html`
        ${this.renderStyle()}
        <details ?open=${this.expanded}>
          <summary @click=${this.onSummaryClick}>
            ${this.renderProperty()}
          </summary>
          <slot name="property-traces"></slot>
        </details>
      `, this.shadow, {
        eventContext: this,
      });
    } else {
      render(html`
        ${this.renderStyle()}
        ${this.renderProperty()}
      `, this.shadow, {
        eventContext: this,
      });
    }
    // clang-format on
  }
}

customElements.define('devtools-computed-style-property', ComputedStyleProperty);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-computed-style-property': ComputedStyleProperty;
  }
}

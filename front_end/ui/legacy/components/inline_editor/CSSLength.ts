// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../components/helpers/helpers.js';
import * as LitHtml from '../../../lit-html/lit-html.js';
import cssLengthStyles from './cssLength.css.js';

import {LengthUnit, LENGTH_UNITS, parseText, type Length} from './CSSLengthUtils.js';
import {ValueChangedEvent} from './InlineEditorUtils.js';

const {render, html, Directives: {classMap}} = LitHtml;

export class DraggingFinishedEvent extends Event {
  static readonly eventName = 'draggingfinished';
  constructor() {
    super(DraggingFinishedEvent.eventName, {});
  }
}

export interface CSSLengthData {
  lengthText: string;
  overloaded: boolean;
}

const DefaultLength = {
  value: 0,
  unit: LengthUnit.PIXEL,
};

export class CSSLength extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-css-length`;

  private readonly shadow = this.attachShadow({mode: 'open'});
  private readonly onDraggingValue = this.dragValue.bind(this);
  private length: Length = DefaultLength;
  private overloaded: boolean = false;
  private isEditingSlot = false;
  private isDraggingValue = false;
  private currentMouseClientX = 0;
  #valueMousedownTime = 0;

  set data(data: CSSLengthData) {
    const parsedResult = parseText(data.lengthText);
    if (!parsedResult) {
      return;
    }
    this.length = parsedResult;
    this.overloaded = data.overloaded;
    this.render();
  }

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [cssLengthStyles];
  }

  private onUnitChange(event: Event): void {
    this.length.unit = (event.target as HTMLInputElement).value as LengthUnit;
    this.dispatchEvent(new ValueChangedEvent(`${this.length.value}${this.length.unit}`));
    this.dispatchEvent(new DraggingFinishedEvent());
    this.render();
  }

  private dragValue(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (Date.now() - this.#valueMousedownTime <= 300) {
      // Delay drag callback by 300ms to prioritize click over drag.
      return;
    }

    this.isDraggingValue = true;
    let displacement = event.clientX - this.currentMouseClientX;
    this.currentMouseClientX = event.clientX;
    if (event.shiftKey) {
      displacement *= 10;
    }
    if (event.altKey) {
      displacement *= 0.1;
    }
    this.length.value = this.length.value + displacement;
    this.dispatchEvent(new ValueChangedEvent(`${this.length.value}${this.length.unit}`));
    this.render();
  }

  private onValueMousedown(event: MouseEvent): void {
    if (event.button !== 0) {
      return;
    }

    this.#valueMousedownTime = Date.now();

    this.currentMouseClientX = event.clientX;
    const targetDocument = event.target instanceof Node && event.target.ownerDocument;
    if (targetDocument) {
      targetDocument.addEventListener('mousemove', this.onDraggingValue, {capture: true});
      targetDocument.addEventListener('mouseup', (event: MouseEvent) => {
        targetDocument.removeEventListener('mousemove', this.onDraggingValue, {capture: true});

        if (!this.isDraggingValue) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.isDraggingValue = false;
        this.dispatchEvent(new DraggingFinishedEvent());
      }, {once: true, capture: true});
    }
  }

  private onValueMouseup(): void {
    if (!this.isDraggingValue) {
      this.isEditingSlot = true;
      this.render();
    }
  }

  private onUnitMouseup(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  private render(): void {
    const classes = {
      'css-length': true,
      'overloaded': this.overloaded,
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class=${classMap(classes)}>
        ${this.renderContent()}
      </div>
    `, this.shadow, {
      host: this,
    });
    // clang-format on
  }

  private renderContent(): LitHtml.TemplateResult {
    if (this.isEditingSlot) {
      return html`<slot></slot>`;
    }
    const options = LENGTH_UNITS.map(unit => {
      return html`
          <option value=${unit} .selected=${this.length.unit === unit}>${unit}</option>
        `;
    });
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
      return html`
        <span class="value"
          @mousedown=${this.onValueMousedown}
          @mouseup=${this.onValueMouseup}
        >${this.length.value}</span><span class="unit">${this.length.unit}</span><div class="unit-dropdown">
          <span class="icon"></span>
          <select @mouseup=${this.onUnitMouseup} @change=${this.onUnitChange}>
            ${options}
          </select>
        </div>
      `;
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-css-length', CSSLength);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-css-length': CSSLength;
  }
}

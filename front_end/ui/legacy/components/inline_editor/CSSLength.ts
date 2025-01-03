// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../../core/host/host.js';
import * as UI from '../../../legacy/legacy.js';
import * as LitHtml from '../../../lit-html/lit-html.js';

import cssLengthStyles from './cssLength.css.js';
import {ValueChangedEvent} from './InlineEditorUtils.js';

const {render, html} = LitHtml;

export class DraggingFinishedEvent extends Event {
  static readonly eventName = 'draggingfinished';
  constructor() {
    super(DraggingFinishedEvent.eventName, {});
  }
}

export enum CSSLengthUnit {
  // absolute units
  PIXEL = 'px',
  CENTIMETER = 'cm',
  MILLIMETER = 'mm',
  QUARTERMILLIMETER = 'Q',
  INCH = 'in',
  PICA = 'pc',
  POINT = 'pt',

  // relative units
  CAP = 'cap',
  CH = 'ch',
  EM = 'em',
  EX = 'ex',
  IC = 'ic',
  LH = 'lh',
  RCAP = 'rcap',
  RCH = 'rch',
  REM = 'rem',
  REX = 'rex',
  RIC = 'ric',
  RLH = 'rlh',
  VB = 'vb',
  VH = 'vh',
  VI = 'vi',
  VW = 'vw',
  VMIN = 'vmin',
  VMAX = 'vmax',
}

export const CSS_LENGTH_REGEX =
    new RegExp(`(?<value>[+-]?\\d*\\.?\\d+([Ee][+-]?\\d+)?)(?<unit>${Object.values(CSSLengthUnit).join('|')})`);

type CSSLengthData = {
  lengthText: string,
};

export class CSSLength extends HTMLElement {

  private readonly shadow = this.attachShadow({mode: 'open'});
  private readonly onDraggingValue = this.dragValue.bind(this);
  private value = '';
  private unit = CSSLengthUnit.PIXEL;
  private isEditingSlot = false;
  private isDraggingValue = false;
  #valueMousedownTime = 0;

  set data({lengthText}: CSSLengthData) {
    const groups = lengthText.match(CSS_LENGTH_REGEX)?.groups;
    if (!groups) {
      throw new Error();
    }
    this.value = groups.value;
    this.unit = groups.unit as CSSLengthUnit;
    this.render();
  }

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [cssLengthStyles];
  }

  private dragValue(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (Date.now() - this.#valueMousedownTime <= 300) {
      // Delay drag callback by 300ms to prioritize click over drag.
      return;
    }

    this.isDraggingValue = true;
    const newValue = UI.UIUtils.createReplacementString(this.value, event);
    if (newValue) {
      this.value = newValue;
      this.dispatchEvent(new ValueChangedEvent(`${this.value}${this.unit}`));
      Host.userMetrics.swatchActivated(Host.UserMetrics.SwatchType.LENGTH);
      this.render();
    }
  }

  private onValueMousedown(event: MouseEvent): void {
    if (event.button !== 0) {
      return;
    }

    this.#valueMousedownTime = Date.now();

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

  private render(): void {
    render(this.renderContent(), this.shadow, {
      host: this,
    });
  }

  private renderContent(): LitHtml.TemplateResult {
    if (this.isEditingSlot) {
      return html`<slot></slot>`;
    }
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
      return html`<span class="value" @mousedown=${this.onValueMousedown} @mouseup=${this.onValueMouseup}>${this.value}</span><span class="unit">${this.unit}</span>`;
    // clang-format on
  }
}

customElements.define('devtools-css-length', CSSLength);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-css-length': CSSLength;
  }
}

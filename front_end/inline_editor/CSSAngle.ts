// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './CSSAngleEditor.js';
import './CSSAngleSwatch.js';

import * as LitHtml from '../third_party/lit-html/lit-html.js';

import {Angle, AngleUnit, convertAngleUnit, getNewAngleFromEvent, getNextUnit, parseText, roundAngleByUnit} from './CSSAngleUtils.js';

import type {CSSAngleEditorData} from './CSSAngleEditor.js';
import type {CSSAngleSwatchData} from './CSSAngleSwatch.js';

const {render, html} = LitHtml;
const styleMap = LitHtml.Directives.styleMap;

const ContextAwareProperties = new Set(['color', 'background', 'background-color']);

export class PopoverToggledEvent extends Event {
  data: {open: boolean};

  constructor(open: boolean) {
    super('popover-toggled', {});
    this.data = {open};
  }
}

export class ValueChangedEvent extends Event {
  data: {value: string};

  constructor(value: string) {
    super('value-changed', {});
    this.data = {value};
  }
}

export class UnitChangedEvent extends Event {
  data: {value: string};

  constructor(value: string) {
    super('unit-changed', {});
    this.data = {value};
  }
}

export interface CSSAngleData {
  propertyName: string;
  propertyValue: string;
  angleText: string;
  containingPane: HTMLElement;
}

const DefaultAngle = {
  value: 0,
  unit: AngleUnit.Rad,
};

export class CSSAngle extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private angle: Angle = DefaultAngle;
  private displayedAngle: Angle = DefaultAngle;
  private propertyName = '';
  private propertyValue = '';
  private containingPane?: HTMLElement;
  private angleElement: HTMLElement|null = null;
  private swatchElement: HTMLElement|null = null;
  private popoverOpen = false;
  private popoverStyleTop = '';
  private onMinifyingAction = this.minify.bind(this);
  private onAngleUpdate = this.updateAngle.bind(this);

  set data(data: CSSAngleData) {
    const parsedResult = parseText(data.angleText);
    if (!parsedResult) {
      return;
    }
    this.angle = parsedResult;
    this.displayedAngle = {...parsedResult};
    this.propertyName = data.propertyName;
    this.propertyValue = data.propertyValue;
    this.containingPane = data.containingPane;
    this.render();
  }

  disconnectedCallback() {
    this.unbindMinifyingAction();
  }

  // We bind and unbind mouse event listeners upon popping over and minifying,
  // because we anticipate most of the time this widget is minified even when
  // it's attached to the DOM tree.
  popover(): void {
    if (!this.containingPane) {
      return;
    }

    if (!this.angleElement) {
      this.angleElement = this.shadow.querySelector<HTMLElement>('.css-angle');
    }
    if (!this.swatchElement) {
      this.swatchElement = this.shadow.querySelector<HTMLElement>('devtools-css-angle-swatch');
    }
    if (!this.angleElement || !this.swatchElement) {
      return;
    }

    this.dispatchEvent(new PopoverToggledEvent(true));
    this.bindMinifyingAction();

    const miniIconBottom = this.swatchElement.getBoundingClientRect().bottom;
    if (miniIconBottom) {
      // We offset mini icon's Y position with the containing styles pane's Y position
      // because DevTools' root SplitWidget's insertion-point-sidebar slot,
      // where most of the DevTools content lives, has an offset of Y position,
      // which makes all of its children's DOMRect Y positions to have this offset.
      const topElementOffset = this.containingPane.getBoundingClientRect().top;
      this.popoverStyleTop = `${miniIconBottom - topElementOffset}px`;
    }

    this.popoverOpen = true;
    this.render();
    this.angleElement.focus();
  }

  minify(): void {
    if (this.popoverOpen === false) {
      return;
    }

    this.popoverOpen = false;
    this.dispatchEvent(new PopoverToggledEvent(false));
    this.unbindMinifyingAction();
    this.render();
  }

  updateProperty(name: string, value: string): void {
    this.propertyName = name;
    this.propertyValue = value;
    this.render();
  }

  private updateAngle(angle: Angle): void {
    this.displayedAngle = roundAngleByUnit(convertAngleUnit(angle, this.displayedAngle.unit));
    this.angle = this.displayedAngle;
    this.dispatchEvent(new ValueChangedEvent(`${this.angle.value}${this.angle.unit}`));
  }

  private displayNextUnit(): void {
    const nextUnit = getNextUnit(this.displayedAngle.unit);
    this.displayedAngle = roundAngleByUnit(convertAngleUnit(this.angle, nextUnit));
    this.dispatchEvent(new UnitChangedEvent(`${this.displayedAngle.value}${this.displayedAngle.unit}`));
  }

  private bindMinifyingAction(): void {
    document.addEventListener('mousedown', this.onMinifyingAction);
    if (this.containingPane) {
      this.containingPane.addEventListener('scroll', this.onMinifyingAction);
    }
  }

  private unbindMinifyingAction(): void {
    document.removeEventListener('mousedown', this.onMinifyingAction);
    if (this.containingPane) {
      this.containingPane.removeEventListener('scroll', this.onMinifyingAction);
    }
  }

  private onMiniIconClick(event: MouseEvent): void {
    event.stopPropagation();
    if (event.shiftKey) {
      this.displayNextUnit();
      return;
    }
    this.popoverOpen ? this.minify() : this.popover();
  }

  // Fix that the previous text will be selected when double-clicking the angle icon
  // TODO: When the angle selector(picker) is opened, hold down Shift and click the angle icon to close it.
  private consume(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
  }

  private onKeydown(event: KeyboardEvent): void {
    if (!this.popoverOpen) {
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.stopPropagation();
        this.minify();
        this.blur();
        break;
      case 'ArrowUp':
      case 'ArrowDown': {
        const newAngle = getNewAngleFromEvent(this.angle, event);
        if (newAngle) {
          this.updateAngle(newAngle);
        }
        event.preventDefault();
        break;
      }
    }
  }

  private render() {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>
        .css-angle {
          display: inline-block;
          position: relative;
          outline: none;
        }

        devtools-css-angle-swatch {
          display: inline-block;
          margin-right: 2px;
        }

        devtools-css-angle-editor {
          --dial-color: #a3a3a3;
          --border-color: var(--toolbar-bg-color);
          position: fixed;
          z-index: 2;
        }
      </style>

      <div class="css-angle" @keydown=${this.onKeydown} tabindex="-1">
        <div class="preview">
          <devtools-css-angle-swatch
            @click=${this.onMiniIconClick}
            @mousedown=${this.consume}
            @dblclick=${this.consume}
            .data=${{
              angle: this.angle,
            } as CSSAngleSwatchData}>
          </devtools-css-angle-swatch><slot></slot>
        </div>
        ${this.popoverOpen ? this.renderPopover() : null}
      </div>
    `, this.shadow, {
      eventContext: this,
    });
    // clang-format on
  }

  private renderPopover() {
    let contextualBackground = '';
    // TODO(crbug.com/1143010): for now we ignore values with "url"; when we refactor
    // CSS value parsing we should properly apply atomic contextual background.
    if (ContextAwareProperties.has(this.propertyName) && !this.propertyValue.match(/url\(.*\)/i)) {
      contextualBackground = this.propertyValue;
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
    <devtools-css-angle-editor
      class="popover popover-css-angle"
      style=${styleMap({top: this.popoverStyleTop})}
      .data=${{
        angle: this.angle,
        onAngleUpdate: this.onAngleUpdate,
        background: contextualBackground,
      } as CSSAngleEditorData}
    ></devtools-css-angle-editor>
    `;
    // clang-format on
  }
}

if (!customElements.get('devtools-css-angle')) {
  customElements.define('devtools-css-angle', CSSAngle);
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-css-angle': CSSAngle;
  }
}

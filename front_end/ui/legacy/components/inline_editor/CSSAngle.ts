// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './CSSAngleEditor.js';
import './CSSAngleSwatch.js';

import * as LitHtml from '../../../lit-html/lit-html.js';

import cssAngleStyles from './cssAngle.css.js';
import {
  type Angle,
  AngleUnit,
  convertAngleUnit,
  getNewAngleFromEvent,
  getNextUnit,
  parseText,
  roundAngleByUnit,
} from './CSSAngleUtils.js';
import {ValueChangedEvent} from './InlineEditorUtils.js';

const {render, html} = LitHtml;
const styleMap = LitHtml.Directives.styleMap;

export class PopoverToggledEvent extends Event {
  static readonly eventName = 'popovertoggled';
  data: {open: boolean};

  constructor(open: boolean) {
    super(PopoverToggledEvent.eventName, {});
    this.data = {open};
  }
}

export class UnitChangedEvent extends Event {
  static readonly eventName = 'unitchanged';
  data: {value: string};

  constructor(value: string) {
    super(UnitChangedEvent.eventName, {});
    this.data = {value};
  }
}

interface EventTypes {
  [PopoverToggledEvent.eventName]: PopoverToggledEvent;
  [UnitChangedEvent.eventName]: UnitChangedEvent;
  [ValueChangedEvent.eventName]: ValueChangedEvent;
}

export interface CSSAngleData {
  angleText: string;
  containingPane: HTMLElement;
}

const DefaultAngle = {
  value: 0,
  unit: AngleUnit.RAD,
};

export class CSSAngle extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private angle: Angle = DefaultAngle;
  private displayedAngle: Angle = DefaultAngle;
  private propertyValue = '';
  private containingPane?: HTMLElement;
  private angleElement: HTMLElement|null = null;
  private swatchElement: HTMLElement|null = null;
  private popoverOpen = false;
  private popoverStyleTop = '';
  private popoverStyleLeft = '';
  private onMinifyingAction = this.minify.bind(this);

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [cssAngleStyles];
  }

  set data(data: CSSAngleData) {
    const parsedResult = parseText(data.angleText);
    if (!parsedResult) {
      return;
    }
    this.angle = parsedResult;
    this.displayedAngle = {...parsedResult};
    this.containingPane = data.containingPane;
    this.render();
  }

  disconnectedCallback(): void {
    this.unbindMinifyingAction();
  }

  // We bind and unbind mouse event listeners upon popping over and minifying,
  // because we anticipate most of the time this widget is minified even when
  // it's attached to the DOM tree.
  popOver(): void {
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
    const miniIconLeft = this.swatchElement.getBoundingClientRect().left;
    if (miniIconBottom && miniIconLeft) {
      // We offset mini icon's X and Y positions with the containing styles
      // pane's positions because DevTools' root SplitWidget's
      // sidebar slot, where most of the DevTools content lives,
      // has an offset of positions, which makes all of its children's DOMRect
      // positions to have this offset.
      const offsetTop = this.containingPane.getBoundingClientRect().top;
      const offsetLeft = this.containingPane.getBoundingClientRect().left;
      this.popoverStyleTop = `${miniIconBottom - offsetTop}px`;
      this.popoverStyleLeft = `${miniIconLeft - offsetLeft}px`;
    }

    this.popoverOpen = true;
    this.render();
    this.angleElement.focus();
  }

  override addEventListener<K extends keyof EventTypes>(
      type: K, listener: (this: CSSAngle, ev: EventTypes[K]) => void,
      options?: boolean|AddEventListenerOptions|undefined): void;
  override addEventListener<K extends keyof HTMLElementEventMap>(
      type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
      options?: boolean|AddEventListenerOptions|undefined): void;
  override addEventListener(
      type: string, listener: EventListenerOrEventListenerObject,
      options?: boolean|AddEventListenerOptions|undefined): void {
    super.addEventListener(type, listener, options);
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

  updateProperty(value: string): void {
    this.propertyValue = value;
    this.render();
  }

  updateAngle(angle: Angle): void {
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
    if (event.shiftKey && !this.popoverOpen) {
      this.displayNextUnit();
      return;
    }
    this.popoverOpen ? this.minify() : this.popOver();
  }

  // Fix that the previous text will be selected when double-clicking the angle icon
  private consume(event: MouseEvent): void {
    event.stopPropagation();
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

  private render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="css-angle" @focusout=${this.minify} @keydown=${this.onKeydown} tabindex="-1">
        <div class="preview">
          <devtools-css-angle-swatch
            @click=${this.onMiniIconClick}
            @mousedown=${this.consume}
            @dblclick=${this.consume}
            .data=${{
              angle: this.angle,
            }}>
          </devtools-css-angle-swatch><slot></slot></div>
        ${this.popoverOpen ? this.renderPopover() : null}
      </div>
    `, this.shadow, {
      host: this,
    });
    // clang-format on
  }

  private renderPopover(): LitHtml.TemplateResult {
    let contextualBackground = '';
    if (this.propertyValue && !this.propertyValue.match(/url\(.*\)/i)) {
      contextualBackground = this.propertyValue;
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
    <devtools-css-angle-editor
      class="popover popover-css-angle"
      style=${styleMap({top: this.popoverStyleTop, left: this.popoverStyleLeft})}
      .data=${{
        angle: this.angle,
        onAngleUpdate: (angle: Angle):void => {
          this.updateAngle(angle);
        },
        background: contextualBackground,
      }}
    ></devtools-css-angle-editor>
    `;
        // clang-format on
  }
}

customElements.define('devtools-css-angle', CSSAngle);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-css-angle': CSSAngle;
  }
}

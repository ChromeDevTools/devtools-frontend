// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

import {Angle, AngleUnit, get2DTranslationsForAngle, getAngleFromRadians, getNextUnit, getRadiansFromAngle, parseText, roundAngleByUnit} from './CSSAngleUtils.js';

const {render, html} = LitHtml;
const styleMap = LitHtml.Directives.styleMap;

const MiniIconWidth = 11;
const ClockDialLength = 6;
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

export interface CSSAngleData {
  propertyName: string;
  propertyValue: string;
  angleText: string;
  containingPane: HTMLElement;
}

export class CSSAngle extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private angle: Angle = {
    value: 0,
    unit: AngleUnit.Rad,
  };
  private propertyName = '';
  private propertyValue = '';
  private containingPane?: HTMLElement;
  private mousemoveThrottler = new Common.Throttler.Throttler(16.67 /* 60fps */);
  private popoverOpen = false;
  private popoverStyleTop = '';
  private clockRadius = 77 / 2;  // By default the clock is 77 * 77.
  private onMinifyingAction = this.minify.bind(this);
  private dialTemplates?: LitHtml.TemplateResult[];

  set data(data: CSSAngleData) {
    const parsedResult = parseText(data.angleText);
    if (!parsedResult) {
      return;
    }
    this.angle = parsedResult;
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
    const miniIcon = this.shadow.querySelector('.mini-icon');
    if (!miniIcon || !this.containingPane) {
      return;
    }

    this.dispatchEvent(new PopoverToggledEvent(true));
    this.bindMinifyingAction();

    const miniIconBottom = miniIcon.getBoundingClientRect().bottom;
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
    this.angle = roundAngleByUnit(angle);
    this.dispatchEvent(new ValueChangedEvent(`${this.angle.value}${this.angle.unit}`));
  }

  private updateAngleWithNewUnit(newUnit: AngleUnit): void {
    // We use radian as the canonical unit to convert back and forth.
    const radian = getRadiansFromAngle(this.angle);
    this.updateAngle(getAngleFromRadians(radian, newUnit));
  }

  private updateAngleFromMousePosition(mouseX: number, mouseY: number, shouldSnapToMultipleOf15Degrees: boolean): void {
    const clock = this.shadow.querySelector('.clock');
    if (!clock) {
      return;
    }
    const {top, right, bottom, left} = clock.getBoundingClientRect();
    this.clockRadius = (right - left) / 2;
    const clockCenterX = (left + right) / 2;
    const clockCenterY = (bottom + top) / 2;
    const radian = -Math.atan2(mouseX - clockCenterX, mouseY - clockCenterY) + Math.PI;
    if (shouldSnapToMultipleOf15Degrees) {
      const multipleInRadian = getRadiansFromAngle({
        value: 15,
        unit: AngleUnit.Deg,
      });
      const closestMultipleOf15Degrees = Math.round(radian / multipleInRadian) * multipleInRadian;
      this.updateAngle(getAngleFromRadians(closestMultipleOf15Degrees, this.angle.unit));
    } else {
      this.updateAngle(getAngleFromRadians(radian, this.angle.unit));
    }
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
      this.updateAngleWithNewUnit(getNextUnit(this.angle.unit));
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

  private onPopoverMousedown(event: MouseEvent): void {
    event.stopPropagation();
    this.updateAngleFromMousePosition(event.pageX, event.pageY, event.shiftKey);
  }

  private onPopoverMousemove(event: MouseEvent): void {
    const isPressed = event.buttons === 1;
    if (!isPressed) {
      return;
    }

    this.mousemoveThrottler.schedule(() => {
      this.updateAngleFromMousePosition(event.pageX, event.pageY, event.shiftKey);
      return Promise.resolve();
    });
  }

  private onPopoverWheel(event: WheelEvent): void {
    if (!this.popoverOpen || (event.deltaY === 0 && event.deltaX === 0)) {
      return;
    }

    let diff = Math.PI / 180;
    // TODO(changhaohan): we can try exposing UIUtils' _valueModificationDirection
    // logic and reuse it in this component
    if (event.deltaY > 0 || event.deltaX > 0) {
      diff *= -1;
    }
    if (event.shiftKey) {
      diff *= 10;
    }

    const radian = getRadiansFromAngle(this.angle);
    this.updateAngle(getAngleFromRadians(radian + diff, this.angle.unit));
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
        // +/- current angle by 1 degree equivalent. Since we are using
        // radian as our canonical unit, we plus π/180 radian, which is 1 degree.
        let diff = Math.PI / 180;
        if (event.key === 'ArrowDown') {
          diff *= -1;
        }
        if (event.shiftKey) {
          diff *= 10;
        }

        const radian = getRadiansFromAngle(this.angle);
        this.updateAngle(getAngleFromRadians(radian + diff, this.angle.unit));
        break;
      }
    }
  }

  private render() {
    const {translateX, translateY} = get2DTranslationsForAngle(this.angle, MiniIconWidth / 4);
    const miniHandStyle = {
      transform: `translate(${translateX}px, ${translateY}px) rotate(${this.angle.value}${this.angle.unit})`,
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>
        .css-type {
          display: inline-block;
          position: relative;
          outline: none;
        }

        .preview {
          display: inline-block;
        }

        .mini-icon {
          position: relative;
          display: inline-block;
          margin-bottom: -2px;
          width: 1em;
          height: 1em;
          border: 1px solid var(--selection-inactive-fg-color);
          border-radius: 1em;
          overflow: hidden;
          cursor: pointer;
          background-color: var(--toolbar-bg-color);
        }

        .mini-hand {
          height: 55%;
          width: 2px;
          background-color: var(--accent-fg-color);
          border-radius: 5px;
        }

        .popover {
          --dial-color: #a3a3a3;
          --border-color: var(--toolbar-bg-color);
          position: fixed;
          z-index: 2;
        }

        .clock, .pointer, .center, .hand, .dial, .mini-hand {
          position: absolute;
        }

        .clock {
          top: 6px;
          width: 6em;
          height: 6em;
          background-color: white;
          border: 0.5em solid var(--border-color);
          border-radius: 9em;
          box-shadow: var(--drop-shadow), inset 0 0 15px hsl(0 0% 0% / 25%);
          transform: translateX(-3em);
        }

        :host-context(.-theme-with-dark-background) .clock {
          background-color: hsl(225 5% 27%);
        }

        .pointer {
          margin: auto;
          top: 0;
          left: -0.4em;
          right: 0;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 0.9em 0.9em 0.9em;
          border-color: transparent transparent var(--border-color) transparent;
        }

        .center, .hand, .mini-hand, .dial {
          margin: auto;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }

        .center, .hand {
          box-shadow: 0 0 2px hsl(0 0% 0% / 20%);
        }

        :host-context(.-theme-with-dark-background) .center,
        :host-context(.-theme-with-dark-background) .hand {
          box-shadow: 0 0 2px hsl(0 0% 0% / 60%);
        }

        .center {
          width: 0.7em;
          height: 0.7em;
          border-radius: 10px;
        }

        .dial {
          width: 2px;
          height: ${ClockDialLength}px;
          background-color: var(--dial-color);
          border-radius: 1px;
        }

        .hand {
          height: 50%;
          width: 0.3em;
          background: var(--accent-fg-color);
        }

        .hand::before {
          content: '';
          display: inline-block;
          position: absolute;
          top: -0.6em;
          left: -0.35em;
          width: 1em;
          height: 1em;
          border-radius: 1em;
          cursor: pointer;
          box-shadow: 0 0 5px hsl(0 0% 0% / 30%);
        }

        :host-context(.-theme-with-dark-background) .hand::before {
          box-shadow: 0 0 5px hsl(0 0% 0% / 80%);
        }

        .hand::before,
        .center {
          background-color: var(--accent-fg-color);
        }

        slot {
          display: inline;
          margin-left: -5px;
        }
      </style>

      <div class="css-type" @keydown=${this.onKeydown} tabindex="-1">
        <div class="preview">
          <div class="mini-icon" @click=${this.onMiniIconClick} @mousedown=${this.consume} @dblclick=${this.consume} >
            <span class="mini-hand" style=${styleMap(miniHandStyle)}></span>
          </div>
          <slot></slot>
        </div>
        ${this.popoverOpen ? this.renderPopover() : null}
      </div>
    `, this.shadow, {
      eventContext: this,
    });
    // clang-format on
  }

  private renderPopover() {
    const clockStyles = {
      background: '',
    };
    // TODO(crbug.com/1143010): for now we ignore values with "url"; when we refactor
    // CSS value parsing we should properly apply atomic contextual background.
    if (ContextAwareProperties.has(this.propertyName) && !this.propertyValue.match(/url\(.*\)/i)) {
      clockStyles.background = this.propertyValue;
    }

    const {translateX, translateY} = get2DTranslationsForAngle(this.angle, this.clockRadius / 2);
    const handStyles = {
      transform: `translate(${translateX}px, ${translateY}px) rotate(${this.angle.value}${this.angle.unit})`,
    };
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <div class="popover popover-css-angle" style=${styleMap({top: this.popoverStyleTop})}>
        <span class="pointer"></span>
        <div
          class="clock"
          style=${styleMap(clockStyles)}
          @mousedown=${this.onPopoverMousedown}
          @mousemove=${this.onPopoverMousemove}
          @wheel=${this.onPopoverWheel}>
          ${this.renderDials()}
          <div class="hand" style=${styleMap(handStyles)}></div>
          <span class="center"></span>
        </div>
      </div>
    `;
    // clang-format on
  }

  private renderDials() {
    if (!this.dialTemplates) {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      this.dialTemplates = [0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
        const radius = this.clockRadius - ClockDialLength - 3 /* clock border */;
        const {translateX, translateY} = get2DTranslationsForAngle({
          value: deg,
          unit: AngleUnit.Deg,
        }, radius);
        const dialStyles = {
          transform: `translate(${translateX}px, ${translateY}px) rotate(${deg}deg)`,
        };
        return html`<span class="dial" style=${styleMap(dialStyles)}></span>`;
      });
      // clang-format on
    }

    return this.dialTemplates;
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

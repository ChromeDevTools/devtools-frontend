// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

import {AngleUnit, get2DTranslationsForAngle, getAngleFromDegrees, parseText, roundAngleByUnit} from './CSSAngleUtils.js';

const {render, html} = LitHtml;
const styleMap = LitHtml.Directives.styleMap;

const MiniIconWidth = 11;
const ClockDialLength = 6;

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
  angleText: string;
  containingPane: HTMLElement;
}

export class CSSAngle extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private angle = 0;
  private unit = AngleUnit.Deg;
  private mousemoveThrottler = new Common.Throttler.Throttler(16.67 /* 60fps */);
  private containingPane?: HTMLElement;
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
    this.angle = parsedResult.value;
    this.unit = parsedResult.unit;
    this.containingPane = data.containingPane;
    // TODO(changhaohan): crbug.com/1138633 render based on the type of the property value
    this.render();
  }

  disconnectedCallback() {
    document.removeEventListener('mousedown', this.onMinifyingAction);
    if (this.containingPane) {
      this.containingPane.removeEventListener('scroll', this.onMinifyingAction);
    }
  }

  // We bind and unbind mouse event listeners upon popping over and minifying,
  // because we anticipate most of the time this widget is minified even when
  // it's attached to the DOM tree.
  popover(): void {
    const miniIcon = this.shadow.querySelector('.mini-icon');
    if (!miniIcon || !this.containingPane) {
      return;
    }
    this.popoverOpen = true;
    this.dispatchEvent(new PopoverToggledEvent(true));
    document.addEventListener('mousedown', this.onMinifyingAction);
    this.containingPane.addEventListener('scroll', this.onMinifyingAction);

    const miniIconBottom = miniIcon.getBoundingClientRect().bottom;
    if (miniIconBottom) {
      // We offset mini icon's Y position with the containing styles pane's Y position
      // because DevTools' root SplitWidget's insertion-point-sidebar slot,
      // where most of the DevTools content lives, has an offset of Y position,
      // which makes all of its children's DOMRect Y positions to have this offset.
      const topElementOffset = this.containingPane.getBoundingClientRect().top;
      this.popoverStyleTop = `${miniIconBottom - topElementOffset}px`;
    }
    this.render();
  }

  minify(): void {
    this.popoverOpen = false;
    this.dispatchEvent(new PopoverToggledEvent(false));
    document.removeEventListener('mousedown', this.onMinifyingAction);
    if (this.containingPane) {
      this.containingPane.removeEventListener('scroll', this.onMinifyingAction);
    }
    this.render();
  }

  private onMiniIconClick(event: Event): void {
    event.stopPropagation();
    this.popoverOpen ? this.minify() : this.popover();
  }

  private onMouseDown(event: MouseEvent): void {
    event.stopPropagation();
    this.updateAngleFromMousePosition(event.pageX, event.pageY);
  }

  private onMouseMove(event: MouseEvent): void {
    const isPressed = event.buttons === 1;
    if (!isPressed) {
      return;
    }

    this.mousemoveThrottler.schedule(() => {
      this.updateAngleFromMousePosition(event.pageX, event.pageY);
      return Promise.resolve();
    });
  }

  private updateAngleFromMousePosition(mouseX: number, mouseY: number): void {
    const clock = this.shadow.querySelector('.clock');
    if (!clock) {
      return;
    }
    const {top, right, bottom, left} = clock.getBoundingClientRect();
    this.clockRadius = (right - left) / 2;
    const clockCenterX = (left + right) / 2;
    const clockCenterY = (bottom + top) / 2;
    const degree = -Math.atan2(mouseX - clockCenterX, mouseY - clockCenterY) * 180 / Math.PI + 180;
    const rawAngle = getAngleFromDegrees(degree, this.unit);
    this.angle = roundAngleByUnit(rawAngle, this.unit);
    this.render();
    this.dispatchEvent(new ValueChangedEvent(`${this.angle}${this.unit}`));
  }

  private render() {
    const {translateX, translateY} = get2DTranslationsForAngle(this.angle, this.unit, MiniIconWidth / 4);
    const miniHandStyle = {
      transform: `translate(${translateX}px, ${translateY}px) rotate(${this.angle}${this.unit})`,
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>
        .css-type {
          display: inline-block;
          position: relative;
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

        .center {
          width: 0.7em;
          height: 0.7em;
          border-radius: 10px;
          box-shadow: 0 0 2px hsl(0 0% 0% / 20%);
        }

        :host-context(.-theme-with-dark-background) .center {
          box-shadow: 0 0 2px hsl(0 0% 0% / 60%);
        }

        .dial {
          width: 2px;
          height: ${ClockDialLength}px;
          background-color: var(--dial-color);
          border-radius: 2px;
        }

        .hand {
          height: 50%;
          width: 0.3em;
          background: var(--accent-fg-color);
          box-shadow: var(--drop-shadow);
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

      <div class="css-type">
        <div class="preview">
          <div class="mini-icon" @mousedown=${this.onMiniIconClick}>
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
    const {translateX, translateY} = get2DTranslationsForAngle(this.angle, this.unit, this.clockRadius / 2);
    const handStyles = {
      transform: `translate(${translateX}px, ${translateY}px) rotate(${this.angle}${this.unit})`,
    };
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <div class="popover popover-css-angle" style=${styleMap({top: this.popoverStyleTop})}>
        <span class="pointer"></span>
        <div
          class="clock"
          @mousedown=${this.onMouseDown}
          @mousemove=${this.onMouseMove}>
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
        const {translateX, translateY} = get2DTranslationsForAngle(deg, AngleUnit.Deg, radius);
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

customElements.define('devtools-css-angle', CSSAngle);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-css-angle': CSSAngle;
  }
}

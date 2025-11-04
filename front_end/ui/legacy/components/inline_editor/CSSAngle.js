// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import './CSSAngleEditor.js';
import './CSSAngleSwatch.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Lit from '../../../lit/lit.js';
import cssAngleStyles from './cssAngle.css.js';
import { convertAngleUnit, getNewAngleFromEvent, getNextUnit, parseText, roundAngleByUnit, } from './CSSAngleUtils.js';
import { ValueChangedEvent } from './InlineEditorUtils.js';
const { render, html } = Lit;
const styleMap = Lit.Directives.styleMap;
export class PopoverToggledEvent extends Event {
    static eventName = 'popovertoggled';
    data;
    constructor(open) {
        super(PopoverToggledEvent.eventName, {});
        this.data = { open };
    }
}
export class UnitChangedEvent extends Event {
    static eventName = 'unitchanged';
    data;
    constructor(value) {
        super(UnitChangedEvent.eventName, {});
        this.data = { value };
    }
}
const DefaultAngle = {
    value: 0,
    unit: "rad" /* AngleUnit.RAD */,
};
export class CSSAngle extends HTMLElement {
    angle = DefaultAngle;
    displayedAngle = DefaultAngle;
    propertyValue = '';
    containingPane;
    angleElement = null;
    swatchElement = null;
    popoverOpen = false;
    popoverStyleTop = '';
    popoverStyleLeft = '';
    onMinifyingAction = this.minify.bind(this);
    set data(data) {
        const parsedResult = parseText(data.angleText);
        if (!parsedResult) {
            return;
        }
        this.angle = parsedResult;
        this.displayedAngle = { ...parsedResult };
        this.containingPane = data.containingPane;
        this.render();
    }
    disconnectedCallback() {
        this.unbindMinifyingAction();
    }
    // We bind and unbind mouse event listeners upon popping over and minifying,
    // because we anticipate most of the time this widget is minified even when
    // it's attached to the DOM tree.
    popOver() {
        if (!this.containingPane) {
            return;
        }
        if (!this.angleElement) {
            this.angleElement = this.querySelector('.css-angle');
        }
        if (!this.swatchElement) {
            this.swatchElement = this.querySelector('devtools-css-angle-swatch');
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
    addEventListener(type, listener, options) {
        super.addEventListener(type, listener, options);
    }
    minify() {
        if (this.popoverOpen === false) {
            return;
        }
        this.popoverOpen = false;
        this.dispatchEvent(new PopoverToggledEvent(false));
        this.unbindMinifyingAction();
        this.render();
    }
    updateProperty(value) {
        this.propertyValue = value;
        this.render();
    }
    updateAngle(angle) {
        this.displayedAngle = roundAngleByUnit(convertAngleUnit(angle, this.displayedAngle.unit));
        this.angle = this.displayedAngle;
        this.dispatchEvent(new ValueChangedEvent(`${this.angle.value}${this.angle.unit}`));
        this.render();
    }
    displayNextUnit() {
        const nextUnit = getNextUnit(this.displayedAngle.unit);
        this.displayedAngle = roundAngleByUnit(convertAngleUnit(this.angle, nextUnit));
        this.dispatchEvent(new UnitChangedEvent(`${this.displayedAngle.value}${this.displayedAngle.unit}`));
    }
    bindMinifyingAction() {
        document.addEventListener('mousedown', this.onMinifyingAction);
        if (this.containingPane) {
            this.containingPane.addEventListener('scroll', this.onMinifyingAction);
        }
    }
    unbindMinifyingAction() {
        document.removeEventListener('mousedown', this.onMinifyingAction);
        if (this.containingPane) {
            this.containingPane.removeEventListener('scroll', this.onMinifyingAction);
        }
    }
    onMiniIconClick(event) {
        event.stopPropagation();
        if (event.shiftKey && !this.popoverOpen) {
            this.displayNextUnit();
            return;
        }
        this.popoverOpen ? this.minify() : this.popOver();
    }
    // Fix that the previous text will be selected when double-clicking the angle icon
    consume(event) {
        event.stopPropagation();
    }
    onKeydown(event) {
        if (!this.popoverOpen) {
            if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
                this.onMiniIconClick(event);
                event.preventDefault();
            }
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
    render() {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        render(html `
      <style>${cssAngleStyles}</style>
      <div class="css-angle" @focusout=${this.minify} @keydown=${this.onKeydown} tabindex="-1">
        <div class="preview">
          <devtools-css-angle-swatch
            @click=${this.onMiniIconClick}
            @mousedown=${this.consume}
            @dblclick=${this.consume}
            .data=${{
            angle: this.angle,
        }}>
          </devtools-css-angle-swatch>
          <slot></slot>
        </div>
        ${this.popoverOpen ? this.renderPopover() : null}
      </div>
    `, this, {
            host: this,
        });
        // clang-format on
    }
    renderPopover() {
        let contextualBackground = '';
        if (this.propertyValue && !this.propertyValue.match(/url\(.*\)/i)) {
            contextualBackground = this.propertyValue;
        }
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return html `
      <devtools-css-angle-editor
        class="popover popover-css-angle"
        style=${styleMap({ top: this.popoverStyleTop, left: this.popoverStyleLeft })}
        .data=${{
            angle: this.angle,
            onAngleUpdate: (angle) => {
                this.updateAngle(angle);
            },
            background: contextualBackground,
        }}>
      </devtools-css-angle-editor>`;
        // clang-format on
    }
}
customElements.define('devtools-css-angle', CSSAngle);
//# sourceMappingURL=CSSAngle.js.map
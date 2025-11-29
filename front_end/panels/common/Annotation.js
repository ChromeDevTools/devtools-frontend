// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as Annotations from '../../ui/components/annotations/annotations.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import annotationStyles from './annotation.css.js';
export const DEFAULT_VIEW = (input, _, target) => {
    const { inputText: label, isExpanded, clickHandler } = input;
    // TODO(finnur): Use `x`, and `y` passed via `input` to set the coordinates for the
    // *Widget* (not the `overlay` div), then remove the `this.element.style` calls and
    // remove the lint override no-imperative-dom-api from the top.
    // clang-format off
    render(html `
    <style>${annotationStyles}</style>
    <div class='overlay' @click=${clickHandler}>${isExpanded ? label : '!'}</div>
    `, target);
    // clang-format on
};
export class Annotation extends UI.Widget.Widget {
    #view;
    #type;
    #inputText;
    #x = 0;
    #y = 0;
    #isExpanded = false;
    constructor(label, type, element, view = DEFAULT_VIEW) {
        super({ jslog: `${VisualLogging.panel('annotation').track({ resize: true })}`, useShadowDom: true });
        this.#view = view;
        this.#type = type;
        this.#isExpanded = this.#type === Annotations.AnnotationType.STYLE_RULE;
        this.#inputText = label;
    }
    #toggle() {
        this.#isExpanded = !this.#isExpanded;
        this.element.style.left = this.#isExpanded ? `${this.#x}px` : '0px';
        this.requestUpdate();
    }
    wasShown() {
        this.element.style.position = 'absolute';
        this.element.style.left = this.#isExpanded ? `${this.#x}px` : '0px';
        this.element.style.top = `${this.#y}px`;
        super.wasShown();
        this.requestUpdate();
    }
    performUpdate() {
        if (!this.isShowing()) {
            return;
        }
        const input = {
            inputText: this.#inputText,
            isExpanded: this.#isExpanded,
            x: this.#x,
            y: this.#y,
            clickHandler: this.#toggle.bind(this),
        };
        this.#view(input, undefined, this.contentElement);
    }
    hide() {
        this.detach();
    }
    getCoordinates() {
        return { x: this.#x, y: this.#y };
    }
    setCoordinates(x, y) {
        this.#x = x;
        this.#y = y;
        if (this.isShowing()) {
            this.element.style.left = this.#isExpanded ? `${this.#x}px` : '0px';
            this.element.style.top = `${this.#y}px`;
        }
        this.requestUpdate();
    }
}
//# sourceMappingURL=Annotation.js.map
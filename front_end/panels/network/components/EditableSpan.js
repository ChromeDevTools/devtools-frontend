// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import { Directives, html, render } from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import editableSpanStyles from './EditableSpan.css.js';
export class EditableSpan extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #editableRef = Directives.createRef();
    #value = '';
    get value() {
        return this.#value;
    }
    set value(value) {
        this.#value = value;
        this.performUpdate();
    }
    #onKeyDown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.target?.blur();
        }
    }
    #onInput(event) {
        this.#value = event.target.innerText;
    }
    #selectAllText(event) {
        const target = event.target;
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(target);
        selection?.removeAllRanges();
        selection?.addRange(range);
    }
    performUpdate() {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        render(html `
      <style>${editableSpanStyles}</style>
      <span
        ${Directives.ref(this.#editableRef)}
        contenteditable="plaintext-only"
        class="editable"
        tabindex="0"
        .innerText=${Directives.live(this.#value)}
        jslog=${VisualLogging.value('header-editor').track({ change: true, keydown: 'Enter|Escape' })}
        @focusin=${this.#selectAllText.bind(this)}
        @keydown=${this.#onKeyDown.bind(this)}
        @input=${this.#onInput.bind(this)}
        ></span>`, this.#shadow, { host: this });
        // clang-format on
    }
    focus() {
        requestAnimationFrame(() => {
            this.#editableRef.value?.focus();
        });
    }
}
customElements.define('devtools-editable-span', EditableSpan);
//# sourceMappingURL=EditableSpan.js.map
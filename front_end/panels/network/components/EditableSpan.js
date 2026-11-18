// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import editableSpanStyles from './EditableSpan.css.js';
export const DEFAULT_VIEW = (input, output, target) => {
    const onFocusIn = (event) => {
        const span = event.target;
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(span);
        selection?.removeAllRanges();
        selection?.addRange(range);
    };
    const onKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.target?.blur();
        }
    };
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html `
    <style>${editableSpanStyles}</style>
    <span
      ${Directives.ref(el => {
        if (el instanceof HTMLElement) {
            output.focus = () => el.focus();
        }
        else {
            output.focus = undefined;
        }
    })}
      contenteditable="plaintext-only"
      class="editable"
      tabindex="0"
      .innerText=${Directives.live(input.value)}
      jslog=${VisualLogging.value('header-editor').track({ change: true, keydown: 'Enter|Escape' })}
      @focusin=${onFocusIn}
      @keydown=${onKeyDown}
      @input=${(event) => input.onInput(event.target.innerText)}
      ></span>`, target);
    // clang-format on
};
export class EditableSpan extends UI.Widget.Widget {
    #view;
    #viewOutput = {};
    #value = '';
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    get value() {
        return this.#value;
    }
    set value(value) {
        if (this.#value === value) {
            return;
        }
        this.#value = value;
        this.requestUpdate();
    }
    #onInput = (value) => {
        this.#value = value;
    };
    performUpdate() {
        const viewInput = {
            value: this.#value,
            onInput: this.#onInput,
        };
        this.#view(viewInput, this.#viewOutput, this.contentElement);
    }
    focus() {
        // Wait for any scheduled UI.Widget/Lit update to finish rendering before focusing.
        void this.updateComplete.then(() => {
            this.#viewOutput.focus?.();
        });
    }
}
//# sourceMappingURL=EditableSpan.js.map
// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/kit/kit.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { html, render } from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import elementsTreeExpandButtonStyles from './elementsTreeExpandButton.css.js';
const UIStrings = {
    /**
     * @description ARIA label for a button expanding a collapsed subtree.
     */
    expand: 'Expand',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/ElementsTreeExpandButton.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    // This button's innerText will be tested by e2e test and blink layout tests.
    // It can't have any other characters like '\n' or space, otherwise it will break tests.
    render(html `
      <style>${elementsTreeExpandButtonStyles}</style>
      <button
        class="expand-button"
        tabindex="-1"
        aria-label=${i18nString(UIStrings.expand)}
        jslog=${VisualLogging.action('expand').track({ click: true })}
        @click=${() => input.clickHandler()}><devtools-icon name="dots-horizontal"></devtools-icon></button>`, target, { container: { classes: ['elements-tree-expand-button'] } });
    // clang-format on
};
export class ElementsTreeExpandButton extends UI.Widget.Widget {
    #clickHandler = () => { };
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true, classes: ['elements-tree-expand-button'] });
        this.#view = view;
    }
    set clickHandler(clickHandler) {
        if (this.#clickHandler === clickHandler) {
            return;
        }
        this.#clickHandler = clickHandler;
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({ clickHandler: this.#clickHandler }, undefined, this.contentElement);
    }
}
//# sourceMappingURL=ElementsTreeExpandButton.js.map
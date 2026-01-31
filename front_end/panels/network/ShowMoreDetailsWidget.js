// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
const UIStrings = {
    /**
     * @description Text to show more content
     */
    showMore: 'Show more',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/ShowMoreDetailsWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { render, html } = Lit;
const MAX_LENGTH = 3000;
export const DEFAULT_VIEW = (input, output, target) => {
    const onContextMenuShowMore = (event) => {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        if (input.copy) {
            contextMenu.clipboardSection().appendItem(input.copy.menuItem, input.copy.handler);
        }
        if (!input.showMore) {
            contextMenu.newSection().appendItem(i18nString(UIStrings.showMore), input.onToggle, { jslogContext: 'show-more' });
        }
        void contextMenu.show();
    };
    render(html `<span
            @contextmenu=${onContextMenuShowMore}
            >${input.showMore ? input.text : input.text.substr(0, MAX_LENGTH)}</span>
          ${!input.showMore && input.text.length > MAX_LENGTH ? html `<devtools-button
            .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
            .jslogContext=${'show-more'}
            @click=${input.onToggle}>
            ${i18nString(UIStrings.showMore)}
          </devtools-button>` :
        Lit.nothing}`, target);
};
export class ShowMoreDetailsWidget extends UI.Widget.Widget {
    #view;
    #text = '';
    #showMore = false;
    #copy = null;
    constructor(target, view = DEFAULT_VIEW) {
        super(target);
        this.#view = view;
    }
    get text() {
        return this.#text;
    }
    set text(text) {
        this.#text = text;
        this.requestUpdate();
    }
    set copy(copy) {
        this.#copy = copy;
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            copy: this.#copy,
            text: this.#text,
            showMore: this.#showMore,
            onToggle: () => {
                this.#showMore = true;
                this.requestUpdate();
            },
        }, {}, this.contentElement);
    }
}
//# sourceMappingURL=ShowMoreDetailsWidget.js.map
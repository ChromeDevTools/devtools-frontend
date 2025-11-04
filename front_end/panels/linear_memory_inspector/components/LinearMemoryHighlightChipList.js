// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/components/icon_button/icon_button.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import linearMemoryHighlightChipListStyles from './linearMemoryHighlightChipList.css.js';
const UIStrings = {
    /**
     * @description Tooltip text that appears when hovering over an inspected variable's button in the Linear Memory Highlight Chip List.
     * Clicking the button changes the displayed slice of computer memory in the Linear Memory inspector to contain the inspected variable's bytes.
     */
    jumpToAddress: 'Jump to this memory',
    /**
     * @description Tooltip text that appears when hovering over an inspected variable's delete button in the Linear Memory Highlight Chip List.
     * Clicking the delete button stops highlighting the variable's memory in the Linear Memory inspector.
     * 'Memory' is a slice of bytes in the computer memory.
     */
    deleteHighlight: 'Stop highlighting this memory',
};
const str_ = i18n.i18n.registerUIStrings('panels/linear_memory_inspector/components/LinearMemoryHighlightChipList.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { render, html } = Lit;
export class DeleteMemoryHighlightEvent extends Event {
    static eventName = 'deletememoryhighlight';
    data;
    constructor(highlightInfo) {
        super(DeleteMemoryHighlightEvent.eventName, { bubbles: true, composed: true });
        this.data = highlightInfo;
    }
}
export class JumpToHighlightedMemoryEvent extends Event {
    static eventName = 'jumptohighlightedmemory';
    data;
    constructor(address) {
        super(JumpToHighlightedMemoryEvent.eventName);
        this.data = address;
    }
}
export class LinearMemoryHighlightChipList extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #highlightedAreas = [];
    #focusedMemoryHighlight;
    set data(data) {
        this.#highlightedAreas = data.highlightInfos;
        this.#focusedMemoryHighlight = data.focusedMemoryHighlight;
        this.#render();
    }
    #render() {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        const chips = [];
        for (const highlightInfo of this.#highlightedAreas) {
            chips.push(this.#createChip(highlightInfo));
        }
        const result = html `
            <style>${linearMemoryHighlightChipListStyles}</style>
            <div class="highlight-chip-list">
              ${chips}
            </div>
        `;
        render(result, this.#shadow, { host: this });
        // clang-format on
    }
    #createChip(highlightInfo) {
        const expressionName = highlightInfo.name || '<anonymous>';
        const expressionType = highlightInfo.type;
        const isFocused = highlightInfo === this.#focusedMemoryHighlight;
        const classMap = {
            focused: isFocused,
            'highlight-chip': true,
        };
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return html `
      <div class=${Lit.Directives.classMap(classMap)}>
        <button class="jump-to-highlight-button" title=${i18nString(UIStrings.jumpToAddress)}
            jslog=${VisualLogging.action('linear-memory-inspector.jump-to-highlight').track({ click: true })}
            @click=${() => this.#onJumpToHighlightClick(highlightInfo.startAddress)}>
          <span class="source-code">
            <span class="value">${expressionName}</span>
            <span class="separator">: </span>
            <span>${expressionType}</span>
          </span>
        </button>
        <div class="delete-highlight-container">
          <button class="delete-highlight-button" title=${i18nString(UIStrings.deleteHighlight)}
              jslog=${VisualLogging.action('linear-memory-inspector.delete-highlight').track({ click: true })}
              @click=${() => this.#onDeleteHighlightClick(highlightInfo)}>
            <devtools-icon name="cross" class="medium">
            </devtools-icon>
          </button>
        </div>
      </div>
    `;
        // clang-format off
    }
    #onJumpToHighlightClick(startAddress) {
        this.dispatchEvent(new JumpToHighlightedMemoryEvent(startAddress));
    }
    #onDeleteHighlightClick(highlight) {
        this.dispatchEvent(new DeleteMemoryHighlightEvent(highlight));
    }
}
customElements.define('devtools-linear-memory-highlight-chip-list', LinearMemoryHighlightChipList);
//# sourceMappingURL=LinearMemoryHighlightChipList.js.map
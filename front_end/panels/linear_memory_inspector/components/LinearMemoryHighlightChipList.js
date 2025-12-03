// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/kit/kit.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../../ui/lit/lit.js';
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
const { classMap } = Directives;
const DEFAULT_VIEW = (input, output, target) => {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html `
    <style>${linearMemoryHighlightChipListStyles}</style>
    <div class="highlight-chip-list">
      ${input.highlightInfos.map(highlightInfo => renderChip(highlightInfo, input))}
    </div>`, target);
    // clang-format on
};
function renderChip(highlightInfo, input) {
    const expressionName = highlightInfo.name || '<anonymous>';
    const expressionType = highlightInfo.type;
    const isFocused = highlightInfo === input.focusedMemoryHighlight;
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html `
    <div class=${classMap({ focused: isFocused, 'highlight-chip': true })}>
      <button class="jump-to-highlight-button"
              title=${i18nString(UIStrings.jumpToAddress)}
              jslog=${VisualLogging.action('linear-memory-inspector.jump-to-highlight')
        .track({ click: true })}
              @click=${() => input.onJumpToAddress(highlightInfo.startAddress)}>
        <span class="source-code">
          <span class="value">${expressionName}</span>
          <span class="separator">: </span>
          <span>${expressionType}</span>
        </span>
      </button>
      <div class="delete-highlight-container">
        <button class="delete-highlight-button" title=${i18nString(UIStrings.deleteHighlight)}
            jslog=${VisualLogging.action('linear-memory-inspector.delete-highlight')
        .track({ click: true })}
            @click=${() => input.onDeleteHighlight(highlightInfo)}>
          <devtools-icon name="cross" class="medium">
          </devtools-icon>
        </button>
      </div>
    </div>`;
    // clang-format off
}
export class LinearMemoryHighlightChipList extends UI.Widget.Widget {
    #highlightedAreas = [];
    #focusedMemoryHighlight;
    #jumpToAddress = (_) => { };
    #deleteHighlight = (_) => { };
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
    }
    set highlightInfos(highlightInfos) {
        this.#highlightedAreas = highlightInfos;
        this.requestUpdate();
    }
    get highlightInfos() {
        return this.#highlightedAreas;
    }
    set focusedMemoryHighlight(focusedMemoryHighlight) {
        this.#focusedMemoryHighlight = focusedMemoryHighlight;
        this.requestUpdate();
    }
    get focusedMemoryHighlight() {
        return this.#focusedMemoryHighlight;
    }
    set jumpToAddress(jumpToAddress) {
        this.#jumpToAddress = jumpToAddress;
        this.requestUpdate();
    }
    get jumpToAddress() {
        return this.#jumpToAddress;
    }
    set deleteHighlight(deleteHighlight) {
        this.#deleteHighlight = deleteHighlight;
        this.requestUpdate();
    }
    get deleteHighlight() {
        return this.#deleteHighlight;
    }
    performUpdate() {
        this.#view({
            highlightInfos: this.#highlightedAreas,
            focusedMemoryHighlight: this.#focusedMemoryHighlight,
            onJumpToAddress: this.#jumpToAddress,
            onDeleteHighlight: this.#deleteHighlight,
        }, undefined, this.contentElement);
    }
}
//# sourceMappingURL=LinearMemoryHighlightChipList.js.map
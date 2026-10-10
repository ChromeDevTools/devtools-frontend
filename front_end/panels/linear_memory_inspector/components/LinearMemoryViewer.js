// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import { toHexString } from './LinearMemoryInspectorUtils.js';
import linearMemoryViewerStyles from './linearMemoryViewer.css.js';
const { render, html, nothing } = Lit;
const BYTE_GROUP_MARGIN = 8;
const BYTE_GROUP_SIZE = 4;
export class LinearMemoryViewer extends UI.Widget.Widget {
    #view;
    #output = {};
    #resizeObserver = new ResizeObserver(() => this.#resize());
    #memory = new Uint8Array();
    #address = 0;
    #memoryOffset = 0;
    #highlightInfo;
    #focusedMemoryHighlight;
    #onByteSelected;
    #onNumBytesPerPageChanged;
    #numRows = 1;
    #numBytesInRow = BYTE_GROUP_SIZE;
    #focusOnByte = true;
    #lastKeyUpdateSent = undefined;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    set memory(memory) {
        this.#memory = memory;
        this.requestUpdate();
    }
    set address(address) {
        this.#address = address;
        this.requestUpdate();
    }
    set memoryOffset(memoryOffset) {
        this.#memoryOffset = memoryOffset;
        this.requestUpdate();
    }
    /** Whether the viewer takes keyboard focus whenever it is updated. */
    set focusOnByte(focusOnByte) {
        this.#focusOnByte = focusOnByte;
        this.requestUpdate();
    }
    set highlightInfo(highlightInfo) {
        this.#highlightInfo = highlightInfo;
        this.requestUpdate();
    }
    set focusedMemoryHighlight(focusedMemoryHighlight) {
        this.#focusedMemoryHighlight = focusedMemoryHighlight;
        this.requestUpdate();
    }
    set onByteSelected(onByteSelected) {
        this.#onByteSelected = onByteSelected;
        this.requestUpdate();
    }
    set onNumBytesPerPageChanged(onNumBytesPerPageChanged) {
        this.#onNumBytesPerPageChanged = onNumBytesPerPageChanged;
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        this.#resizeObserver.observe(this.element);
        this.requestUpdate();
    }
    willHide() {
        this.#resizeObserver.disconnect();
        super.willHide();
    }
    performUpdate() {
        if (this.#address < this.#memoryOffset || this.#address > this.#memoryOffset + this.#memory.length ||
            this.#address < 0) {
            throw new Error('Address is out of bounds.');
        }
        if (this.#memoryOffset < 0) {
            throw new Error('Memory offset has to be greater or equal to zero.');
        }
        this.#updateDimensions();
        this.#render();
        this.#focusOnView();
    }
    #focusOnView() {
        if (this.#focusOnByte) {
            this.#output.focusView?.();
        }
    }
    #resize() {
        this.requestUpdate();
        void this.updateComplete.then(() => {
            this.#onNumBytesPerPageChanged?.(this.#numBytesInRow * this.#numRows);
        });
    }
    /** Recomputes the number of rows and (byte) columns that fit into the current view. */
    #updateDimensions() {
        if (this.element.clientWidth === 0 || this.element.clientHeight === 0) {
            this.#numBytesInRow = BYTE_GROUP_SIZE;
            this.#numRows = 1;
            return;
        }
        // We initially just plot one row with one byte group (here: byte group size of 4).
        // Depending on that initially plotted row we can determine how many rows and
        // bytes per row we can fit.
        // >    0000000 | b0 b1 b2 b4 | a0 a1 a2 a3    <
        //      ^-------^ ^-^           ^-^
        //          |     byteCellWidth textCellWidth
        //          |
        //     addressTextAndDividerWidth
        //  ^--^   +     ^----------------------------^
        //      widthToFill
        const layout = this.#output.measureLayout?.();
        if (!layout) {
            this.#numBytesInRow = BYTE_GROUP_SIZE;
            this.#numRows = 1;
            return;
        }
        // Calculate the width required for each (unsplittable) group of bytes.
        const groupWidth = BYTE_GROUP_SIZE * (layout.byteCellWidth + layout.textCellWidth) + BYTE_GROUP_MARGIN;
        // Calculate the width to fill.
        // this.element.clientWidth is rounded, while the other values are not. Subtract 1 to make
        // sure that we correctly calculate the widths.
        const widthToFill = this.element.clientWidth - 1 - layout.addressTextAndDividerWidth - layout.dividerWidth;
        if (widthToFill < groupWidth) {
            this.#numBytesInRow = BYTE_GROUP_SIZE;
            this.#numRows = 1;
            return;
        }
        this.#numBytesInRow = Math.floor(widthToFill / groupWidth) * BYTE_GROUP_SIZE;
        this.#numRows = Math.floor(this.element.clientHeight / layout.rowHeight);
    }
    #render() {
        const input = {
            memory: this.#memory,
            address: this.#address,
            memoryOffset: this.#memoryOffset,
            numRows: this.#numRows,
            numBytesInRow: this.#numBytesInRow,
            highlightInfo: this.#highlightInfo,
            focusedMemoryHighlight: this.#focusedMemoryHighlight,
            onByteSelected: this.#onByteSelected,
            onKeyDown: this.#onKeyDown.bind(this),
        };
        this.#view(input, this.#output, this.contentElement);
    }
    #onKeyDown(event) {
        const keyboardEvent = event;
        let newAddress = undefined;
        if (keyboardEvent.code === 'ArrowUp') {
            newAddress = this.#address - this.#numBytesInRow;
        }
        else if (keyboardEvent.code === 'ArrowDown') {
            newAddress = this.#address + this.#numBytesInRow;
        }
        else if (keyboardEvent.code === 'ArrowLeft') {
            newAddress = this.#address - 1;
        }
        else if (keyboardEvent.code === 'ArrowRight') {
            newAddress = this.#address + 1;
        }
        else if (keyboardEvent.code === 'PageUp') {
            newAddress = this.#address - this.#numBytesInRow * this.#numRows;
        }
        else if (keyboardEvent.code === 'PageDown') {
            newAddress = this.#address + this.#numBytesInRow * this.#numRows;
        }
        if (newAddress !== undefined && newAddress !== this.#lastKeyUpdateSent) {
            this.#lastKeyUpdateSent = newAddress;
            this.#onByteSelected?.(newAddress);
        }
    }
}
export const DEFAULT_VIEW = (input, output, target) => {
    const jslog = VisualLogging.section()
        .track({ keydown: 'ArrowUp|ArrowDown|ArrowLeft|ArrowRight|PageUp|PageDown' })
        .context('linear-memory-inspector.viewer');
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html `
    <style>${linearMemoryViewerStyles}</style>
    <div class="view" tabindex="0" @keydown=${input.onKeyDown} jslog=${jslog}
         style="--byte-group-margin: ${BYTE_GROUP_MARGIN}px">
      ${renderView(input)}
    </div>
    `, target);
    // clang-format on
    output.focusView = () => target.querySelector('.view')?.focus();
    output.measureLayout = () => measureLayout(target);
};
function renderView(input) {
    const itemTemplates = [];
    for (let i = 0; i < input.numRows; ++i) {
        itemTemplates.push(renderRow(input, i));
    }
    return html `${itemTemplates}`;
}
function renderRow(input, row) {
    const { startIndex, endIndex } = { startIndex: row * input.numBytesInRow, endIndex: (row + 1) * input.numBytesInRow };
    const classMap = {
        address: true,
        selected: Math.floor((input.address - input.memoryOffset) / input.numBytesInRow) === row,
    };
    // clang-format off
    return html `
  <div class="row" jslog=${VisualLogging.tableRow('linear-memory-row')}>
    <span class=${Lit.Directives.classMap(classMap)}>${toHexString({ number: startIndex + input.memoryOffset, pad: 8, prefix: false })}</span>
    <span class="divider"></span>
    ${renderByteValues(input, startIndex, endIndex)}
    <span class="divider"></span>
    ${renderCharacterValues(input, startIndex, endIndex)}
  </div>
  `;
    // clang-format on
}
function renderByteValues(input, startIndex, endIndex) {
    const cells = [];
    for (let i = startIndex; i < endIndex; ++i) {
        const actualIndex = i + input.memoryOffset;
        // Add margin after each group of bytes of size byteGroupSize.
        const addMargin = i !== startIndex && (i - startIndex) % BYTE_GROUP_SIZE === 0;
        const selected = i === input.address - input.memoryOffset;
        const highlighted = shouldBeHighlighted(input, actualIndex);
        const focusedMemoryArea = isFocusedArea(input, actualIndex);
        const classMap = {
            cell: true,
            'byte-cell': true,
            'byte-group-margin': addMargin,
            selected,
            'highlight-area': highlighted,
            'focused-area': focusedMemoryArea,
        };
        const isSelectableCell = i < input.memory.length;
        const byteValue = isSelectableCell ? html `${toHexString({ number: input.memory[i], pad: 2, prefix: false })}` : nothing;
        const onSelectedByte = isSelectableCell ? () => input.onByteSelected?.(actualIndex) : nothing;
        const jslog = VisualLogging.tableCell('linear-memory-inspector.byte-cell').track({ click: true });
        // clang-format off
        cells.push(html `<span class=${Lit.Directives.classMap(classMap)} @click=${onSelectedByte} jslog=${jslog}>${byteValue}</span>`);
        // clang-format on
    }
    return html `${cells}`;
}
function renderCharacterValues(input, startIndex, endIndex) {
    const cells = [];
    for (let i = startIndex; i < endIndex; ++i) {
        const actualIndex = i + input.memoryOffset;
        const highlighted = shouldBeHighlighted(input, actualIndex);
        const focusedMemoryArea = isFocusedArea(input, actualIndex);
        const classMap = {
            cell: true,
            'text-cell': true,
            selected: input.address - input.memoryOffset === i,
            'highlight-area': highlighted,
            'focused-area': focusedMemoryArea,
        };
        const isSelectableCell = i < input.memory.length;
        const value = isSelectableCell ? html `${toAscii(input.memory[i])}` : nothing;
        const onSelectedByte = isSelectableCell ? () => input.onByteSelected?.(actualIndex) : nothing;
        const jslog = VisualLogging.tableCell('linear-memory-inspector.text-cell').track({ click: true });
        // clang-format off
        cells.push(html `<span class=${Lit.Directives.classMap(classMap)} @click=${onSelectedByte} jslog=${jslog}>${value}</span>`);
        // clang-format on
    }
    return html `${cells}`;
}
function toAscii(byte) {
    if (byte >= 20 && byte <= 0x7F) {
        return String.fromCharCode(byte);
    }
    return '.';
}
function shouldBeHighlighted(input, index) {
    if (input.highlightInfo === undefined) {
        return false;
    }
    return input.highlightInfo.startAddress <= index &&
        index < input.highlightInfo.startAddress + input.highlightInfo.size;
}
function isFocusedArea(input, index) {
    if (!input.focusedMemoryHighlight) {
        return false;
    }
    return input.focusedMemoryHighlight.startAddress <= index &&
        index < input.focusedMemoryHighlight.startAddress + input.focusedMemoryHighlight.size;
}
/** Measures the first rendered row, or returns undefined if nothing has been rendered yet. */
function measureLayout(target) {
    const firstByteCell = target.querySelector('.byte-cell');
    const textCell = target.querySelector('.text-cell');
    const divider = target.querySelector('.divider');
    const rowElement = target.querySelector('.row');
    const addressText = target.querySelector('.address');
    if (!firstByteCell || !textCell || !divider || !rowElement || !addressText) {
        return undefined;
    }
    return {
        byteCellWidth: firstByteCell.getBoundingClientRect().width,
        textCellWidth: textCell.getBoundingClientRect().width,
        dividerWidth: divider.getBoundingClientRect().width,
        addressTextAndDividerWidth: firstByteCell.getBoundingClientRect().left - addressText.getBoundingClientRect().left,
        rowHeight: rowElement.clientHeight,
    };
}
//# sourceMappingURL=LinearMemoryViewer.js.map
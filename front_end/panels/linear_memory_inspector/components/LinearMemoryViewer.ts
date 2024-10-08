// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import {toHexString} from './LinearMemoryInspectorUtils.js';
import linearMemoryViewerStyles from './linearMemoryViewer.css.js';
import {type HighlightInfo} from './LinearMemoryViewerUtils.js';

const {render, html} = LitHtml;

export interface LinearMemoryViewerData {
  memory: Uint8Array;
  address: number;
  memoryOffset: number;
  focus: boolean;
  highlightInfo?: HighlightInfo;
  focusedMemoryHighlight?: HighlightInfo;
}

export class ByteSelectedEvent extends Event {
  static readonly eventName = 'byteselected';
  data: number;

  constructor(address: number) {
    super(ByteSelectedEvent.eventName);
    this.data = address;
  }
}

export class ResizeEvent extends Event {
  static readonly eventName = 'resize';
  data: number;

  constructor(numBytesPerPage: number) {
    super(ResizeEvent.eventName);
    this.data = numBytesPerPage;
  }
}

const BYTE_GROUP_MARGIN = 8;
const BYTE_GROUP_SIZE = 4;

export class LinearMemoryViewer extends HTMLElement {

  readonly #shadow = this.attachShadow({mode: 'open'});

  readonly #resizeObserver = new ResizeObserver(() => this.#resize());
  #isObservingResize = false;

  #memory = new Uint8Array();
  #address = 0;
  #memoryOffset = 0;
  #highlightInfo?: HighlightInfo;
  #focusedMemoryHighlight?: HighlightInfo;

  #numRows = 1;
  #numBytesInRow = BYTE_GROUP_SIZE;

  #focusOnByte = true;

  #lastKeyUpdateSent: number|undefined = undefined;

  set data(data: LinearMemoryViewerData) {
    if (data.address < data.memoryOffset || data.address > data.memoryOffset + data.memory.length || data.address < 0) {
      throw new Error('Address is out of bounds.');
    }

    if (data.memoryOffset < 0) {
      throw new Error('Memory offset has to be greater or equal to zero.');
    }

    this.#memory = data.memory;
    this.#address = data.address;
    this.#highlightInfo = data.highlightInfo;
    this.#focusedMemoryHighlight = data.focusedMemoryHighlight;
    this.#memoryOffset = data.memoryOffset;
    this.#focusOnByte = data.focus;
    this.#update();
  }

  connectedCallback(): void {
    this.style.setProperty('--byte-group-margin', `${BYTE_GROUP_MARGIN}px`);
    this.#shadow.adoptedStyleSheets = [linearMemoryViewerStyles];
  }

  disconnectedCallback(): void {
    this.#isObservingResize = false;
    this.#resizeObserver.disconnect();
  }

  #update(): void {
    this.#updateDimensions();
    this.#render();
    this.#focusOnView();
    this.#engageResizeObserver();
  }

  #focusOnView(): void {
    if (this.#focusOnByte) {
      const view = this.#shadow.querySelector<HTMLDivElement>('.view');
      if (view) {
        view.focus();
      }
    }
  }

  #resize(): void {
    this.#update();
    this.dispatchEvent(new ResizeEvent(this.#numBytesInRow * this.#numRows));
  }

  /** Recomputes the number of rows and (byte) columns that fit into the current view. */
  #updateDimensions(): void {
    if (this.clientWidth === 0 || this.clientHeight === 0 || !this.shadowRoot) {
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

    const firstByteCell = this.shadowRoot.querySelector('.byte-cell');
    const textCell = this.shadowRoot.querySelector('.text-cell');
    const divider = this.shadowRoot.querySelector('.divider');
    const rowElement = this.shadowRoot.querySelector('.row');
    const addressText = this.shadowRoot.querySelector('.address');

    if (!firstByteCell || !textCell || !divider || !rowElement || !addressText) {
      this.#numBytesInRow = BYTE_GROUP_SIZE;
      this.#numRows = 1;
      return;
    }

    // Calculate the width required for each (unsplittable) group of bytes.
    const byteCellWidth = firstByteCell.getBoundingClientRect().width;
    const textCellWidth = textCell.getBoundingClientRect().width;
    const groupWidth = BYTE_GROUP_SIZE * (byteCellWidth + textCellWidth) + BYTE_GROUP_MARGIN;

    // Calculate the width to fill.
    const dividerWidth = divider.getBoundingClientRect().width;
    const addressTextAndDividerWidth =
        firstByteCell.getBoundingClientRect().left - addressText.getBoundingClientRect().left;

    // this.clientWidth is rounded, while the other values are not. Subtract 1 to make
    // sure that we correctly calculate the widths.
    const widthToFill = this.clientWidth - 1 - addressTextAndDividerWidth - dividerWidth;

    if (widthToFill < groupWidth) {
      this.#numBytesInRow = BYTE_GROUP_SIZE;
      this.#numRows = 1;
      return;
    }
    this.#numBytesInRow = Math.floor(widthToFill / groupWidth) * BYTE_GROUP_SIZE;
    this.#numRows = Math.floor(this.clientHeight / rowElement.clientHeight);
  }

  #engageResizeObserver(): void {
    if (!this.#resizeObserver || this.#isObservingResize) {
      return;
    }

    this.#resizeObserver.observe(this);
    this.#isObservingResize = true;
  }

  #render(): void {
    const jslog = VisualLogging.section()
                      .track({keydown: 'ArrowUp|ArrowDown|ArrowLeft|ArrowRight|PageUp|PageDown'})
                      .context('linear-memory-inspector.viewer');
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="view" tabindex="0" @keydown=${this.#onKeyDown} jslog=${jslog}>
        ${this.#renderView()}
      </div>
      `, this.#shadow, {host: this});
  }

  #onKeyDown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    let newAddress = undefined;
    if (keyboardEvent.code === 'ArrowUp') {
      newAddress = this.#address - this.#numBytesInRow;
    } else if (keyboardEvent.code === 'ArrowDown') {
      newAddress = this.#address + this.#numBytesInRow;
    } else if (keyboardEvent.code === 'ArrowLeft') {
      newAddress = this.#address - 1;
    } else if (keyboardEvent.code === 'ArrowRight') {
      newAddress = this.#address + 1;
    } else if (keyboardEvent.code === 'PageUp') {
      newAddress = this.#address - this.#numBytesInRow * this.#numRows;
    } else if (keyboardEvent.code === 'PageDown') {
      newAddress = this.#address + this.#numBytesInRow * this.#numRows;
    }

    if (newAddress !== undefined && newAddress !== this.#lastKeyUpdateSent) {
      this.#lastKeyUpdateSent = newAddress;
      this.dispatchEvent(new ByteSelectedEvent(newAddress));
    }
  }

  #renderView(): LitHtml.TemplateResult {
    const itemTemplates = [];
    for (let i = 0; i < this.#numRows; ++i) {
      itemTemplates.push(this.#renderRow(i));
    }
    return html`${itemTemplates}`;
  }

  #renderRow(row: number): LitHtml.TemplateResult {
    const {startIndex, endIndex} = {startIndex: row * this.#numBytesInRow, endIndex: (row + 1) * this.#numBytesInRow};

    const classMap = {
      address: true,
      selected: Math.floor((this.#address - this.#memoryOffset) / this.#numBytesInRow) === row,
    };
    return html`
    <div class="row">
      <span class=${LitHtml.Directives.classMap(classMap)}>${toHexString({number: startIndex + this.#memoryOffset, pad: 8, prefix: false})}</span>
      <span class="divider"></span>
      ${this.#renderByteValues(startIndex, endIndex)}
      <span class="divider"></span>
      ${this.#renderCharacterValues(startIndex, endIndex)}
    </div>
    `;
  }

  #renderByteValues(startIndex: number, endIndex: number): LitHtml.TemplateResult {
    const cells = [];
    for (let i = startIndex; i < endIndex; ++i) {
      const actualIndex = i + this.#memoryOffset;
      // Add margin after each group of bytes of size byteGroupSize.
      const addMargin = i !== startIndex && (i - startIndex) % BYTE_GROUP_SIZE === 0;
      const selected = i === this.#address - this.#memoryOffset;
      const shouldBeHighlighted = this.#shouldBeHighlighted(actualIndex);
      const focusedMemoryArea = this.#isFocusedArea(actualIndex);
      const classMap = {
        cell: true,
        'byte-cell': true,
        'byte-group-margin': addMargin,
        selected,
        'highlight-area': shouldBeHighlighted,
        'focused-area': focusedMemoryArea,
      };
      const isSelectableCell = i < this.#memory.length;
      const byteValue = isSelectableCell ? html`${toHexString({number: this.#memory[i], pad: 2, prefix: false})}` : '';
      const onSelectedByte = isSelectableCell ? this.#onSelectedByte.bind(this, actualIndex) : '';
      const jslog = VisualLogging.tableCell('linear-memory-inspector.byte-cell').track({click: true});
      cells.push(html`<span class=${LitHtml.Directives.classMap(classMap)} @click=${onSelectedByte} jslog=${jslog}>${byteValue}</span>`);
    }
    return html`${cells}`;
  }

  #renderCharacterValues(startIndex: number, endIndex: number): LitHtml.TemplateResult {
    const cells = [];
    for (let i = startIndex; i < endIndex; ++i) {
      const actualIndex = i + this.#memoryOffset;
      const shouldBeHighlighted = this.#shouldBeHighlighted(actualIndex);
      const focusedMemoryArea = this.#isFocusedArea(actualIndex);
      const classMap = {
        cell: true,
        'text-cell': true,
        selected: this.#address - this.#memoryOffset === i,
        'highlight-area': shouldBeHighlighted,
        'focused-area': focusedMemoryArea,
      };
      const isSelectableCell = i < this.#memory.length;
      const value = isSelectableCell ? html`${this.#toAscii(this.#memory[i])}` : '';
      const onSelectedByte = isSelectableCell ? this.#onSelectedByte.bind(this, i + this.#memoryOffset) : '';
      const jslog = VisualLogging.tableCell('linear-memory-inspector.text-cell').track({click: true});
      cells.push(html`<span class=${LitHtml.Directives.classMap(classMap)} @click=${onSelectedByte} jslog=${jslog}>${value}</span>`);
    }
    return html`${cells}`;
  }

  #toAscii(byte: number): string {
    if (byte >= 20 && byte <= 0x7F) {
      return String.fromCharCode(byte);
    }
    return '.';
  }

  #onSelectedByte(index: number): void {
    this.dispatchEvent(new ByteSelectedEvent(index));
  }

  #shouldBeHighlighted(index: number): boolean {
    if (this.#highlightInfo === undefined) {
      return false;
    }
    return this.#highlightInfo.startAddress <= index
    && index < this.#highlightInfo.startAddress + this.#highlightInfo.size;
  }

  #isFocusedArea(index: number): boolean {
    if (!this.#focusedMemoryHighlight) {
      return false;
    }
    return this.#focusedMemoryHighlight.startAddress <= index
    && index < this.#focusedMemoryHighlight.startAddress + this.#focusedMemoryHighlight.size;
  }
}

customElements.define('devtools-linear-memory-inspector-viewer', LinearMemoryViewer);

declare global {

interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-viewer': LinearMemoryViewer;
  }
}

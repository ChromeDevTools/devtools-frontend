// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as LitHtml from '../../lit-html/lit-html.js';
import * as ComponentHelpers from '../helpers/helpers.js';

import {toHexString} from './LinearMemoryInspectorUtils.js';
import linearMemoryViewerStyles from './linearMemoryViewer.css.js';

const {render, html} = LitHtml;

export interface LinearMemoryViewerData {
  memory: Uint8Array;
  address: number;
  memoryOffset: number;
  focus: boolean;
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
export class LinearMemoryViewer extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-linear-memory-inspector-viewer`;

  private static readonly BYTE_GROUP_MARGIN = 8;
  private static readonly BYTE_GROUP_SIZE = 4;
  private readonly shadow = this.attachShadow({mode: 'open'});

  private readonly resizeObserver = new ResizeObserver(() => this.resize());
  private isObservingResize = false;

  private memory = new Uint8Array();
  private address = 0;
  private memoryOffset = 0;

  private numRows = 1;
  private numBytesInRow = LinearMemoryViewer.BYTE_GROUP_SIZE;

  private focusOnByte = true;

  private lastKeyUpdateSent: number|undefined = undefined;

  set data(data: LinearMemoryViewerData) {
    if (data.address < data.memoryOffset || data.address > data.memoryOffset + data.memory.length || data.address < 0) {
      throw new Error('Address is out of bounds.');
    }

    if (data.memoryOffset < 0) {
      throw new Error('Memory offset has to be greater or equal to zero.');
    }

    this.memory = data.memory;
    this.address = data.address;
    this.memoryOffset = data.memoryOffset;
    this.focusOnByte = data.focus;
    this.update();
  }

  connectedCallback(): void {
    ComponentHelpers.SetCSSProperty.set(this, '--byte-group-margin', `${LinearMemoryViewer.BYTE_GROUP_MARGIN}px`);
    this.shadow.adoptedStyleSheets = [linearMemoryViewerStyles];
  }

  disconnectedCallback(): void {
    this.isObservingResize = false;
    this.resizeObserver.disconnect();
  }

  private update(): void {
    this.updateDimensions();
    this.render();
    this.focusOnView();
    this.engageResizeObserver();
  }

  private focusOnView(): void {
    if (this.focusOnByte) {
      const view = this.shadow.querySelector<HTMLDivElement>('.view');
      if (view) {
        view.focus();
      }
    }
  }

  private resize(): void {
    this.update();
    this.dispatchEvent(new ResizeEvent(this.numBytesInRow * this.numRows));
  }

  /** Recomputes the number of rows and (byte) columns that fit into the current view. */
  private updateDimensions(): void {
    if (this.clientWidth === 0 || this.clientHeight === 0 || !this.shadowRoot) {
      this.numBytesInRow = LinearMemoryViewer.BYTE_GROUP_SIZE;
      this.numRows = 1;
      return;
    }

    // We initially just plot one row with one byte group (here: byte group size of 4).
    // Depending on that initially plotted row we can determine how many rows and
    // bytes per row we can fit:
    // > 0000000 | b0 b1 b2 b4 | a0 a1 a2 a3       <
    //             ^-^           ^-^
    //             byteCellWidth textCellWidth
    //             ^-------------------------------^
    //                 widthToFill

    const firstByteCell = this.shadowRoot.querySelector('.byte-cell');
    const textCell = this.shadowRoot.querySelector('.text-cell');
    const divider = this.shadowRoot.querySelector('.divider');
    const rowElement = this.shadowRoot.querySelector('.row');

    if (!firstByteCell || !textCell || !divider || !rowElement) {
      this.numBytesInRow = LinearMemoryViewer.BYTE_GROUP_SIZE;
      this.numRows = 1;
      return;
    }

    // Calculate the width required for each (unsplittable) group of bytes.
    const byteCellWidth = firstByteCell.getBoundingClientRect().width;
    const textCellWidth = textCell.getBoundingClientRect().width;
    const groupWidth =
        LinearMemoryViewer.BYTE_GROUP_SIZE * (byteCellWidth + textCellWidth) + LinearMemoryViewer.BYTE_GROUP_MARGIN;

    // Calculate the width to fill.
    const dividerWidth = divider.getBoundingClientRect().width;
    // this.clientWidth is rounded, while the other values are not. Subtract one to make
    // sure that we correctly calculate the widths.
    const widthToFill = this.clientWidth - 1 -
        (firstByteCell.getBoundingClientRect().left - this.getBoundingClientRect().left) - dividerWidth;
    if (widthToFill < groupWidth) {
      this.numBytesInRow = LinearMemoryViewer.BYTE_GROUP_SIZE;
      this.numRows = 1;
      return;
    }

    this.numBytesInRow = Math.floor(widthToFill / groupWidth) * LinearMemoryViewer.BYTE_GROUP_SIZE;
    this.numRows = Math.floor(this.clientHeight / rowElement.clientHeight);
  }

  private engageResizeObserver(): void {
    if (!this.resizeObserver || this.isObservingResize) {
      return;
    }

    this.resizeObserver.observe(this);
    this.isObservingResize = true;
  }

  private render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="view" tabindex="0" @keydown=${this.onKeyDown}>
          ${this.renderView()}
      </div>
      `, this.shadow, {host: this});
  }

  private onKeyDown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    let newAddress = undefined;
    if (keyboardEvent.code === 'ArrowUp') {
      newAddress = this.address - this.numBytesInRow;
    } else if (keyboardEvent.code === 'ArrowDown') {
      newAddress = this.address + this.numBytesInRow;
    } else if (keyboardEvent.code === 'ArrowLeft') {
      newAddress = this.address - 1;
    } else if (keyboardEvent.code === 'ArrowRight') {
      newAddress = this.address + 1;
    } else if (keyboardEvent.code === 'PageUp') {
      newAddress = this.address - this.numBytesInRow * this.numRows;
    } else if (keyboardEvent.code === 'PageDown') {
      newAddress = this.address + this.numBytesInRow * this.numRows;
    }

    if (newAddress !== undefined && newAddress !== this.lastKeyUpdateSent) {
      this.lastKeyUpdateSent = newAddress;
      this.dispatchEvent(new ByteSelectedEvent(newAddress));
    }
  }

  private renderView(): LitHtml.TemplateResult {
    const itemTemplates = [];
    for (let i = 0; i < this.numRows; ++i) {
      itemTemplates.push(this.renderRow(i));
    }
    return html`${itemTemplates}`;
  }

  private renderRow(row: number): LitHtml.TemplateResult {
    const {startIndex, endIndex} = {startIndex: row * this.numBytesInRow, endIndex: (row + 1) * this.numBytesInRow};

    const classMap = {
      address: true,
      selected: Math.floor((this.address - this.memoryOffset) / this.numBytesInRow) === row,
    };
    return html`
    <div class="row">
      <span class="${LitHtml.Directives.classMap(classMap)}">${toHexString({number: startIndex + this.memoryOffset, pad: 8, prefix: false})}</span>
      <span class="divider"></span>
      ${this.renderByteValues(startIndex, endIndex)}
      <span class="divider"></span>
      ${this.renderCharacterValues(startIndex, endIndex)}
    </div>
    `;
  }

  private renderByteValues(startIndex: number, endIndex: number): LitHtml.TemplateResult {
    const cells = [];
    for (let i = startIndex; i < endIndex; ++i) {
      // Add margin after each group of bytes of size byteGroupSize.
      const addMargin = i !== startIndex && (i - startIndex) % LinearMemoryViewer.BYTE_GROUP_SIZE === 0;
      const selected = i === this.address - this.memoryOffset;
      const classMap = {
        'cell': true,
        'byte-cell': true,
        'byte-group-margin': addMargin,
        selected,
      };
      const isSelectableCell = i < this.memory.length;
      const byteValue = isSelectableCell ? html`${toHexString({number: this.memory[i], pad: 2, prefix: false})}` : '';
      const actualIndex = i + this.memoryOffset;
      const onSelectedByte = isSelectableCell ? this.onSelectedByte.bind(this, actualIndex) : '';
      cells.push(html`<span class="${LitHtml.Directives.classMap(classMap)}" @click=${onSelectedByte}>${byteValue}</span>`);
    }
    return html`${cells}`;
  }

  private renderCharacterValues(startIndex: number, endIndex: number): LitHtml.TemplateResult {
    const cells = [];
    for (let i = startIndex; i < endIndex; ++i) {
      const classMap = {
        'cell': true,
        'text-cell': true,
        selected: this.address - this.memoryOffset === i,
      };
      const isSelectableCell = i < this.memory.length;
      const value = isSelectableCell ? html`${this.toAscii(this.memory[i])}` : '';
      const onSelectedByte = isSelectableCell ? this.onSelectedByte.bind(this, i + this.memoryOffset) : '';
      cells.push(html`<span class="${LitHtml.Directives.classMap(classMap)}" @click=${onSelectedByte}>${value}</span>`);
    }
    return html`${cells}`;
  }

  private toAscii(byte: number): string {
    if (byte >= 20 && byte <= 0x7F) {
      return String.fromCharCode(byte);
    }
    return '.';
  }

  private onSelectedByte(index: number): void {
    this.dispatchEvent(new ByteSelectedEvent(index));
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-linear-memory-inspector-viewer', LinearMemoryViewer);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-viewer': LinearMemoryViewer;
  }
}

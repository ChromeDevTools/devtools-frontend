// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as LitHtml from '../third_party/lit-html/lit-html.js';

import {toHexString} from './LinearMemoryInspectorUtils.js';

const {render, html} = LitHtml;

export interface LinearMemoryViewerData {
  memory: Uint8Array;
  address: number;
}

export class ByteSelectedEvent extends Event {
  data: number

  constructor(address: number) {
    super('byte-selected');
    this.data = address;
  }
}

export class LinearMemoryViewer extends HTMLElement {
  private static BYTE_GROUP_MARGIN = 8;
  private readonly shadow = this.attachShadow({mode: 'open'});

  private readonly resizeObserver = new ResizeObserver(() => this.update());
  private isObservingResize = false;

  private memory = new Uint8Array();
  private address = 0;
  private byteGroupSize = 4;

  private currentRow = 0;
  private numRows = 1;
  private numBytesPerRow = this.byteGroupSize;

  set data(data: LinearMemoryViewerData) {
    this.memory = data.memory;
    this.address = data.address;
    this.update();
  }

  disconnectedCallback() {
    this.isObservingResize = false;
    this.resizeObserver.disconnect();
  }

  private update() {
    this.currentRow = this.getRowForAddress(this.address);
    this.recomputeSize();
    this.render();
    this.engageResizeObserver();
  }

  private getRowForAddress(address: number) {
    return Math.floor((address) / this.numBytesPerRow);
  }

  /** Recomputes the number of rows and (byte) columns that fit into the current view. */
  private recomputeSize() {
    if (this.clientWidth === 0 || this.clientHeight === 0 || !this.shadowRoot) {
      return;
    }

    // We initially just plot one row with one byte group (here: byte group size of 4).
    // Depending on that initially plotted row we can determine how many rows and
    // bytes per rows we can fit:
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
      return;
    }

    // Calculate the width required for each (unsplittable) group of bytes.
    const byteCellWidth = firstByteCell.getBoundingClientRect().width;
    const textCellWidth = textCell.getBoundingClientRect().width;
    const groupWidth = this.byteGroupSize * (byteCellWidth + textCellWidth) + LinearMemoryViewer.BYTE_GROUP_MARGIN;

    // Calculate the width to fill.
    const dividerWidth = divider.getBoundingClientRect().width;
    const widthToFill = this.clientWidth - firstByteCell.getBoundingClientRect().left - dividerWidth;
    if (widthToFill < groupWidth) {
      this.numBytesPerRow = this.byteGroupSize;
      this.numRows = 1;
      return;
    }

    this.numBytesPerRow = Math.floor(widthToFill / groupWidth) * this.byteGroupSize;
    const maxNumRows = Math.ceil(this.memory.length / this.numBytesPerRow);
    this.numRows = Math.min(Math.floor(this.clientHeight / rowElement.getBoundingClientRect().height), maxNumRows);
  }

  private engageResizeObserver() {
    if (!this.resizeObserver || this.isObservingResize) {
      return;
    }

    this.resizeObserver.observe(this);
    this.isObservingResize = true;
  }

  private render() {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>
        :host {
          flex: auto;
          display: flex;
        }

        .view {
          overflow: hidden;
          text-overflow: ellipsis;
          box-sizing: border-box;
          --selected-cell-color: #1a1aa6;
        }

        .row {
          display: flex;
          height: 20px;
        }

        .cell {
          text-align: center;
          border: 1px solid transparent;
          border-radius: 2px;
        }

        .cell.selected {
          border-color: var(--selected-cell-color);
          color: var(--selected-cell-color);
          background-color: #cfe8fc;
        }

        .byte-cell {
          min-width: 21px;
        }

        .byte-group-margin {
          margin-left: ${LinearMemoryViewer.BYTE_GROUP_MARGIN}px;
        }

        .text-cell {
          min-width: 14px;
          color: var(--selected-cell-color);
        }

        .address {
          font-size: 11px;
          color: #9aa0a6;
        }

        .address.selected {
          font-weight: bold;
          color: #333333;
        }

        .divider {
          width: 1px;
          background-color: rgb(204, 204, 204);
          margin: 0px 4px 0px 4px;
        }
      </style>
      <div class="view">
          ${this.renderView()}
      </div>
      `, this.shadow, {eventContext: this});
  }

  private renderView() {
    const itemTemplates = [];
    for (let i = 0; i < this.numRows; ++i) {
      itemTemplates.push(this.renderRow(i));
    }
    return html`${itemTemplates}`;
  }

  private renderRow(row: number) {
    const startIndex = row * this.numBytesPerRow;
    const endIndex = startIndex + this.numBytesPerRow;

    const classMap = {
      'address': true,
      selected: this.currentRow === row,
    };
    return html`
    <div class="row">
      <span class="${LitHtml.Directives.classMap(classMap)}">${toHexString(startIndex, 8)}</span>
      <span class="divider"></span>
      ${this.renderByteValues(startIndex, endIndex)}
      <span class="divider"></span>
      ${this.renderCharacterValues(startIndex, endIndex)}
    </div>
    `;
  }

  private renderByteValues(startIndex: number, endIndex: number) {
    const cells = [];
    for (let i = startIndex; i < endIndex; ++i) {
      // Add margin after each group of bytes of size byteGroupSize.
      const addMargin = i !== startIndex && (i - startIndex) % this.byteGroupSize === 0;
      const classMap = {
        'cell': true,
        'byte-cell': true,
        'byte-group-margin': addMargin,
        selected: i === this.address,
      };
      const byteValue = i < this.memory.length ? html`${toHexString(this.memory[i], 2)}` : '';
      cells.push(html`
        <span class="${LitHtml.Directives.classMap(classMap)}" @click=${this.onSelectedByte(i)}>
          ${byteValue}
        </span>`);
    }
    return html`${cells}`;
  }

  private renderCharacterValues(startIndex: number, endIndex: number) {
    const cells = [];
    for (let i = startIndex; i < endIndex; ++i) {
      const classMap = {
        'cell': true,
        'text-cell': true,
        selected: this.address === i,
      };
      const value = i < this.memory.length ? html`${this.toAscii(this.memory[i])}` : '';
      cells.push(html`<span class="${LitHtml.Directives.classMap(classMap)}">${value}</span>`);
    }
    return html`${cells}`;
  }

  private toAscii(byte: number) {
    if (byte >= 20 && byte <= 0x7F) {
      return String.fromCharCode(byte);
    }
    return '.';
  }

  private onSelectedByte(index: number) {
    return () => {
      this.dispatchEvent(new ByteSelectedEvent(index));
    };
  }
}

customElements.define('devtools-linear-memory-inspector-viewer', LinearMemoryViewer);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-viewer': LinearMemoryViewer;
  }
}

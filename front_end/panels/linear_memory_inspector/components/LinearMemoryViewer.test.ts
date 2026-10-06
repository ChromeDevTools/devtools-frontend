// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {
  assertElements,
  assertScreenshot,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {createViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';

import * as LinearMemoryInspectorComponents from './components.js';

const {LinearMemoryViewer} = LinearMemoryInspectorComponents.LinearMemoryViewer;

const NUM_BYTES_PER_GROUP = 4;
export const VIEWER_BYTE_CELL_SELECTOR = '.byte-cell';
export const VIEWER_TEXT_CELL_SELECTOR = '.text-cell';
export const VIEWER_ROW_SELECTOR = '.row';
export const VIEWER_ADDRESS_SELECTOR = '.address';

interface ViewerData {
  memory: Uint8Array<ArrayBuffer>;
  address: number;
  memoryOffset: number;
  focusOnByte: boolean;
  highlightInfo?: LinearMemoryInspectorComponents.LinearMemoryViewerUtils.HighlightInfo;
  focusedMemoryHighlight?: LinearMemoryInspectorComponents.LinearMemoryViewerUtils.HighlightInfo;
  onByteSelected?: (address: number) => void;
}

function createViewer(data: ViewerData, view?: LinearMemoryInspectorComponents.LinearMemoryViewer.View):
    LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer {
  const viewer = new LinearMemoryViewer(undefined, view);
  viewer.memory = data.memory;
  viewer.address = data.address;
  viewer.memoryOffset = data.memoryOffset;
  viewer.focusOnByte = data.focusOnByte;
  viewer.highlightInfo = data.highlightInfo;
  viewer.focusedMemoryHighlight = data.focusedMemoryHighlight;
  viewer.onByteSelected = data.onByteSelected;
  return viewer;
}

/**
 * Shows the viewer in the given container and resolves with the number of
 * bytes per page once the viewer has completed its initial layout pass.
 */
function showViewerAndWaitForResize(viewer: LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer,
                                    container: HTMLElement): Promise<number> {
  return new Promise<number>(resolve => {
    viewer.onNumBytesPerPageChanged = resolve;
    viewer.markAsRoot();
    viewer.show(container);
  });
}

function createFlexWrapper(width: string, height: string): HTMLDivElement {
  const flexWrapper = document.createElement('div');
  flexWrapper.style.width = width;
  flexWrapper.style.height = height;
  flexWrapper.style.display = 'flex';
  return flexWrapper;
}

describe('LinearMemoryViewer', () => {
  async function setUpComponent() {
    const data = createComponentData();
    const onByteSelected = sinon.spy();
    const viewer = createViewer({...data, onByteSelected});

    const wrapper = renderElementIntoDOM(createFlexWrapper('500px', '500px'));
    const numBytesPerPage = await showViewerAndWaitForResize(viewer, wrapper);
    assert.isAbove(numBytesPerPage, 4);

    return {viewer, data, onByteSelected};
  }

  async function setUpComponentWithHighlightInfo() {
    const data = createComponentData();
    const highlightInfo: LinearMemoryInspectorComponents.LinearMemoryViewerUtils.HighlightInfo = {
      startAddress: 2,
      size: 21,  // A large enough odd number so that the highlight spans mulitple rows.
      type: 'bool[]',
    };
    const dataWithHighlightInfo = {
      ...data,
      highlightInfo,
    };
    const viewer = createViewer(dataWithHighlightInfo);

    const wrapper = renderElementIntoDOM(createFlexWrapper('500px', '500px'));
    const numBytesPerPage = await showViewerAndWaitForResize(viewer, wrapper);
    assert.isAbove(numBytesPerPage, 4);

    return {viewer, dataWithHighlightInfo};
  }

  function createComponentData() {
    const memory = [];
    for (let i = 0; i < 1000; ++i) {
      memory.push(i);
    }

    const data = {
      memory: new Uint8Array(memory),
      address: 2,
      memoryOffset: 0,
      focusOnByte: true,
    };

    return data;
  }

  function getCells(viewer: LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer,
                    cellSelector: string): NodeListOf<HTMLSpanElement> {
    const cells = viewer.contentElement.querySelectorAll(cellSelector);
    assertElements(cells, HTMLSpanElement);
    return cells;
  }

  function getCellsPerRow(viewer: LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer,
                          cellSelector: string) {
    const row = viewer.contentElement.querySelector(VIEWER_ROW_SELECTOR);
    assert.instanceOf(row, HTMLDivElement);
    const cellsPerRow = row.querySelectorAll(cellSelector);
    assert.isNotEmpty(cellsPerRow);
    assertElements(cellsPerRow, HTMLSpanElement);
    return cellsPerRow;
  }

  function assertSelectedCellIsHighlighted(
      viewer: LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer, cellSelector: string,
      index: number) {
    const selectedCells = getCells(viewer, cellSelector + '.selected');
    assert.lengthOf(selectedCells, 1);
    const selectedCell = selectedCells[0];

    const allCells = getCellsPerRow(viewer, cellSelector);
    assert.isAtLeast(allCells.length, index);
    const cellAtAddress = allCells[index];

    assert.strictEqual(selectedCell, cellAtAddress);
  }

  function assertByteSelectedOnKeyDown(viewer: LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer,
                                       onByteSelected: sinon.SinonSpy, code: string, expectedAddress: number) {
    const view = viewer.contentElement.querySelector('.view');
    assert.instanceOf(view, HTMLDivElement);
    view.dispatchEvent(new KeyboardEvent('keydown', {code}));
    sinon.assert.calledOnceWithExactly(onByteSelected, expectedAddress);
  }

  it('correctly renders bytes given a memory offset greater than zero', async () => {
    const data = createComponentData();
    data.memoryOffset = 1;
    assert.isAbove(data.address, data.memoryOffset);
    const viewer = createViewer(data);
    renderElementIntoDOM(viewer);
    await viewer.updateComplete;

    const selectedBytes = getCells(viewer, VIEWER_BYTE_CELL_SELECTOR + '.selected');
    assert.lengthOf(selectedBytes, 1);
    const selectedValue = parseInt(selectedBytes[0].innerText, 16);
    assert.strictEqual(selectedValue, data.memory[data.address - data.memoryOffset]);
  });

  it('calls onNumBytesPerPageChanged on resize', async () => {
    const viewer = createViewer(createComponentData());
    const thinWrapper = renderElementIntoDOM(createFlexWrapper('100px', '100px'));

    const numBytesPerPageBefore = await showViewerAndWaitForResize(viewer, thinWrapper);

    const numBytesPerPageAfter = await new Promise<number>(resolve => {
      viewer.onNumBytesPerPageChanged = resolve;
      thinWrapper.style.width = '800px';
    });

    assert.isAbove(numBytesPerPageAfter, numBytesPerPageBefore);
  });

  it('renders one address per row', async () => {
    const {viewer} = await setUpComponent();
    const rows = viewer.contentElement.querySelectorAll(VIEWER_ROW_SELECTOR);
    const addresses = viewer.contentElement.querySelectorAll(VIEWER_ADDRESS_SELECTOR);
    assert.isNotEmpty(rows);
    assert.strictEqual(rows.length, addresses.length);
  });

  it('renders addresses depending on the bytes per row', async () => {
    const {viewer, data} = await setUpComponent();
    const bytesPerRow = getCellsPerRow(viewer, VIEWER_BYTE_CELL_SELECTOR);
    const numBytesPerRow = bytesPerRow.length;

    const addresses = getCells(viewer, VIEWER_ADDRESS_SELECTOR);
    assert.isNotEmpty(addresses);

    for (let i = 0, currentAddress = data.memoryOffset; i < addresses.length; currentAddress += numBytesPerRow, ++i) {
      const addressElement = addresses[i];

      const hex = currentAddress.toString(16).toUpperCase().padStart(8, '0');
      assert.strictEqual(addressElement.innerText, hex);
    }
  });

  it('renders unsplittable byte group', async () => {
    const thinWrapper = document.createElement('div');
    thinWrapper.style.width = '10px';

    const viewer = createViewer(createComponentData());
    await showViewerAndWaitForResize(viewer, renderElementIntoDOM(thinWrapper));
    const bytesPerRow = getCellsPerRow(viewer, VIEWER_BYTE_CELL_SELECTOR);
    assert.strictEqual(bytesPerRow.length, NUM_BYTES_PER_GROUP);
  });

  it('renders byte values corresponding to memory set', async () => {
    const {viewer, data} = await setUpComponent();
    const bytes = getCells(viewer, VIEWER_BYTE_CELL_SELECTOR);

    const memory = data.memory;
    const bytesPerPage = bytes.length;
    const memoryStartAddress = Math.floor(data.address / bytesPerPage) * bytesPerPage;
    assert.isAtMost(bytes.length, memory.length);
    for (let i = 0; i < bytes.length; ++i) {
      const hex = memory[memoryStartAddress + i].toString(16).toUpperCase().padStart(2, '0');
      assert.strictEqual(bytes[i].innerText, hex);
    }
  });

  it('calls onByteSelected on selecting a byte value', async () => {
    const {viewer, data, onByteSelected} = await setUpComponent();

    const byte = viewer.contentElement.querySelector(VIEWER_BYTE_CELL_SELECTOR);
    assert.instanceOf(byte, HTMLSpanElement);

    byte.click();
    sinon.assert.calledOnceWithExactly(onByteSelected, data.memoryOffset);
  });

  it('renders as many ascii values as byte values in a row', async () => {
    const {viewer} = await setUpComponent();
    const bytes = getCellsPerRow(viewer, VIEWER_BYTE_CELL_SELECTOR);
    const ascii = getCellsPerRow(viewer, VIEWER_TEXT_CELL_SELECTOR);

    assert.strictEqual(bytes.length, ascii.length);
  });

  it('renders ascii values corresponding to bytes', async () => {
    const {viewer} = await setUpComponent();

    const asciiValues = getCells(viewer, VIEWER_TEXT_CELL_SELECTOR);
    const byteValues = getCells(viewer, VIEWER_BYTE_CELL_SELECTOR);
    assert.strictEqual(byteValues.length, asciiValues.length);

    const smallestPrintableAscii = 20;
    const largestPrintableAscii = 127;

    for (let i = 0; i < byteValues.length; ++i) {
      const byteValue = parseInt(byteValues[i].innerText, 16);
      const asciiText = asciiValues[i].innerText;
      if (byteValue < smallestPrintableAscii || byteValue > largestPrintableAscii) {
        assert.strictEqual(asciiText, '.');
      } else {
        assert.strictEqual(asciiText, String.fromCharCode(byteValue).trim());
      }
    }
  });

  it('calls onByteSelected on selecting an ascii value', async () => {
    const {viewer, data, onByteSelected} = await setUpComponent();

    const asciiCell = viewer.contentElement.querySelector(VIEWER_TEXT_CELL_SELECTOR);
    assert.instanceOf(asciiCell, HTMLSpanElement);

    asciiCell.click();
    sinon.assert.calledOnceWithExactly(onByteSelected, data.memoryOffset);
  });

  it('highlights selected byte value on setting an address', async () => {
    const memory = new Uint8Array([2, 3, 5, 3]);
    const address = 2;

    const viewer = createViewer({
      memory,
      address,
      memoryOffset: 0,
      focusOnByte: true,
    });
    renderElementIntoDOM(viewer);
    await viewer.updateComplete;

    assertSelectedCellIsHighlighted(viewer, VIEWER_BYTE_CELL_SELECTOR, address);
    assertSelectedCellIsHighlighted(viewer, VIEWER_TEXT_CELL_SELECTOR, address);
    assertSelectedCellIsHighlighted(viewer, VIEWER_ADDRESS_SELECTOR, 0);
  });

  it('calls onByteSelected on arrow left', async () => {
    const {viewer, data, onByteSelected} = await setUpComponent();
    const addressBefore = data.address;
    const expectedAddress = addressBefore - 1;
    assertByteSelectedOnKeyDown(viewer, onByteSelected, 'ArrowLeft', expectedAddress);
  });

  it('calls onByteSelected on arrow right', async () => {
    const {viewer, data, onByteSelected} = await setUpComponent();
    const addressBefore = data.address;
    const expectedAddress = addressBefore + 1;
    assertByteSelectedOnKeyDown(viewer, onByteSelected, 'ArrowRight', expectedAddress);
  });

  it('calls onByteSelected on arrow down', async () => {
    const {viewer, data, onByteSelected} = await setUpComponent();
    const addressBefore = data.address;

    const bytesPerRow = getCellsPerRow(viewer, VIEWER_BYTE_CELL_SELECTOR);
    const numBytesPerRow = bytesPerRow.length;
    const expectedAddress = addressBefore + numBytesPerRow;
    assertByteSelectedOnKeyDown(viewer, onByteSelected, 'ArrowDown', expectedAddress);
  });

  it('calls onByteSelected on arrow up', async () => {
    const {viewer, data, onByteSelected} = await setUpComponent();
    const addressBefore = data.address;

    const bytesPerRow = getCellsPerRow(viewer, VIEWER_BYTE_CELL_SELECTOR);
    const numBytesPerRow = bytesPerRow.length;
    const expectedAddress = addressBefore - numBytesPerRow;
    assertByteSelectedOnKeyDown(viewer, onByteSelected, 'ArrowUp', expectedAddress);
  });

  it('calls onByteSelected on page down', async () => {
    const {viewer, data, onByteSelected} = await setUpComponent();
    const addressBefore = data.address;

    const bytes = getCells(viewer, VIEWER_BYTE_CELL_SELECTOR);
    const numBytesPerPage = bytes.length;
    const expectedAddress = addressBefore + numBytesPerPage;
    assertByteSelectedOnKeyDown(viewer, onByteSelected, 'PageDown', expectedAddress);
  });

  it('calls onByteSelected on page up', async () => {
    const {viewer, data, onByteSelected} = await setUpComponent();
    const addressBefore = data.address;

    const bytes = getCells(viewer, VIEWER_BYTE_CELL_SELECTOR);
    const numBytesPerPage = bytes.length;
    const expectedAddress = addressBefore - numBytesPerPage;
    assertByteSelectedOnKeyDown(viewer, onByteSelected, 'PageUp', expectedAddress);
  });

  it('does not highlight any bytes when no highlight info set', async () => {
    const {viewer} = await setUpComponent();
    const byteCells = getCells(viewer, '.byte-cell.highlight-area');
    const textCells = getCells(viewer, '.text-cell.highlight-area');

    assert.lengthOf(byteCells, 0);
    assert.lengthOf(textCells, 0);
  });

  it('highlights correct number of bytes when highlight info set', async () => {
    const {viewer, dataWithHighlightInfo} = await setUpComponentWithHighlightInfo();
    const byteCells = getCells(viewer, '.byte-cell.highlight-area');
    const textCells = getCells(viewer, '.text-cell.highlight-area');

    assert.strictEqual(byteCells.length, dataWithHighlightInfo.highlightInfo.size);
    assert.strictEqual(textCells.length, dataWithHighlightInfo.highlightInfo.size);
  });

  it('highlights byte cells at correct positions when highlight info set', async () => {
    const {viewer, dataWithHighlightInfo} = await setUpComponentWithHighlightInfo();
    const byteCells = getCells(viewer, '.byte-cell.highlight-area');

    for (let i = 0; i < byteCells.length; ++i) {
      const selectedValue = parseInt(byteCells[i].innerText, 16);
      const index = dataWithHighlightInfo.highlightInfo.startAddress - dataWithHighlightInfo.memoryOffset + i;
      assert.strictEqual(selectedValue, dataWithHighlightInfo.memory[index]);
    }
  });

  it('focuses highlighted byte cells when focusedMemoryHighlight provided', async () => {
    const {viewer, dataWithHighlightInfo} = await setUpComponentWithHighlightInfo();
    viewer.focusedMemoryHighlight = dataWithHighlightInfo.highlightInfo;
    await viewer.updateComplete;

    const byteCells = getCells(viewer, '.byte-cell.focused-area');
    assert.lengthOf(byteCells, dataWithHighlightInfo.highlightInfo.size);

    for (let i = 0; i < byteCells.length; ++i) {
      const selectedValue = parseInt(byteCells[i].innerText, 16);
      const index = dataWithHighlightInfo.highlightInfo.startAddress - dataWithHighlightInfo.memoryOffset + i;
      assert.strictEqual(selectedValue, dataWithHighlightInfo.memory[index]);
    }
  });

  it('does not focus highlighted byte cells when no focusedMemoryHighlight provided', async () => {
    const {viewer} = await setUpComponentWithHighlightInfo();
    const byteCells = getCells(viewer, '.byte-cell.focused-area');
    assert.isEmpty(byteCells);
  });

  it('computes rows and bytes per row from the layout measured by the view', async () => {
    const view = createViewFunctionStub(LinearMemoryViewer, {
      measureLayout: () => ({
        byteCellWidth: 20,
        textCellWidth: 10,
        dividerWidth: 10,
        addressTextAndDividerWidth: 80,
        rowHeight: 20,
      }),
    });
    const viewer = createViewer(createComponentData(), view);
    // The stubbed view renders nothing, so size the widget explicitly.
    viewer.element.style.width = '500px';
    viewer.element.style.height = '500px';

    const numBytesPerPage = await new Promise<number>(resolve => {
      viewer.onNumBytesPerPageChanged = resolve;
      renderElementIntoDOM(viewer);
    });

    // Each unsplittable group of 4 bytes needs 4 * (20 + 10) + 8 (margin) = 128px, and
    // 500 - 1 - 80 - 10 = 409px are available for groups, so 3 groups (12 bytes) fit
    // per row. 500 / 20 = 25 rows fit vertically.
    assert.strictEqual(view.input.numBytesInRow, 12);
    assert.strictEqual(view.input.numRows, 25);
    assert.strictEqual(numBytesPerPage, 12 * 25);
  });
});

describe('LinearMemoryViewer Screenshots', () => {
  it('renders selected, highlighted and focused bytes', async () => {
    // Mimic the environment in the LinearMemoryInspector, which sizes
    // the viewer via flex and provides the monospace font. Wide enough
    // to fit several byte groups per row.
    const wrapper = createFlexWrapper('600px', '120px');
    wrapper.style.fontFamily = 'var(--monospace-font-family)';
    wrapper.style.fontSize = 'var(--monospace-font-size)';
    renderElementIntoDOM(wrapper, {includeCommonStyles: true});

    // The viewer measures its cells to compute the layout, so make sure the
    // fonts are available before it does so.
    await document.fonts.ready;
    const viewer = createViewer({
      memory: Uint8Array.from({length: 1000}, (_, i) => i),
      address: 10,
      memoryOffset: 0,
      focusOnByte: true,
      highlightInfo: {startAddress: 2, size: 21, type: 'bool[]'},
      focusedMemoryHighlight: {startAddress: 8, size: 6, type: 'int32'},
    });
    await showViewerAndWaitForResize(viewer, wrapper);

    await assertScreenshot('linear_memory_inspector/viewer.png');
  });
});

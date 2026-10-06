// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {
  assertElements,
  assertScreenshot,
  getElementsWithinComponent,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';

import * as LinearMemoryInspectorComponents from './components.js';

const NUM_BYTES_PER_GROUP = 4;
export const VIEWER_BYTE_CELL_SELECTOR = '.byte-cell';
export const VIEWER_TEXT_CELL_SELECTOR = '.text-cell';
export const VIEWER_ROW_SELECTOR = '.row';
export const VIEWER_ADDRESS_SELECTOR = '.address';

/**
 * Sets the data on the viewer and resolves with the number of bytes per page
 * once the viewer has completed its initial layout pass.
 */
function setDataAndWaitForResize(
    component: LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer,
    data: LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewerData): Promise<number> {
  return new Promise<number>(resolve => {
    component.data = {...data, onNumBytesPerPageChanged: resolve};
  });
}

describe('LinearMemoryViewer', () => {
  async function setUpComponent() {
    const component = createComponent();
    const data = createComponentData();
    const onByteSelected = sinon.spy();

    const numBytesPerPage = await setDataAndWaitForResize(component, {...data, onByteSelected});
    assert.isAbove(numBytesPerPage, 4);

    return {component, data, onByteSelected};
  }

  async function setUpComponentWithHighlightInfo() {
    const component = createComponent();
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

    const numBytesPerPage = await setDataAndWaitForResize(component, dataWithHighlightInfo);
    assert.isAbove(numBytesPerPage, 4);

    return {component, dataWithHighlightInfo};
  }

  function createComponent() {
    const component = new LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer();
    const flexWrapper = document.createElement('div');
    flexWrapper.style.width = '500px';
    flexWrapper.style.height = '500px';
    flexWrapper.style.display = 'flex';
    flexWrapper.appendChild(component);
    renderElementIntoDOM(flexWrapper);
    return component;
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
      focus: true,
    };

    return data;
  }

  function getCellsPerRow(
      component: LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer, cellSelector: string) {
    assert.isNotNull(component.shadowRoot);
    const row = component.shadowRoot.querySelector(VIEWER_ROW_SELECTOR);
    assert.instanceOf(row, HTMLDivElement);
    const cellsPerRow = row.querySelectorAll(cellSelector);
    assert.isNotEmpty(cellsPerRow);
    assertElements(cellsPerRow, HTMLSpanElement);
    return cellsPerRow;
  }

  function assertSelectedCellIsHighlighted(
      component: LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer, cellSelector: string,
      index: number) {
    assert.isNotNull(component.shadowRoot);
    const selectedCells = component.shadowRoot.querySelectorAll(cellSelector + '.selected');
    assert.lengthOf(selectedCells, 1);
    assert.instanceOf(selectedCells[0], HTMLSpanElement);
    const selectedCell = selectedCells[0];

    const allCells = getCellsPerRow(component, cellSelector);
    assert.isAtLeast(allCells.length, index);
    const cellAtAddress = allCells[index];

    assert.strictEqual(selectedCell, cellAtAddress);
  }

  function assertByteSelectedOnKeyDown(component: LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer,
                                       onByteSelected: sinon.SinonSpy, code: string, expectedAddress: number) {
    const view = getElementWithinComponent(component, '.view', HTMLDivElement);
    view.dispatchEvent(new KeyboardEvent('keydown', {code}));
    sinon.assert.calledOnceWithExactly(onByteSelected, expectedAddress);
  }

  it('correctly renders bytes given a memory offset greater than zero', () => {
    const data = createComponentData();
    data.memoryOffset = 1;
    assert.isAbove(data.address, data.memoryOffset);
    const component = new LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer();
    component.data = data;
    renderElementIntoDOM(component);

    const selectedByte = getElementWithinComponent(component, VIEWER_BYTE_CELL_SELECTOR + '.selected', HTMLSpanElement);
    const selectedValue = parseInt(selectedByte.innerText, 16);
    assert.strictEqual(selectedValue, data.memory[data.address - data.memoryOffset]);
  });

  it('calls onNumBytesPerPageChanged on resize', async () => {
    const component = new LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer();

    const thinWrapper = document.createElement('div');
    thinWrapper.style.width = '100px';
    thinWrapper.style.height = '100px';
    thinWrapper.style.display = 'flex';
    thinWrapper.appendChild(component);
    renderElementIntoDOM(thinWrapper);

    const numBytesPerPageBefore = await setDataAndWaitForResize(component, createComponentData());

    const numBytesPerPageAfter = await new Promise<number>(resolve => {
      component.data = {...createComponentData(), onNumBytesPerPageChanged: resolve};
      thinWrapper.style.width = '800px';
    });

    assert.isAbove(numBytesPerPageAfter, numBytesPerPageBefore);
  });

  it('renders one address per row', async () => {
    const {component} = await setUpComponent();
    assert.isNotNull(component.shadowRoot);
    const rows = component.shadowRoot.querySelectorAll(VIEWER_ROW_SELECTOR);
    const addresses = component.shadowRoot.querySelectorAll(VIEWER_ADDRESS_SELECTOR);
    assert.isNotEmpty(rows);
    assert.strictEqual(rows.length, addresses.length);
  });

  it('renders addresses depending on the bytes per row', async () => {
    const {component, data} = await setUpComponent();
    const bytesPerRow = getCellsPerRow(component, VIEWER_BYTE_CELL_SELECTOR);
    const numBytesPerRow = bytesPerRow.length;

    assert.isNotNull(component.shadowRoot);
    const addresses = component.shadowRoot.querySelectorAll(VIEWER_ADDRESS_SELECTOR);
    assert.isNotEmpty(addresses);

    for (let i = 0, currentAddress = data.memoryOffset; i < addresses.length; currentAddress += numBytesPerRow, ++i) {
      const addressElement = addresses[i];
      assert.instanceOf(addressElement, HTMLSpanElement);

      const hex = currentAddress.toString(16).toUpperCase().padStart(8, '0');
      assert.strictEqual(addressElement.innerText, hex);
    }
  });

  it('renders unsplittable byte group', () => {
    const thinWrapper = document.createElement('div');
    thinWrapper.style.width = '10px';

    const component = new LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer();
    component.data = createComponentData();
    thinWrapper.appendChild(component);
    renderElementIntoDOM(thinWrapper);
    const bytesPerRow = getCellsPerRow(component, VIEWER_BYTE_CELL_SELECTOR);
    assert.strictEqual(bytesPerRow.length, NUM_BYTES_PER_GROUP);
  });

  it('renders byte values corresponding to memory set', async () => {
    const {component, data} = await setUpComponent();
    assert.isNotNull(component.shadowRoot);
    const bytes = component.shadowRoot.querySelectorAll(VIEWER_BYTE_CELL_SELECTOR);
    assertElements(bytes, HTMLSpanElement);

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
    const {component, data, onByteSelected} = await setUpComponent();
    assert.isNotNull(component.shadowRoot);

    const byte = component.shadowRoot.querySelector(VIEWER_BYTE_CELL_SELECTOR);
    assert.instanceOf(byte, HTMLSpanElement);

    byte.click();
    sinon.assert.calledOnceWithExactly(onByteSelected, data.memoryOffset);
  });

  it('renders as many ascii values as byte values in a row', async () => {
    const {component} = await setUpComponent();
    const bytes = getCellsPerRow(component, VIEWER_BYTE_CELL_SELECTOR);
    const ascii = getCellsPerRow(component, VIEWER_TEXT_CELL_SELECTOR);

    assert.strictEqual(bytes.length, ascii.length);
  });

  it('renders ascii values corresponding to bytes', async () => {
    const {component} = await setUpComponent();
    assert.isNotNull(component.shadowRoot);

    const asciiValues = component.shadowRoot.querySelectorAll(VIEWER_TEXT_CELL_SELECTOR);
    const byteValues = component.shadowRoot.querySelectorAll(VIEWER_BYTE_CELL_SELECTOR);
    assertElements(asciiValues, HTMLSpanElement);
    assertElements(byteValues, HTMLSpanElement);
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
    const {component, data, onByteSelected} = await setUpComponent();
    assert.isNotNull(component.shadowRoot);

    const asciiCell = component.shadowRoot.querySelector(VIEWER_TEXT_CELL_SELECTOR);
    assert.instanceOf(asciiCell, HTMLSpanElement);

    asciiCell.click();
    sinon.assert.calledOnceWithExactly(onByteSelected, data.memoryOffset);
  });

  it('highlights selected byte value on setting an address', () => {
    const component = new LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer();
    const memory = new Uint8Array([2, 3, 5, 3]);
    const address = 2;

    renderElementIntoDOM(component);
    component.data = {
      memory,
      address,
      memoryOffset: 0,
      focus: true,
    };

    assertSelectedCellIsHighlighted(component, VIEWER_BYTE_CELL_SELECTOR, address);
    assertSelectedCellIsHighlighted(component, VIEWER_TEXT_CELL_SELECTOR, address);
    assertSelectedCellIsHighlighted(component, VIEWER_ADDRESS_SELECTOR, 0);
  });

  it('calls onByteSelected on arrow left', async () => {
    const {component, data, onByteSelected} = await setUpComponent();
    const addressBefore = data.address;
    const expectedAddress = addressBefore - 1;
    assertByteSelectedOnKeyDown(component, onByteSelected, 'ArrowLeft', expectedAddress);
  });

  it('calls onByteSelected on arrow right', async () => {
    const {component, data, onByteSelected} = await setUpComponent();
    const addressBefore = data.address;
    const expectedAddress = addressBefore + 1;
    assertByteSelectedOnKeyDown(component, onByteSelected, 'ArrowRight', expectedAddress);
  });

  it('calls onByteSelected on arrow down', async () => {
    const {component, data, onByteSelected} = await setUpComponent();
    const addressBefore = data.address;

    const bytesPerRow = getCellsPerRow(component, VIEWER_BYTE_CELL_SELECTOR);
    const numBytesPerRow = bytesPerRow.length;
    const expectedAddress = addressBefore + numBytesPerRow;
    assertByteSelectedOnKeyDown(component, onByteSelected, 'ArrowDown', expectedAddress);
  });

  it('calls onByteSelected on arrow up', async () => {
    const {component, data, onByteSelected} = await setUpComponent();
    const addressBefore = data.address;

    const bytesPerRow = getCellsPerRow(component, VIEWER_BYTE_CELL_SELECTOR);
    const numBytesPerRow = bytesPerRow.length;
    const expectedAddress = addressBefore - numBytesPerRow;
    assertByteSelectedOnKeyDown(component, onByteSelected, 'ArrowUp', expectedAddress);
  });

  it('calls onByteSelected on page down', async () => {
    const {component, data, onByteSelected} = await setUpComponent();
    const addressBefore = data.address;

    const bytes = getElementsWithinComponent(component, VIEWER_BYTE_CELL_SELECTOR, HTMLSpanElement);
    const numBytesPerPage = bytes.length;
    const expectedAddress = addressBefore + numBytesPerPage;
    assertByteSelectedOnKeyDown(component, onByteSelected, 'PageDown', expectedAddress);
  });

  it('calls onByteSelected on page up', async () => {
    const {component, data, onByteSelected} = await setUpComponent();
    const addressBefore = data.address;

    const bytes = getElementsWithinComponent(component, VIEWER_BYTE_CELL_SELECTOR, HTMLSpanElement);
    const numBytesPerPage = bytes.length;
    const expectedAddress = addressBefore - numBytesPerPage;
    assertByteSelectedOnKeyDown(component, onByteSelected, 'PageUp', expectedAddress);
  });

  it('does not highlight any bytes when no highlight info set', async () => {
    const {component} = await setUpComponent();
    const byteCells = getElementsWithinComponent(component, '.byte-cell.highlight-area', HTMLSpanElement);
    const textCells = getElementsWithinComponent(component, '.text-cell.highlight-area', HTMLSpanElement);

    assert.lengthOf(byteCells, 0);
    assert.lengthOf(textCells, 0);
  });

  it('highlights correct number of bytes when highlight info set', async () => {
    const {component, dataWithHighlightInfo} = await setUpComponentWithHighlightInfo();
    const byteCells = getElementsWithinComponent(component, '.byte-cell.highlight-area', HTMLSpanElement);
    const textCells = getElementsWithinComponent(component, '.text-cell.highlight-area', HTMLSpanElement);

    assert.strictEqual(byteCells.length, dataWithHighlightInfo.highlightInfo.size);
    assert.strictEqual(textCells.length, dataWithHighlightInfo.highlightInfo.size);
  });

  it('highlights byte cells at correct positions when highlight info set', async () => {
    const {component, dataWithHighlightInfo} = await setUpComponentWithHighlightInfo();
    const byteCells = getElementsWithinComponent(component, '.byte-cell.highlight-area', HTMLSpanElement);

    for (let i = 0; i < byteCells.length; ++i) {
      const selectedValue = parseInt(byteCells[i].innerText, 16);
      const index = dataWithHighlightInfo.highlightInfo.startAddress - dataWithHighlightInfo.memoryOffset + i;
      assert.strictEqual(selectedValue, dataWithHighlightInfo.memory[index]);
    }
  });

  it('focuses highlighted byte cells when focusedMemoryHighlight provided', async () => {
    const {component, dataWithHighlightInfo} = await setUpComponentWithHighlightInfo();
    const dataWithFocusedMemoryHighlight = {
      ...dataWithHighlightInfo,
      focusedMemoryHighlight: dataWithHighlightInfo.highlightInfo,
    };
    component.data = dataWithFocusedMemoryHighlight;
    const byteCells = getElementsWithinComponent(component, '.byte-cell.focused-area', HTMLSpanElement);
    assert.lengthOf(byteCells, dataWithHighlightInfo.highlightInfo.size);

    for (let i = 0; i < byteCells.length; ++i) {
      const selectedValue = parseInt(byteCells[i].innerText, 16);
      const index = dataWithHighlightInfo.highlightInfo.startAddress - dataWithHighlightInfo.memoryOffset + i;
      assert.strictEqual(selectedValue, dataWithHighlightInfo.memory[index]);
    }
  });

  it('does not focus highlighted byte cells when no focusedMemoryHighlight provided', async () => {
    const {component} = await setUpComponentWithHighlightInfo();
    const byteCells = getElementsWithinComponent(component, '.byte-cell.focused-area', HTMLSpanElement);
    assert.isEmpty(byteCells);
  });
});

describe('LinearMemoryViewer Screenshots', () => {
  it('renders selected, highlighted and focused bytes', async () => {
    const component = new LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer();
    // Mimic the environment in the LinearMemoryInspector, which sizes
    // the viewer via flex and provides the monospace font. Wide enough
    // to fit several byte groups per row.
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.style.height = '120px';
    wrapper.style.display = 'flex';
    wrapper.style.fontFamily = 'var(--monospace-font-family)';
    wrapper.style.fontSize = 'var(--monospace-font-size)';
    wrapper.appendChild(component);
    renderElementIntoDOM(wrapper, {includeCommonStyles: true});

    // The viewer measures its cells to compute the layout, so make sure the
    // fonts are available before it does so.
    await document.fonts.ready;
    await setDataAndWaitForResize(component, {
      memory: Uint8Array.from({length: 1000}, (_, i) => i),
      address: 10,
      memoryOffset: 0,
      focus: true,
      highlightInfo: {startAddress: 2, size: 21, type: 'bool[]'},
      focusedMemoryHighlight: {startAddress: 8, size: 6, type: 'int32'},
    });

    await assertScreenshot('linear_memory_inspector/viewer.png');
  });
});

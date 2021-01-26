// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LinearMemoryInspector from '../../../../front_end/linear_memory_inspector/linear_memory_inspector.js';
import {getElementsWithinComponent, getElementWithinComponent, getEventPromise, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

import {NAVIGATOR_ADDRESS_SELECTOR, NAVIGATOR_HISTORY_BUTTON_SELECTOR, NAVIGATOR_PAGE_BUTTON_SELECTOR} from './LinearMemoryNavigator_test.js';
import {ENDIANNESS_SELECTOR} from './LinearMemoryValueInterpreter_test.js';
import {VIEWER_BYTE_CELL_SELECTOR} from './LinearMemoryViewer_test.js';

const {assert} = chai;

const NAVIGATOR_SELECTOR = 'devtools-linear-memory-inspector-navigator';
const VIEWER_SELECTOR = 'devtools-linear-memory-inspector-viewer';
const INTERPRETER_SELECTOR = 'devtools-linear-memory-inspector-interpreter';

describe('LinearMemoryInspector', () => {
  function getViewer(component: LinearMemoryInspector.LinearMemoryInspector.LinearMemoryInspector) {
    return getElementWithinComponent(
        component, VIEWER_SELECTOR, LinearMemoryInspector.LinearMemoryViewer.LinearMemoryViewer);
  }

  function getNavigator(component: LinearMemoryInspector.LinearMemoryInspector.LinearMemoryInspector) {
    return getElementWithinComponent(
        component, NAVIGATOR_SELECTOR, LinearMemoryInspector.LinearMemoryNavigator.LinearMemoryNavigator);
  }

  function getValueInterpreter(component: LinearMemoryInspector.LinearMemoryInspector.LinearMemoryInspector) {
    return getElementWithinComponent(
        component, INTERPRETER_SELECTOR,
        LinearMemoryInspector.LinearMemoryValueInterpreter.LinearMemoryValueInterpreter);
  }

  function setUpComponent() {
    const component = new LinearMemoryInspector.LinearMemoryInspector.LinearMemoryInspector();

    const flexWrapper = document.createElement('div');
    flexWrapper.style.width = '500px';
    flexWrapper.style.height = '500px';
    flexWrapper.style.display = 'flex';
    flexWrapper.appendChild(component);
    renderElementIntoDOM(flexWrapper);

    const size = 1000;
    const memory = [];
    for (let i = 0; i < size; ++i) {
      memory[i] = i;
    }
    const data = {
      memory: new Uint8Array(memory),
      address: 20,
      memoryOffset: 0,
      outerMemoryLength: memory.length,
    };
    component.data = data;

    return {component, data};
  }

  function triggerAddressChangedEvent(
      component: LinearMemoryInspector.LinearMemoryInspector.LinearMemoryInspector, address: string,
      mode: LinearMemoryInspector.LinearMemoryNavigator.Mode) {
    const navigator = getNavigator(component);
    const changeEvent = new LinearMemoryInspector.LinearMemoryNavigator.AddressInputChangedEvent(address, mode);
    navigator.dispatchEvent(changeEvent);
  }

  function assertUpdatesInNavigator(
      navigator: LinearMemoryInspector.LinearMemoryNavigator.LinearMemoryNavigator, expectedAddress: string,
      expectedTooltip: string) {
    const address = getElementWithinComponent(navigator, NAVIGATOR_ADDRESS_SELECTOR, HTMLInputElement);
    const addressValue = address.value;
    assert.strictEqual(addressValue, expectedAddress);
    assert.strictEqual(address.title, expectedTooltip);
  }

  it('renders the navigator component', async () => {
    const {component} = setUpComponent();
    const navigator = getNavigator(component);
    assert.isNotNull(navigator);
  });

  it('renders the viewer component', async () => {
    const {component} = setUpComponent();
    const viewer = getViewer(component);
    assert.isNotNull(viewer);
  });

  it('renders the interpreter component', async () => {
    const {component} = setUpComponent();
    const interpreter = getValueInterpreter(component);
    assert.isNotNull(interpreter);
  });

  it('can navigate addresses back and forth in history', async () => {
    const {component, data: {address}} = setUpComponent();

    const navigator = getNavigator(component);
    const buttons = getElementsWithinComponent(navigator, NAVIGATOR_HISTORY_BUTTON_SELECTOR, HTMLButtonElement);
    const [backwardButton, forwardButton] = buttons;

    const viewer = getViewer(component);
    const byteCells = getElementsWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR, HTMLSpanElement);

    const visitedByteValue = [address];
    const historyLength = Math.min(byteCells.length, 10);

    for (let i = 1; i < historyLength; ++i) {
      const byteSelectedPromise =
          getEventPromise<LinearMemoryInspector.LinearMemoryViewer.ByteSelectedEvent>(viewer, 'byte-selected');
      byteCells[i].click();
      const byteSelectedEvent = await byteSelectedPromise;
      visitedByteValue.push(byteSelectedEvent.data);
    }

    for (let i = historyLength - 1; i >= 0; --i) {
      const currentByteValue =
          getElementWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR + '.selected', HTMLSpanElement);
      assert.strictEqual(parseInt(currentByteValue.innerText, 16), visitedByteValue[i]);
      backwardButton.click();
    }

    for (let i = 0; i < historyLength; ++i) {
      const currentByteValue =
          getElementWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR + '.selected', HTMLSpanElement);
      assert.strictEqual(parseInt(currentByteValue.innerText, 16), visitedByteValue[i]);

      forwardButton.click();
    }
  });

  it('can turn the page back and forth', async () => {
    const {component} = setUpComponent();
    const navigator = getNavigator(component);
    const buttons = getElementsWithinComponent(navigator, NAVIGATOR_PAGE_BUTTON_SELECTOR, HTMLButtonElement);
    const [backwardButton, forwardButton] = buttons;

    const address = getElementWithinComponent(navigator, NAVIGATOR_ADDRESS_SELECTOR, HTMLInputElement);
    const addressBefore = parseInt(address.value, 16);

    const viewer = getViewer(component);
    const bytesShown = getElementsWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR, HTMLSpanElement);
    const numBytesPerPage = bytesShown.length;

    forwardButton.click();
    let addressAfter = parseInt(address.value, 16);
    let expectedAddressAfter = addressBefore + numBytesPerPage;
    assert.strictEqual(addressAfter, expectedAddressAfter);

    backwardButton.click();
    addressAfter = parseInt(address.value, 16);
    expectedAddressAfter -= numBytesPerPage;
    assert.strictEqual(addressAfter, Math.max(0, expectedAddressAfter));
  });

  it('synchronizes selected addresses in navigator and viewer', async () => {
    const {component, data} = setUpComponent();
    const navigator = getNavigator(component);

    const address = getElementWithinComponent(navigator, NAVIGATOR_ADDRESS_SELECTOR, HTMLInputElement);
    const viewer = getViewer(component);
    const selectedByte = getElementWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR + '.selected', HTMLSpanElement);

    const actualByteValue = parseInt(selectedByte.innerText, 16);
    const expectedByteValue = data.memory[parseInt(address.value, 16)];
    assert.strictEqual(actualByteValue, expectedByteValue);
  });

  it('can change endianness settings on event', async () => {
    const {component} = setUpComponent();
    const interpreter = getValueInterpreter(component);
    const select = getElementWithinComponent(interpreter, ENDIANNESS_SELECTOR, HTMLSelectElement);
    assert.deepEqual(select.value, LinearMemoryInspector.ValueInterpreterDisplayUtils.Endianness.Little);

    const endianSetting = LinearMemoryInspector.ValueInterpreterDisplayUtils.Endianness.Big;
    const event = new LinearMemoryInspector.LinearMemoryValueInterpreter.EndiannessChangedEvent(endianSetting);
    interpreter.dispatchEvent(event);

    assert.deepEqual(select.value, event.data);
  });

  it('leaves the navigator address as inputted by user on edit event', () => {
    const {component} = setUpComponent();
    const navigator = getNavigator(component);
    triggerAddressChangedEvent(component, '2', LinearMemoryInspector.LinearMemoryNavigator.Mode.Edit);
    assertUpdatesInNavigator(navigator, '2', 'Enter address');
  });

  it('changes navigator address (to hex) on valid user submit event', () => {
    const {component} = setUpComponent();
    const navigator = getNavigator(component);
    triggerAddressChangedEvent(component, '2', LinearMemoryInspector.LinearMemoryNavigator.Mode.Submitted);
    assertUpdatesInNavigator(navigator, '0x00000002', 'Enter address');
  });

  it('leaves the navigator address as inputted by user on invalid edit event', () => {
    const {component} = setUpComponent();
    const navigator = getNavigator(component);
    triggerAddressChangedEvent(component, '-2', LinearMemoryInspector.LinearMemoryNavigator.Mode.Edit);
    assertUpdatesInNavigator(navigator, '-2', 'Address has to be a number between 0x00000000 and 0x000003E8');
  });

  it('leaves the navigator address as inputted by user on invalid submit event', () => {
    const {component} = setUpComponent();
    const navigator = getNavigator(component);
    triggerAddressChangedEvent(component, '-2', LinearMemoryInspector.LinearMemoryNavigator.Mode.Submitted);
    assertUpdatesInNavigator(navigator, '-2', 'Address has to be a number between 0x00000000 and 0x000003E8');
  });

  it('triggers MemoryRequestEvent on refresh', async () => {
    const {component, data} = setUpComponent();
    const navigator = getNavigator(component);
    const viewer = getViewer(component);

    const bytes = getElementsWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR, HTMLSpanElement);
    const numBytesPerPage = bytes.length;

    const eventPromise =
        getEventPromise<LinearMemoryInspector.LinearMemoryInspector.MemoryRequestEvent>(component, 'memory-request');
    navigator.dispatchEvent(new LinearMemoryInspector.LinearMemoryNavigator.RefreshRequestedEvent());
    const event = await eventPromise;
    const {start, end, address} = event.data;

    assert.strictEqual(address, data.address);
    assert.isAbove(end, start);
    assert.strictEqual(numBytesPerPage, end - start);
  });

  it('triggers event on address change when byte is selected', async () => {
    const {component, data} = setUpComponent();
    const eventPromise =
        getEventPromise<LinearMemoryInspector.LinearMemoryInspector.AddressChangedEvent>(component, 'address-changed');
    const viewer = getViewer(component);
    const bytes = getElementsWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR, HTMLSpanElement);
    const numBytesPerPage = bytes.length;
    const pageNumber = data.address / numBytesPerPage;
    const addressOfFirstByte = pageNumber * numBytesPerPage;
    bytes[0].click();
    const event = await eventPromise;
    assert.strictEqual(event.data, addressOfFirstByte);
  });

  it('triggers event on address change when data is set', async () => {
    const {component, data} = setUpComponent();
    const eventPromise =
        getEventPromise<LinearMemoryInspector.LinearMemoryInspector.AddressChangedEvent>(component, 'address-changed');
    data.address = 10;
    component.data = data;
    const event = await eventPromise;
    assert.strictEqual(event.data, data.address);
  });

  it('formats a hexadecimal number', () => {
    const number = 23;
    assert.strictEqual(
        LinearMemoryInspector.LinearMemoryInspectorUtils.toHexString({number, pad: 0, prefix: false}), '17');
  });

  it('formats a hexadecimal number and adds padding', async () => {
    const number = 23;
    assert.strictEqual(
        LinearMemoryInspector.LinearMemoryInspectorUtils.toHexString({number, pad: 5, prefix: false}), '00017');
  });

  it('formats a hexadecimal number and adds prefix', async () => {
    const number = 23;
    assert.strictEqual(
        LinearMemoryInspector.LinearMemoryInspectorUtils.toHexString({number, pad: 5, prefix: true}), '0x00017');
  });

  it('can parse a valid hexadecimal address', async () => {
    const address = '0xa';
    const parsedAddress = LinearMemoryInspector.LinearMemoryInspectorUtils.parseAddress(address);
    assert.strictEqual(parsedAddress, 10);
  });

  it('can parse a valid decimal address', async () => {
    const address = '20';
    const parsedAddress = LinearMemoryInspector.LinearMemoryInspectorUtils.parseAddress(address);
    assert.strictEqual(parsedAddress, 20);
  });

  it('returns undefined on parsing invalid address', async () => {
    const address = '20a';
    const parsedAddress = LinearMemoryInspector.LinearMemoryInspectorUtils.parseAddress(address);
    assert.strictEqual(parsedAddress, undefined);
  });

  it('returns undefined on parsing negative address', async () => {
    const address = '-20';
    const parsedAddress = LinearMemoryInspector.LinearMemoryInspectorUtils.parseAddress(address);
    assert.strictEqual(parsedAddress, undefined);
  });
});

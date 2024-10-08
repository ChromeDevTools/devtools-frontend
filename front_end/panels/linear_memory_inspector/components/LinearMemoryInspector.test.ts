// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/es_modules_import */

import {
  dispatchClickEvent,
  getElementsWithinComponent,
  getElementWithinComponent,
  getEventPromise,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';

import * as LinearMemoryInspectorComponents from './components.js';
import {
  NAVIGATOR_ADDRESS_SELECTOR,
  NAVIGATOR_HISTORY_BUTTON_SELECTOR,
  NAVIGATOR_PAGE_BUTTON_SELECTOR,
} from './LinearMemoryNavigator.test.js';
import {ENDIANNESS_SELECTOR} from './LinearMemoryValueInterpreter.test.js';
import {VIEWER_BYTE_CELL_SELECTOR} from './LinearMemoryViewer.test.js';
import {DISPLAY_JUMP_TO_POINTER_BUTTON_SELECTOR} from './ValueInterpreterDisplay.test.js';

const NAVIGATOR_SELECTOR = 'devtools-linear-memory-inspector-navigator';
const VIEWER_SELECTOR = 'devtools-linear-memory-inspector-viewer';
const INTERPRETER_SELECTOR = 'devtools-linear-memory-inspector-interpreter';

describeWithLocale('LinearMemoryInspector', () => {
  function getViewer(component: LinearMemoryInspectorComponents.LinearMemoryInspector.LinearMemoryInspector) {
    return getElementWithinComponent(
        component, VIEWER_SELECTOR, LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer);
  }

  function getNavigator(component: LinearMemoryInspectorComponents.LinearMemoryInspector.LinearMemoryInspector) {
    return getElementWithinComponent(
        component, NAVIGATOR_SELECTOR, LinearMemoryInspectorComponents.LinearMemoryNavigator.LinearMemoryNavigator);
  }

  function getValueInterpreter(component: LinearMemoryInspectorComponents.LinearMemoryInspector.LinearMemoryInspector) {
    return getElementWithinComponent(
        component, INTERPRETER_SELECTOR,
        LinearMemoryInspectorComponents.LinearMemoryValueInterpreter.LinearMemoryValueInterpreter);
  }

  function setUpComponent() {
    const component = new LinearMemoryInspectorComponents.LinearMemoryInspector.LinearMemoryInspector();

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
      endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE,
      valueTypes: new Set<LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType>(
          LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.getDefaultValueTypeMapping().keys()),
    };
    component.data = data;

    return {component, data};
  }

  function triggerAddressChangedEvent(
      component: LinearMemoryInspectorComponents.LinearMemoryInspector.LinearMemoryInspector, address: string,
      mode: LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode) {
    const navigator = getNavigator(component);
    const changeEvent =
        new LinearMemoryInspectorComponents.LinearMemoryNavigator.AddressInputChangedEvent(address, mode);
    navigator.dispatchEvent(changeEvent);
  }

  function assertUpdatesInNavigator(
      navigator: LinearMemoryInspectorComponents.LinearMemoryNavigator.LinearMemoryNavigator, expectedAddress: string,
      expectedTooltip: string) {
    const address = getElementWithinComponent(navigator, NAVIGATOR_ADDRESS_SELECTOR, HTMLInputElement);
    const addressValue = address.value;
    assert.strictEqual(addressValue, expectedAddress);
    assert.strictEqual(address.title, expectedTooltip);
  }

  it('renders the navigator component', () => {
    const {component} = setUpComponent();
    const navigator = getNavigator(component);
    assert.isNotNull(navigator);
  });

  it('renders the viewer component', () => {
    const {component} = setUpComponent();
    const viewer = getViewer(component);
    assert.isNotNull(viewer);
  });

  it('renders the interpreter component', () => {
    const {component} = setUpComponent();
    const interpreter = getValueInterpreter(component);
    assert.isNotNull(interpreter);
  });

  it('only saves history entries if addresses differ', async () => {
    const {component, data} = setUpComponent();
    // Set the address to zero to avoid the LMI to jump around in terms of addresses
    // before the LMI is completely rendered (it requires two rendering processes,
    // meanwhile our test might have already started).
    data.address = 0;
    component.data = data;

    const navigator = getNavigator(component);
    const buttons = getElementsWithinComponent(navigator, NAVIGATOR_HISTORY_BUTTON_SELECTOR, HTMLButtonElement);
    const [backwardButton] = buttons;

    const viewer = getViewer(component);
    const byteCells = getElementsWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR, HTMLSpanElement);

    const byteIndices = [2, 1, 1, 2];
    const expectedHistory = [2, 1, 2];

    for (const index of byteIndices) {
      const byteSelectedPromise =
          getEventPromise<LinearMemoryInspectorComponents.LinearMemoryViewer.ByteSelectedEvent>(viewer, 'byteselected');
      dispatchClickEvent(byteCells[index]);
      await byteSelectedPromise;
    }

    const navigatorAddress = getElementWithinComponent(navigator, NAVIGATOR_ADDRESS_SELECTOR, HTMLInputElement);
    for (const index of expectedHistory) {
      assert.strictEqual(parseInt(navigatorAddress.value, 16), index);
      dispatchClickEvent(backwardButton);
    }
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
          getEventPromise<LinearMemoryInspectorComponents.LinearMemoryViewer.ByteSelectedEvent>(viewer, 'byteselected');
      dispatchClickEvent(byteCells[i]);
      const byteSelectedEvent = await byteSelectedPromise;
      visitedByteValue.push(byteSelectedEvent.data);
    }

    for (let i = historyLength - 1; i >= 0; --i) {
      const currentByteValue =
          getElementWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR + '.selected', HTMLSpanElement);
      assert.strictEqual(parseInt(currentByteValue.innerText, 16), visitedByteValue[i]);
      dispatchClickEvent(backwardButton);
    }

    for (let i = 0; i < historyLength; ++i) {
      const currentByteValue =
          getElementWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR + '.selected', HTMLSpanElement);
      assert.strictEqual(parseInt(currentByteValue.innerText, 16), visitedByteValue[i]);

      dispatchClickEvent(forwardButton);
    }
  });

  it('can turn the page back and forth', () => {
    const {component} = setUpComponent();
    const navigator = getNavigator(component);
    const buttons = getElementsWithinComponent(navigator, NAVIGATOR_PAGE_BUTTON_SELECTOR, HTMLButtonElement);
    const [backwardButton, forwardButton] = buttons;

    const address = getElementWithinComponent(navigator, NAVIGATOR_ADDRESS_SELECTOR, HTMLInputElement);
    const addressBefore = parseInt(address.value, 16);

    const viewer = getViewer(component);
    const bytesShown = getElementsWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR, HTMLSpanElement);
    const numBytesPerPage = bytesShown.length;

    dispatchClickEvent(forwardButton);
    let addressAfter = parseInt(address.value, 16);
    let expectedAddressAfter = addressBefore + numBytesPerPage;
    assert.strictEqual(addressAfter, expectedAddressAfter);

    dispatchClickEvent(backwardButton);
    addressAfter = parseInt(address.value, 16);
    expectedAddressAfter -= numBytesPerPage;
    assert.strictEqual(addressAfter, Math.max(0, expectedAddressAfter));
  });

  it('synchronizes selected addresses in navigator and viewer', () => {
    const {component, data} = setUpComponent();
    const navigator = getNavigator(component);

    const address = getElementWithinComponent(navigator, NAVIGATOR_ADDRESS_SELECTOR, HTMLInputElement);
    const viewer = getViewer(component);
    const selectedByte = getElementWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR + '.selected', HTMLSpanElement);

    const actualByteValue = parseInt(selectedByte.innerText, 16);
    const expectedByteValue = data.memory[parseInt(address.value, 16)];
    assert.strictEqual(actualByteValue, expectedByteValue);
  });

  it('can change endianness settings on event', () => {
    const {component} = setUpComponent();
    const interpreter = getValueInterpreter(component);
    const select = getElementWithinComponent(interpreter, ENDIANNESS_SELECTOR, HTMLSelectElement);
    assert.deepEqual(select.value, LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE);

    const endianSetting = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.BIG;
    const event =
        new LinearMemoryInspectorComponents.LinearMemoryValueInterpreter.EndiannessChangedEvent(endianSetting);
    interpreter.dispatchEvent(event);

    assert.deepEqual(select.value, event.data);
  });

  it('updates current address if user triggers a jumptopointeraddress event', () => {
    const {component, data} = setUpComponent();
    data.valueTypes = new Set([LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER32]);
    data.memory = new Uint8Array([2, 0, 0, 0]);
    data.outerMemoryLength = data.memory.length;
    data.address = 0;
    data.endianness = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE;
    component.data = data;

    const interpreter = getValueInterpreter(component);
    const display = getElementWithinComponent(
        interpreter, 'devtools-linear-memory-inspector-interpreter-display',
        LinearMemoryInspectorComponents.ValueInterpreterDisplay.ValueInterpreterDisplay);
    const button = getElementWithinComponent(display, DISPLAY_JUMP_TO_POINTER_BUTTON_SELECTOR, HTMLButtonElement);
    dispatchClickEvent(button);

    const navigator = getNavigator(component);
    const selectedByte = getElementWithinComponent(navigator, NAVIGATOR_ADDRESS_SELECTOR, HTMLInputElement);

    const actualSelectedByte = parseInt(selectedByte.value, 16);
    const expectedSelectedByte = new DataView(data.memory.buffer).getUint32(0, true);
    assert.strictEqual(actualSelectedByte, expectedSelectedByte);
  });

  it('leaves the navigator address as inputted by user on edit event', () => {
    const {component} = setUpComponent();
    const navigator = getNavigator(component);
    triggerAddressChangedEvent(component, '2', LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode.EDIT);
    assertUpdatesInNavigator(navigator, '2', 'Enter address');
  });

  it('changes navigator address (to hex) on valid user submit event', () => {
    const {component} = setUpComponent();
    const navigator = getNavigator(component);
    triggerAddressChangedEvent(component, '2', LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode.SUBMITTED);
    assertUpdatesInNavigator(navigator, '0x00000002', 'Enter address');
  });

  it('leaves the navigator address as inputted by user on invalid edit event', () => {
    const {component} = setUpComponent();
    const navigator = getNavigator(component);
    triggerAddressChangedEvent(component, '-2', LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode.EDIT);
    assertUpdatesInNavigator(navigator, '-2', 'Address has to be a number between 0x00000000 and 0x000003E8');
  });

  it('leaves the navigator address as inputted by user on invalid submit event', () => {
    const {component} = setUpComponent();
    const navigator = getNavigator(component);
    triggerAddressChangedEvent(component, '-2', LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode.SUBMITTED);
    assertUpdatesInNavigator(navigator, '-2', 'Address has to be a number between 0x00000000 and 0x000003E8');
  });

  it('triggers MemoryRequestEvent on refresh', async () => {
    const {component, data} = setUpComponent();
    const navigator = getNavigator(component);
    const viewer = getViewer(component);

    const bytes = getElementsWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR, HTMLSpanElement);
    const numBytesPerPage = bytes.length;

    const eventPromise = getEventPromise<LinearMemoryInspectorComponents.LinearMemoryInspector.MemoryRequestEvent>(
        component, 'memoryrequest');
    navigator.dispatchEvent(new LinearMemoryInspectorComponents.LinearMemoryNavigator.RefreshRequestedEvent());
    const event = await eventPromise;
    const {start, end, address} = event.data;

    assert.strictEqual(address, data.address);
    assert.isAbove(end, start);
    assert.strictEqual(numBytesPerPage, end - start);
  });

  it('triggers event on address change when byte is selected', async () => {
    const {component, data} = setUpComponent();
    const eventPromise = getEventPromise<LinearMemoryInspectorComponents.LinearMemoryInspector.AddressChangedEvent>(
        component, 'addresschanged');
    const viewer = getViewer(component);
    const bytes = getElementsWithinComponent(viewer, VIEWER_BYTE_CELL_SELECTOR, HTMLSpanElement);
    const numBytesPerPage = bytes.length;
    const pageNumber = data.address / numBytesPerPage;
    const addressOfFirstByte = pageNumber * numBytesPerPage + 1;
    dispatchClickEvent(bytes[1]);
    const event = await eventPromise;
    assert.strictEqual(event.data, addressOfFirstByte);
  });

  it('triggers event on address change when data is set', async () => {
    const {component, data} = setUpComponent();
    const eventPromise = getEventPromise<LinearMemoryInspectorComponents.LinearMemoryInspector.AddressChangedEvent>(
        component, 'addresschanged');
    data.address = 10;
    component.data = data;
    const event = await eventPromise;
    assert.strictEqual(event.data, data.address);
  });

  it('triggers event on settings changed when value type is changed', async () => {
    const {component} = setUpComponent();
    const interpreter = getValueInterpreter(component);
    const eventPromise = getEventPromise<LinearMemoryInspectorComponents.LinearMemoryInspector.SettingsChangedEvent>(
        component, 'settingschanged');
    const valueType = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT16;
    interpreter.dispatchEvent(
        new LinearMemoryInspectorComponents.LinearMemoryValueInterpreter.ValueTypeToggledEvent(valueType, false));
    const event = await eventPromise;
    assert.isTrue(event.data.valueTypes.size > 1);
    assert.isFalse(event.data.valueTypes.has(valueType));
  });

  it('triggers event on settings changed when value type mode is changed', async () => {
    const {component} = setUpComponent();
    const interpreter = getValueInterpreter(component);
    const eventPromise = getEventPromise<LinearMemoryInspectorComponents.LinearMemoryInspector.SettingsChangedEvent>(
        component, 'settingschanged');
    const valueType = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT16;
    const valueTypeMode = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.HEXADECIMAL;
    interpreter.dispatchEvent(new LinearMemoryInspectorComponents.ValueInterpreterDisplay.ValueTypeModeChangedEvent(
        valueType, valueTypeMode));
    const event = await eventPromise;
    assert.isTrue(event.data.valueTypes.has(valueType));
    assert.strictEqual(event.data.modes.get(valueType), valueTypeMode);
  });

  it('triggers event on settings changed when endianness is changed', async () => {
    const {component} = setUpComponent();
    const interpreter = getValueInterpreter(component);
    const eventPromise = getEventPromise<LinearMemoryInspectorComponents.LinearMemoryInspector.SettingsChangedEvent>(
        component, 'settingschanged');
    const endianness = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.BIG;
    interpreter.dispatchEvent(
        new LinearMemoryInspectorComponents.LinearMemoryValueInterpreter.EndiannessChangedEvent(endianness));
    const event = await eventPromise;
    assert.strictEqual(event.data.endianness, endianness);
  });

  it('formats a hexadecimal number', () => {
    const number = 23;
    assert.strictEqual(
        LinearMemoryInspectorComponents.LinearMemoryInspectorUtils.toHexString({number, pad: 0, prefix: false}), '17');
  });

  it('formats a hexadecimal number and adds padding', () => {
    const number = 23;
    assert.strictEqual(
        LinearMemoryInspectorComponents.LinearMemoryInspectorUtils.toHexString({number, pad: 5, prefix: false}),
        '00017');
  });

  it('formats a hexadecimal number and adds prefix', () => {
    const number = 23;
    assert.strictEqual(
        LinearMemoryInspectorComponents.LinearMemoryInspectorUtils.toHexString({number, pad: 5, prefix: true}),
        '0x00017');
  });

  it('can parse a valid hexadecimal address', () => {
    const address = '0xa';
    const parsedAddress = LinearMemoryInspectorComponents.LinearMemoryInspectorUtils.parseAddress(address);
    assert.strictEqual(parsedAddress, 10);
  });

  it('can parse a valid decimal address', () => {
    const address = '20';
    const parsedAddress = LinearMemoryInspectorComponents.LinearMemoryInspectorUtils.parseAddress(address);
    assert.strictEqual(parsedAddress, 20);
  });

  it('returns undefined on parsing invalid address', () => {
    const address = '20a';
    const parsedAddress = LinearMemoryInspectorComponents.LinearMemoryInspectorUtils.parseAddress(address);
    assert.strictEqual(parsedAddress, undefined);
  });

  it('returns undefined on parsing negative address', () => {
    const address = '-20';
    const parsedAddress = LinearMemoryInspectorComponents.LinearMemoryInspectorUtils.parseAddress(address);
    assert.strictEqual(parsedAddress, undefined);
  });

  it('can hide the value inspector', async () => {
    const {component, data} = await setUpComponent();
    component.data = {
      ...data,
      hideValueInspector: true,
    };

    assert.isNotNull(component.shadowRoot);
    assert.isNull(component.shadowRoot.querySelector(INTERPRETER_SELECTOR));
  });
});

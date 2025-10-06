// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import {
  createViewFunctionStub,
  type ViewFunctionStub,
} from '../../../testing/ViewFunctionHelpers.js';

import * as LinearMemoryInspectorComponents from './components.js';

const LinearMemoryInspector = LinearMemoryInspectorComponents.LinearMemoryInspector.LinearMemoryInspector;

describeWithLocale('LinearMemoryInspector', () => {
  let component: LinearMemoryInspectorComponents.LinearMemoryInspector.LinearMemoryInspector;
  let view: ViewFunctionStub<typeof LinearMemoryInspector>;

  beforeEach(async () => {
    view = createViewFunctionStub(LinearMemoryInspector);
    component = new LinearMemoryInspector(undefined, view);

    const size = 1000;
    const memory = [];
    for (let i = 0; i < size; ++i) {
      memory[i] = i;
    }
    component.memory = new Uint8Array(memory);
    component.address = 20;
    component.memoryOffset = 0;
    component.outerMemoryLength = memory.length;
    component.endianness = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE;
    component.valueTypes = new Set<LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType>(
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.getDefaultValueTypeMapping().keys());

    component.markAsRoot();
    renderElementIntoDOM(component);
    await view.nextInput;
  });

  it('only saves history entries if addresses differ', async () => {
    // Set the address to zero to avoid the LMI to jump around in terms of addresses
    // before the LMI is completely rendered (it requires two rendering processes,
    // meanwhile our test might have already started).
    component.address = 0;
    await view.nextInput;

    const byteIndices = [2, 1, 1, 2];
    const expectedHistory = [2, 1, 2];

    for (const index of byteIndices) {
      view.input.onByteSelected(new LinearMemoryInspectorComponents.LinearMemoryViewer.ByteSelectedEvent(index));
      await view.nextInput;
    }

    for (const index of expectedHistory) {
      assert.strictEqual(view.input.address, index);
      view.input.onNavigateHistory(new LinearMemoryInspectorComponents.LinearMemoryNavigator.HistoryNavigationEvent(
          LinearMemoryInspectorComponents.LinearMemoryNavigator.Navigation.BACKWARD));
      await view.nextInput;
    }
  });

  it('can navigate addresses back and forth in history', async () => {
    const visitedByteValue = [view.input.address];
    const historyLength = 10;

    for (let i = 1; i < historyLength; ++i) {
      view.input.onByteSelected(new LinearMemoryInspectorComponents.LinearMemoryViewer.ByteSelectedEvent(i));
      const newAddress = (await view.nextInput).address;
      visitedByteValue.push(newAddress);
    }

    for (let i = historyLength - 1; i > 0; --i) {
      assert.strictEqual(view.input.address, visitedByteValue[i]);
      view.input.onNavigateHistory(new LinearMemoryInspectorComponents.LinearMemoryNavigator.HistoryNavigationEvent(
          LinearMemoryInspectorComponents.LinearMemoryNavigator.Navigation.BACKWARD));
      await view.nextInput;
    }
    assert.strictEqual(view.input.address, visitedByteValue[0]);

    for (let i = 0; i < historyLength - 1; ++i) {
      assert.strictEqual(view.input.address, visitedByteValue[i]);
      view.input.onNavigateHistory(new LinearMemoryInspectorComponents.LinearMemoryNavigator.HistoryNavigationEvent(
          LinearMemoryInspectorComponents.LinearMemoryNavigator.Navigation.FORWARD));
      await view.nextInput;
    }
    assert.strictEqual(view.input.address, visitedByteValue[historyLength - 1]);
  });

  it('can turn the page back and forth', async () => {
    const addressBefore = view.input.address;
    const numBytesPerPage = view.input.memorySlice.length;

    view.input.onNavigatePage(new LinearMemoryInspectorComponents.LinearMemoryNavigator.PageNavigationEvent(
        LinearMemoryInspectorComponents.LinearMemoryNavigator.Navigation.FORWARD));
    let addressAfter = (await view.nextInput).address;
    let expectedAddressAfter = addressBefore + numBytesPerPage;
    assert.strictEqual(addressAfter, expectedAddressAfter);

    view.input.onNavigatePage(new LinearMemoryInspectorComponents.LinearMemoryNavigator.PageNavigationEvent(
        LinearMemoryInspectorComponents.LinearMemoryNavigator.Navigation.BACKWARD));
    addressAfter = (await view.nextInput).address;
    expectedAddressAfter -= numBytesPerPage;
    assert.strictEqual(addressAfter, Math.max(0, expectedAddressAfter));
  });

  it('synchronizes selected addresses in navigator and viewer', async () => {
    const expectedByteValue = view.input.memory[view.input.address];
    assert.strictEqual(view.input.address, expectedByteValue);
  });

  it('can change endianness settings on event', async () => {
    assert.deepEqual(
        view.input.endianness, LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE);

    const endianSetting = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.BIG;
    const event =
        new LinearMemoryInspectorComponents.LinearMemoryValueInterpreter.EndiannessChangedEvent(endianSetting);
    view.input.onEndiannessChanged(event);

    const newViewInput = await view.nextInput;
    assert.deepEqual(newViewInput.endianness, event.data);
  });

  it('updates current address if user triggers a jumptopointeraddress event', async () => {
    const memory = new Uint8Array([2, 0, 0, 0]);
    component.valueTypes = new Set([LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER32]);
    component.memory = memory;
    component.outerMemoryLength = memory.length;
    component.address = 0;
    component.endianness = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE;
    await view.nextInput;

    const event = new LinearMemoryInspectorComponents.ValueInterpreterDisplay.JumpToPointerAddressEvent(2);
    view.input.onJumpToAddress(event);
    const newViewInput = await view.nextInput;

    const expectedSelectedByte = new DataView(memory.buffer).getUint32(0, true);
    assert.strictEqual(newViewInput.address, expectedSelectedByte);
  });

  it('leaves the navigator address as inputted by user on edit event', async () => {
    const event = new LinearMemoryInspectorComponents.LinearMemoryNavigator.AddressInputChangedEvent(
        '2', LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode.EDIT);
    view.input.onAddressChange(event);
    const newViewInput = await view.nextInput;
    assert.strictEqual(newViewInput.currentNavigatorAddressLine, '2');
    assert.strictEqual(
        newViewInput.currentNavigatorMode, LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode.EDIT);
  });

  it('leaves the navigator address as inputted by user on invalid edit event', async () => {
    const event = new LinearMemoryInspectorComponents.LinearMemoryNavigator.AddressInputChangedEvent(
        '-2', LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode.EDIT);
    view.input.onAddressChange(event);
    const newViewInput = await view.nextInput;
    assert.strictEqual(newViewInput.currentNavigatorAddressLine, '-2');
    assert.strictEqual(
        newViewInput.currentNavigatorMode, LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode.EDIT);
  });

  it('leaves the navigator address as inputted by user on invalid submit event', async () => {
    const event = new LinearMemoryInspectorComponents.LinearMemoryNavigator.AddressInputChangedEvent(
        '-2', LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode.SUBMITTED);
    view.input.onAddressChange(event);
    const newViewInput = await view.nextInput;
    assert.strictEqual(newViewInput.currentNavigatorAddressLine, '-2');
    assert.strictEqual(
        newViewInput.currentNavigatorMode, LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode.INVALID_SUBMIT);
  });

  it('triggers MemoryRequestEvent on refresh', async () => {
    const eventPromise =
        new Promise<LinearMemoryInspectorComponents.LinearMemoryInspector.MemoryRequestEvent>(resolve => {
          component.contentElement.addEventListener(
              LinearMemoryInspectorComponents.LinearMemoryInspector.MemoryRequestEvent.eventName, (event: Event) => {
                resolve(event as LinearMemoryInspectorComponents.LinearMemoryInspector.MemoryRequestEvent);
              }, {once: true});
        });

    view.input.onRefreshRequest();
    const event = await eventPromise;
    const {start, end, address} = event.data;

    assert.strictEqual(address, view.input.address);
    assert.isAbove(end, start);
    assert.strictEqual(view.input.memorySlice.length, end - start);
  });

  it('triggers event on address change when byte is selected', async () => {
    const eventPromise =
        new Promise<LinearMemoryInspectorComponents.LinearMemoryInspector.AddressChangedEvent>(resolve => {
          component.contentElement.addEventListener(
              LinearMemoryInspectorComponents.LinearMemoryInspector.AddressChangedEvent.eventName, (event: Event) => {
                resolve(event as LinearMemoryInspectorComponents.LinearMemoryInspector.AddressChangedEvent);
              }, {once: true});
        });

    const numBytesPerPage = view.input.memorySlice.length;
    const pageNumber = view.input.address / numBytesPerPage;
    const addressOfFirstByte = pageNumber * numBytesPerPage + 1;
    view.input.onByteSelected(
        new LinearMemoryInspectorComponents.LinearMemoryViewer.ByteSelectedEvent(addressOfFirstByte));
    const event = await eventPromise;
    assert.strictEqual(event.data, addressOfFirstByte);
  });

  it('triggers event on address change when data is set', async () => {
    const eventPromise =
        new Promise<LinearMemoryInspectorComponents.LinearMemoryInspector.AddressChangedEvent>(resolve => {
          component.contentElement.addEventListener(
              LinearMemoryInspectorComponents.LinearMemoryInspector.AddressChangedEvent.eventName, (event: Event) => {
                resolve(event as LinearMemoryInspectorComponents.LinearMemoryInspector.AddressChangedEvent);
              }, {once: true});
        });
    component.address = 10;
    const event = await eventPromise;
    assert.strictEqual(event.data, 10);
  });

  it('triggers event on settings changed when value type is changed', async () => {
    const eventPromise =
        new Promise<LinearMemoryInspectorComponents.LinearMemoryInspector.SettingsChangedEvent>(resolve => {
          component.contentElement.addEventListener(
              LinearMemoryInspectorComponents.LinearMemoryInspector.SettingsChangedEvent.eventName, (event: Event) => {
                resolve(event as LinearMemoryInspectorComponents.LinearMemoryInspector.SettingsChangedEvent);
              }, {once: true});
        });

    const valueType = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT16;
    view.input.onValueTypeToggled(
        new LinearMemoryInspectorComponents.LinearMemoryValueInterpreter.ValueTypeToggledEvent(valueType, false));
    const event = await eventPromise;
    assert.isTrue(event.data.valueTypes.size > 1);
    assert.isFalse(event.data.valueTypes.has(valueType));
  });

  it('triggers event on settings changed when value type mode is changed', async () => {
    const eventPromise =
        new Promise<LinearMemoryInspectorComponents.LinearMemoryInspector.SettingsChangedEvent>(resolve => {
          component.contentElement.addEventListener(
              LinearMemoryInspectorComponents.LinearMemoryInspector.SettingsChangedEvent.eventName, (event: Event) => {
                resolve(event as LinearMemoryInspectorComponents.LinearMemoryInspector.SettingsChangedEvent);
              }, {once: true});
        });
    const valueType = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT16;
    const valueTypeMode = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.HEXADECIMAL;
    view.input.onValueTypeModeChanged(
        new LinearMemoryInspectorComponents.ValueInterpreterDisplay.ValueTypeModeChangedEvent(
            valueType, valueTypeMode));
    const event = await eventPromise;
    assert.isTrue(event.data.valueTypes.has(valueType));
    assert.strictEqual(event.data.modes.get(valueType), valueTypeMode);
  });

  it('triggers event on settings changed when endianness is changed', async () => {
    const eventPromise =
        new Promise<LinearMemoryInspectorComponents.LinearMemoryInspector.SettingsChangedEvent>(resolve => {
          component.contentElement.addEventListener(
              LinearMemoryInspectorComponents.LinearMemoryInspector.SettingsChangedEvent.eventName, (event: Event) => {
                resolve(event as LinearMemoryInspectorComponents.LinearMemoryInspector.SettingsChangedEvent);
              }, {once: true});
        });
    const endianness = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.BIG;
    view.input.onEndiannessChanged(
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
    assert.isUndefined(parsedAddress);
  });

  it('returns undefined on parsing negative address', () => {
    const address = '-20';
    const parsedAddress = LinearMemoryInspectorComponents.LinearMemoryInspectorUtils.parseAddress(address);
    assert.isUndefined(parsedAddress);
  });

  it('can hide the value inspector', async () => {
    component.hideValueInspector = true;
    const newInput = await view.nextInput;
    assert.isTrue(newInput.hideValueInspector);
  });
});

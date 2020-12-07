// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LinearMemoryInspector from '../../../../front_end/linear_memory_inspector/linear_memory_inspector.js';
import * as SDK from '../../../../front_end/sdk/sdk.js';

const {assert} = chai;
const {LinearMemoryInspectorController} = LinearMemoryInspector;

class MockRemoteObject extends SDK.RemoteObject.LocalJSONObject {
  private objSubtype?: string;

  constructor(array: Uint8Array, subType?: string) {
    super(array);
    if (subType) {
      this.objSubtype = subType;
    }
  }

  get subtype(): string {
    return this.subtype;
  }

  set(index: number, value: number) {
    this._value[index] = value;
  }

  arrayLength() {
    return this._value.length;
  }

  callFunction<T>(
      _functionDeclaration: (this: Object, ...args: unknown[]) => T, args: Array<Protocol.Runtime.CallArgument>) {
    if (args) {
      const object = new SDK.RemoteObject.LocalJSONObject(this._value[args[0].value]);
      const result = {object, wasThrown: false};
      return Promise.resolve(result);
    }
    return Promise.resolve({object: null, wasThrown: true});
  }
}

function createWrapper(array: Uint8Array) {
  const mockRemoteObj = new MockRemoteObject(array);
  const mockRemoteArray = new SDK.RemoteObject.RemoteArray(mockRemoteObj);
  return new LinearMemoryInspectorController.RemoteArrayWrapper(mockRemoteArray);
}

describe('LinearMemoryInspectorController', async () => {
  async function assertInvalidArrayBufferObject(mockObj: SDK.RemoteObject.RemoteObject) {
    try {
      await LinearMemoryInspector.LinearMemoryInspectorController.getUint8ArrayFromObject(mockObj);
    } catch (e) {
      return;
    }
    throw new Error('Should not accept non-array buffer types.');
  }

  async function assertValidArrayBufferObject(mockObj: SDK.RemoteObject.RemoteObject) {
    try {
      await LinearMemoryInspector.LinearMemoryInspectorController.getUint8ArrayFromObject(mockObj);
    } catch (e) {
      throw new Error('Should not accept non-array buffer types.');
    }
  }

  it('throws an error on an invalid (out-of-bounds) memory range request', async () => {
    const array = new Uint8Array([2, 4, 6, 2, 4]);
    const wrapper = createWrapper(array);
    try {
      await LinearMemoryInspectorController.LinearMemoryInspectorController.getMemoryRange(wrapper, 10, 20);
      throw new Error('Function did now throw.');
    } catch (e) {
      const error = e as Error;
      assert.strictEqual(error.message, 'Requested range is out of bounds.');
    }
  });

  it('throws an error on an invalid memory range request', async () => {
    const array = new Uint8Array([2, 4, 6, 2, 4]);
    const wrapper = createWrapper(array);
    try {
      await LinearMemoryInspectorController.LinearMemoryInspectorController.getMemoryRange(wrapper, 20, 10);
      throw new Error('Function did now throw.');
    } catch (e) {
      const error = e as Error;
      assert.strictEqual(error.message, 'Requested range is out of bounds.');
    }
  });

  it('can pull updated data on memory range request', async () => {
    const array = new Uint8Array([2, 4, 6, 2, 4]);
    const mockRemoteObj = new MockRemoteObject(array);
    const mockRemoteArray = new SDK.RemoteObject.RemoteArray(mockRemoteObj);
    const wrapper = new LinearMemoryInspectorController.RemoteArrayWrapper(mockRemoteArray);
    const valuesBefore =
        await LinearMemoryInspectorController.LinearMemoryInspectorController.getMemoryRange(wrapper, 0, array.length);

    assert.strictEqual(valuesBefore.length, array.length);
    for (let i = 0; i < array.length; ++i) {
      assert.strictEqual(valuesBefore[i], array[i]);
    }

    const changedIndex = 0;
    const changedValue = 10;
    mockRemoteObj.set(changedIndex, changedValue);
    const valuesAfter =
        await LinearMemoryInspectorController.LinearMemoryInspectorController.getMemoryRange(wrapper, 0, array.length);

    assert.strictEqual(valuesAfter.length, valuesBefore.length);
    for (let i = 0; i < valuesBefore.length; ++i) {
      if (i === changedIndex) {
        assert.strictEqual(valuesAfter[i], changedValue);
      } else {
        assert.strictEqual(valuesAfter[i], valuesBefore[i]);
      }
    }
  });

  it('only accepts remote object types with array buffers', async () => {
    const allowedTypes = ['webassemblymemory', 'typedarray', 'dataview', 'arraybuffer'];
    const array = new Uint8Array();
    const subtypes = Object.values(Protocol.Runtime.RemoteObjectSubtype);
    subtypes.forEach(async subtype => {
      const mockObj = new MockRemoteObject(array, subtype);
      if (allowedTypes.includes(subtype)) {
        assertValidArrayBufferObject(mockObj);
      } else {
        assertInvalidArrayBufferObject(mockObj);
      }
    });
  });
});

describe('RemoteArrayWrapper', async () => {
  it('correctly wraps the remote object', async () => {
    const array = new Uint8Array([2, 4, 6, 2, 4]);
    const wrapper = createWrapper(array);

    assert.strictEqual(wrapper.length(), array.length);

    const extractedArray = await wrapper.getRange(0, 3);
    assert.lengthOf(extractedArray, 3);

    for (let i = 0; i < 3; ++i) {
      assert.deepEqual(array[i], extractedArray[i]);
    }
  });
});

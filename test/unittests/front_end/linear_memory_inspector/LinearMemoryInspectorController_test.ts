// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LinearMemoryInspector from '../../../../front_end/linear_memory_inspector/linear_memory_inspector.js';
import * as SDK from '../../../../front_end/sdk/sdk.js';

const {assert} = chai;

describe('RemoteArrayWrapper', async () => {
  class MockRemoteObject extends SDK.RemoteObject.LocalJSONObject {
    constructor(array: Uint8Array) {
      super(array);
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

  it('correctly wraps the remote object', async () => {
    const array = new Uint8Array([2, 4, 6, 2, 4]);
    const mockRemoteObj = new MockRemoteObject(array);
    const mockRemoteArray = new SDK.RemoteObject.RemoteArray(mockRemoteObj);

    const wrapper = new LinearMemoryInspector.LinearMemoryInspectorController.RemoteArrayWrapper(mockRemoteArray);
    assert.strictEqual(wrapper.length(), array.length);

    const extractedArray = await wrapper.getRange(0, 3);
    assert.lengthOf(extractedArray, 3);

    for (let i = 0; i < 3; ++i) {
      assert.deepEqual(array[i], extractedArray[i]);
    }
  });
});

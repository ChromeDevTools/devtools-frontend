// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Platform from '../../../../front_end/platform/platform.js';

describe('UIString', () => {
  it('serializes UI strings', () => {
    const output = Platform.UIString.serializeUIString('foo');
    assert.strictEqual(output, JSON.stringify({
      messageParts: ['foo'],
      values: [],
    }));
  });

  it('serializes UI strings and includes any values', () => {
    const output = Platform.UIString.serializeUIString('a string', ['value1', 'value2']);
    assert.strictEqual(output, JSON.stringify({
      messageParts: ['a string'],
      values: ['value1', 'value2'],
    }));
  });

  it('deserializes UI strings', () => {
    const inputString = 'a string';
    const serializedString = Platform.UIString.serializeUIString(inputString);
    const deserializedString = Platform.UIString.deserializeUIString(serializedString);
    assert.deepEqual(deserializedString, {
      messageParts: [inputString],
      values: [],
    });
  });

  it('returns an empty object if no string is given to deserialize', () => {
    const output = Platform.UIString.deserializeUIString();
    assert.deepEqual(output, {});
  });
});

// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as UIString from '../../../../front_end/platform/UIString.js';

describe('UIString', () => {
  it('serializes UI strings', () => {
    const output = UIString.serializeUIString('foo');
    assert.strictEqual(output, JSON.stringify({
      messageParts: ['foo'],
      values: [],
    }));
  });

  it('serializes UI strings and includes any values', () => {
    const output = UIString.serializeUIString('a string', ['value1', 'value2']);
    assert.strictEqual(output, JSON.stringify({
      messageParts: ['a string'],
      values: ['value1', 'value2'],
    }));
  });

  it('deserializes UI strings', () => {
    const inputString = 'a string';
    const serializedString = UIString.serializeUIString(inputString);
    const deserializedString = UIString.deserializeUIString(serializedString);
    assert.deepEqual(deserializedString, {
      messageParts: [inputString],
      values: [],
    });
  });

  it('returns an empty object if no string is given to deserialize', () => {
    const output = UIString.deserializeUIString();
    assert.deepEqual(output, {});
  });
});

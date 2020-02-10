// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '/front_end/common/common.js';

describe('UIString', () => {
  it('serializes UI strings', () => {
    const output = Common.UIString.serializeUIString('foo');
    assert.equal(output, JSON.stringify({
      messageParts: ['foo'],
      values: [],
    }));
  });

  it('serializes UI strings and includes any values', () => {
    const output = Common.UIString.serializeUIString('a string', ['value1', 'value2']);
    assert.equal(output, JSON.stringify({
      messageParts: ['a string'],
      values: ['value1', 'value2'],
    }));
  });

  it('deserializes UI strings', () => {
    const inputString = 'a string';
    const serializedString = Common.UIString.serializeUIString(inputString);
    const deserializedString = Common.UIString.deserializeUIString(serializedString);
    assert.deepEqual(deserializedString, {
      messageParts: [inputString],
      values: [],
    });
  });

  it('returns an empty object if no string is given to deserialize', () => {
    const output = Common.UIString.deserializeUIString();
    assert.deepEqual(output, {});
  });
});

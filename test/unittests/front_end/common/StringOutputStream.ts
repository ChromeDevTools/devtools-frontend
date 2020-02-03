// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {StringOutputStream} from '/front_end/common/StringOutputStream.js';

describe('StringOutputStream', () => {
  it('can be instantiated without issues', () => {
    const stream = new StringOutputStream();
    assert.equal(stream.data(), '', 'data is not empty');
  });

  it('can be closed without issues', async () => {
    const stream = new StringOutputStream();
    await stream.close();
    assert.equal(stream.data(), '', 'data is not empty');
  });

  it('can be written to without issues', async () => {
    const stream = new StringOutputStream();
    await stream.write('Hello');
    await stream.write(' ');
    await stream.write('world!');
    await stream.close();
    assert.equal(stream.data(), 'Hello world!', 'data does not match what was written');
  });
});

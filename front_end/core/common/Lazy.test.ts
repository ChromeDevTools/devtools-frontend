// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from './common.js';

describe('lazy', () => {
  const {lazy} = Common.Lazy;

  it('evaluates callback once', () => {
    const once = lazy(() => []);
    const arrayOne = once();
    const arrayTwo = once();

    assert.strictEqual(arrayOne, arrayTwo);
  });

  it('handles callback exceptions', () => {
    const fake = sinon.fake.throws('foo');
    const once = lazy(fake);

    assert.throws(once, Error);
    // Subsequent calls of the function should throw an exception without
    // re-evaluation
    assert.throws(once, Error);
    sinon.assert.callCount(fake, 1);
  });
});

// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Util from './util.js';

describe('SharedObject', () => {
  it('should work', async () => {
    // The test object
    const testObject = {value: false};

    const object = new Util.SharedObject.SharedObject(
        () => {
          testObject.value = true;
          return {...testObject};
        },
        object => {
          object.value = false;
        });

    // No one acquired.
    assert.isFalse(testObject.value);

    // First acquire.
    const [object1, release1] = await object.acquire();
    // Should be created.
    assert.notStrictEqual(object1, testObject);
    // Acquired actually occured.
    assert.isTrue(testObject.value);

    // The second object should be the same.
    const [object2, release2] = await object.acquire();
    // Should equal the first acquired object.
    assert.strictEqual(object2, object1);
    // Should still be true.
    assert.isTrue(object1.value);

    // First release (can be in any order).
    await release1();
    // Should still be true.
    assert.isTrue(object1.value);

    // Second release.
    await release2();
    assert.isFalse(object1.value);
  });
  it('should work with run', async () => {
    // The test object
    const testObject = {value: false};

    const object = new Util.SharedObject.SharedObject(
        () => {
          testObject.value = true;
          return {...testObject};
        },
        object => {
          object.value = false;
        });

    // No one acquired.
    assert.isFalse(testObject.value);

    let finalObject: {value: boolean}|undefined;
    const promises = [];

    // First acquire.
    promises.push(object.run(async object1 => {
      // Should be created.
      assert.notStrictEqual(object1, testObject);
      // Acquired actually occured.
      assert.isTrue(testObject.value);

      promises.push(object.run(async object2 => {
        // Should equal the first acquired object.
        assert.strictEqual(object2, object1);
        // Should still be true.
        assert.isTrue(object1.value);

        finalObject = object1;
      }));
    }));

    await Promise.all(promises);

    assert.exists(finalObject);
    assert.isFalse(finalObject?.value);
  });
});

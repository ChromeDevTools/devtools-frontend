// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Platform from './platform.js';

describe('Size', () => {
  it('can be instantiated without issues', () => {
    const size = new Platform.Size(1, 2);
    assert.strictEqual(size.width, 1, 'width value was not set correctly');
    assert.strictEqual(size.height, 2, 'height value was not set correctly');
  });

  it('can be clipped to another smaller size', () => {
    const size1 = new Platform.Size(3, 4);
    const size2 = new Platform.Size(1, 2);
    const resultSize = size1.clipTo(size2);
    assert.strictEqual(resultSize.width, 1, 'width value was not set correctly');
    assert.strictEqual(resultSize.height, 2, 'height value was not set correctly');
  });

  it('can be clipped to another larger size', () => {
    const size1 = new Platform.Size(1, 2);
    const size2 = new Platform.Size(3, 4);
    const resultSize = size1.clipTo(size2);
    assert.strictEqual(resultSize.width, 1, 'width value was not set correctly');
    assert.strictEqual(resultSize.height, 2, 'height value was not set correctly');
  });

  it('returns the original size if nothing was passed to the clipTo function', () => {
    const size = new Platform.Size(1, 2);
    const resultSize = size.clipTo();
    assert.strictEqual(resultSize.width, 1, 'width value was not set correctly');
    assert.strictEqual(resultSize.height, 2, 'height value was not set correctly');
  });

  it('can be scaled to a different size', () => {
    const size = new Platform.Size(1, 2);
    const resultSize = size.scale(2);
    assert.strictEqual(resultSize.width, 2, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 4, 'height value was not scaled correctly');
  });

  it('is able to check if it is equal to another size', () => {
    const size1 = new Platform.Size(1, 2);
    const size2 = new Platform.Size(3, 4);
    const size3 = new Platform.Size(1, 2);
    assert.isFalse(size1.isEqual(size2), 'size2 was considered equal');
    assert.isTrue(size1.isEqual(size3), 'size3 was not considered equal');
    assert.isFalse(size1.isEqual(null), 'null was considered equal');
  });

  it('is able to change width to the max value given a size', () => {
    const size1 = new Platform.Size(1, 2);
    const size2 = new Platform.Size(3, 4);
    const resultSize = size1.widthToMax(size2);
    assert.strictEqual(resultSize.width, 3, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 2, 'height value was not scaled correctly');
  });

  it('is able to change width to the max value given a number', () => {
    const size1 = new Platform.Size(1, 2);
    const resultSize = size1.widthToMax(5);
    assert.strictEqual(resultSize.width, 5, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 2, 'height value was not scaled correctly');
  });

  it('is able to increase width by a certain value given a size', () => {
    const size1 = new Platform.Size(1, 2);
    const size2 = new Platform.Size(3, 4);
    const resultSize = size1.addWidth(size2);
    assert.strictEqual(resultSize.width, 4, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 2, 'height value was not scaled correctly');
  });

  it('is able to increase width by a certain value given a number', () => {
    const size1 = new Platform.Size(1, 2);
    const resultSize = size1.addWidth(5);
    assert.strictEqual(resultSize.width, 6, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 2, 'height value was not scaled correctly');
  });

  it('is able to change height to the max value given a size', () => {
    const size1 = new Platform.Size(1, 2);
    const size2 = new Platform.Size(3, 4);
    const resultSize = size1.heightToMax(size2);
    assert.strictEqual(resultSize.width, 1, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 4, 'height value was not scaled correctly');
  });

  it('is able to change height to the max value given a number', () => {
    const size1 = new Platform.Size(1, 2);
    const resultSize = size1.heightToMax(5);
    assert.strictEqual(resultSize.width, 1, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 5, 'height value was not scaled correctly');
  });

  it('is able to increase height by a certain value given a size', () => {
    const size1 = new Platform.Size(1, 2);
    const size2 = new Platform.Size(3, 4);
    const resultSize = size1.addHeight(size2);
    assert.strictEqual(resultSize.width, 1, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 6, 'height value was not scaled correctly');
  });

  it('is able to increase height by a certain value given a number', () => {
    const size1 = new Platform.Size(1, 2);
    const resultSize = size1.addHeight(5);
    assert.strictEqual(resultSize.width, 1, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 7, 'height value was not scaled correctly');
  });
});

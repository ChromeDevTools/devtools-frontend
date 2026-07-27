// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {createDummyImageFile} from '../../../testing/AiAssistanceHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

describe('ImageResize', () => {
  it('should compress and resize image to fit max dimension', async () => {
    const file = await createDummyImageFile(2000, 1000);
    const result = await AiAssistance.ImageResize.compress(file);
    assert.strictEqual(result.mimeType, 'image/jpeg');
    assert.isNotEmpty(result.data);

    const img = new Image();
    const loaded = new Promise(resolve => {
      img.onload = resolve;
    });
    img.src = 'data:image/jpeg;base64,' + result.data;
    await loaded;
    assert.strictEqual(img.width, 1024);
    assert.strictEqual(img.height, 512);
  });

  it('should keep original size if already smaller than max dimension', async () => {
    const file = await createDummyImageFile(500, 400);
    const result = await AiAssistance.ImageResize.compress(file);
    const img = new Image();
    const loaded = new Promise(resolve => {
      img.onload = resolve;
    });
    img.src = 'data:image/jpeg;base64,' + result.data;
    await loaded;
    assert.strictEqual(img.width, 500);
    assert.strictEqual(img.height, 400);
  });

  it('should compress and resize a tall image to fit max dimension', async () => {
    const file = await createDummyImageFile(1000, 2000);
    const result = await AiAssistance.ImageResize.compress(file);
    assert.strictEqual(result.mimeType, 'image/jpeg');
    assert.isNotEmpty(result.data);

    const img = new Image();
    const loaded = new Promise(resolve => {
      img.onload = resolve;
    });
    img.src = 'data:image/jpeg;base64,' + result.data;
    await loaded;
    assert.strictEqual(img.width, 512);
    assert.strictEqual(img.height, 1024);
  });
});

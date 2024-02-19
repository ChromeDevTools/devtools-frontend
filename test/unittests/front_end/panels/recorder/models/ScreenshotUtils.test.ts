// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Models from '../../../../../../front_end/panels/recorder/models/models.js';

describe('ScreenshotUtils', () => {
  async function generateImage(
      width: number,
      height: number,
      ): Promise<Models.ScreenshotStorage.Screenshot> {
    const img = new Image(width, height);
    const promise = new Promise(resolve => {
      img.onload = resolve;
    });
    img.src = `data:image/svg+xml,%3Csvg viewBox='0 0 ${width} ${
        height}' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='50'/%3E%3C/svg%3E`;
    await promise;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not create context.');
    }
    const bitmap = await createImageBitmap(img, {
      resizeHeight: height,
      resizeWidth: width,
    });
    context.drawImage(bitmap, 0, 0);

    return canvas.toDataURL('image/png') as Models.ScreenshotStorage.Screenshot;
  }

  async function getScreenshotDimensions(
      screenshot: Models.ScreenshotStorage.Screenshot,
      ): Promise<number[]> {
    const tmp = new Image();
    const promise = new Promise(resolve => {
      tmp.onload = resolve;
    });
    tmp.src = screenshot;
    await promise;
    return [tmp.width, tmp.height];
  }

  it('can resize screenshots to be 160px wide and <= 240px high', async () => {
    const {resizeScreenshot} = Models.ScreenshotUtils;
    assert.deepStrictEqual(
        await getScreenshotDimensions(
            await resizeScreenshot(await generateImage(400, 800)),
            ),
        [160, 240],
    );
    assert.deepStrictEqual(
        await getScreenshotDimensions(
            await resizeScreenshot(await generateImage(800, 400)),
            ),
        [160, 80],
    );
    assert.deepStrictEqual(
        await getScreenshotDimensions(
            await resizeScreenshot(await generateImage(80, 80)),
            ),
        [160, 160],
    );
    assert.deepStrictEqual(
        await getScreenshotDimensions(
            await resizeScreenshot(await generateImage(80, 320)),
            ),
        [160, 240],
    );
  });
});

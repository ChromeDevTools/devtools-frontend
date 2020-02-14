// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as puppeteer from 'puppeteer';
import * as resemblejs from 'resemblejs';
import {assert} from 'chai';
import {join} from 'path';
import * as fs from 'fs';
import * as rimraf from 'rimraf';

const goldensScreenshotFolder = join(__dirname, '..', 'screenshots', 'goldens');
const generatedScreenshotFolder = join(__dirname, '..', 'screenshots', '.generated');

// Delete and create the generated images.
if (fs.existsSync(generatedScreenshotFolder)) {
  rimraf.sync(generatedScreenshotFolder);
}
fs.mkdirSync(generatedScreenshotFolder);

const defaultScreenshotOpts: puppeteer.ScreenshotOptions = {
  type: 'png',
  fullPage: true,
  encoding: 'binary',
};
export const assertScreenshotUnchanged = async (page: puppeteer.Page, fileName: string, options: Partial<puppeteer.ScreenshotOptions> = {}) => {
  const goldensScreenshotPath = join(goldensScreenshotFolder, fileName);
  const generatedScreenshotPath = join(generatedScreenshotFolder, fileName);

  if (fs.existsSync(generatedScreenshotPath)) {
    throw new Error(`${generatedScreenshotPath} already exists.`);
  }

  const opts = {...defaultScreenshotOpts, ...options, path: generatedScreenshotPath};
  await page.screenshot(opts);

  return new Promise((resolve, reject) => {
    resemblejs.compare(generatedScreenshotPath, goldensScreenshotPath, {}, (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      const {dimensionDifference, rawMisMatchPercentage} = data;
      assert.deepEqual(dimensionDifference, { width: 0, height: 0});
      assert.isBelow(rawMisMatchPercentage, 1);
      resolve();
    });
    resolve();
  });
};

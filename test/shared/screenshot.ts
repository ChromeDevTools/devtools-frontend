// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-console */
// no-console disabled here as this is a test runner and expects to output to the console

import {assert} from 'chai';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {join} from 'path';
import * as puppeteer from 'puppeteer';
import * as rimraf from 'rimraf';

import {getBrowserAndPages, platform} from './helper.js';

const goldensScreenshotFolder = join(__dirname, `../screenshots/goldens/${platform}`);
const generatedScreenshotFolder = join(__dirname, `../screenshots/.generated/${platform}`);

// Delete and create the generated images.
if (fs.existsSync(generatedScreenshotFolder)) {
  rimraf.sync(generatedScreenshotFolder);
}

fs.mkdirSync(goldensScreenshotFolder, {recursive: true});
fs.mkdirSync(generatedScreenshotFolder, {recursive: true});

const defaultScreenshotOpts: puppeteer.ScreenshotOptions = {
  type: 'png',
  encoding: 'binary',
};

export const assertElementScreenshotUnchanged = async (element: puppeteer.ElementHandle | null, fileName: string, options: Partial<puppeteer.ScreenshotOptions> = {}) => {

  if (!element) {
    assert.fail(`Given element for test ${fileName} was not found.`);
    return;
  }

  return assertScreenshotUnchanged(element, fileName, options);
};

export const assertPageScreenshotUnchanged = async (page: puppeteer.Page, fileName: string, options: Partial<puppeteer.ScreenshotOptions> = {}) => {
  return assertScreenshotUnchanged(page, fileName, {
    ...options,
    fullPage: true,
  });
};

const assertScreenshotUnchanged =
    async (elementOrPage: puppeteer.ElementHandle | puppeteer.Page, fileName: string, options: Partial<puppeteer.ScreenshotOptions> = {}) => {
  try {
    const goldensScreenshotPath = join(goldensScreenshotFolder, fileName);
    const generatedScreenshotPath = join(generatedScreenshotFolder, fileName);

    if (fs.existsSync(generatedScreenshotPath)) {
      throw new Error(`${generatedScreenshotPath} already exists.`);
    }

    const opts = {...defaultScreenshotOpts, ...options, path: generatedScreenshotPath};
    await elementOrPage.screenshot(opts);

    // In the event that a golden does not exist, assume the generated screenshot is the new golden.
    if (!fs.existsSync(goldensScreenshotPath)) {
      console.log('Golden does not exist, using generated screenshot.');
      setGoldenToGenerated(goldensScreenshotPath, generatedScreenshotPath);
    }

    return compare(goldensScreenshotPath, generatedScreenshotPath, fileName);
  } catch (error) {
    throw new Error(`Error occurred when comparing screenhots: ${error.stack}`);
  }
};

interface ImageDiff {
  rawMisMatchPercentage: number;
  diffPath: string;
}

async function imageDiff(golden: string, generated: string, isInteractive = false) {
  const imageDiffPath = join(__dirname, `../screenshots/image_diff/${platform}/image_diff`);
  return new Promise<ImageDiff>(async (resolve, reject) => {
    try {
      const imageDiff: ImageDiff = {rawMisMatchPercentage: 0, diffPath: ''};
      const diffText = await exec(`${imageDiffPath} --histogram ${golden} ${generated}`);

      // Parse out the number from the cmd output, i.e. diff: 48.9% failed => 48.9
      imageDiff.rawMisMatchPercentage = Number(diffText.replace(/^diff:\s/, '').replace(/%.*/, ''));

      if (Number.isNaN(imageDiff.rawMisMatchPercentage)) {
        reject('Unable to compare images');
      }

      // Only create a diff image if necessary.
      if (isInteractive || imageDiff.rawMisMatchPercentage > 0) {
        imageDiff.diffPath = join(path.dirname(generated), `${path.basename(generated, '.png')}-diff.png`);
        await exec(`${imageDiffPath} --diff ${golden} ${generated} ${imageDiff.diffPath}`);
      }

      resolve(imageDiff);
    } catch (error) {
      reject(new Error(`Error when running image_diff: ${error.stack}`));
    }
  });
}

async function exec(cmd: string) {
  return new Promise<string>((resolve, reject) => {
    let commandOutput = '';
    try {
      commandOutput = childProcess.execSync(cmd, {encoding: 'utf8'});
      resolve(commandOutput);
    } catch (error) {
      // image_diff will exit with a status code of 1 if the diff is too big, so
      // this needs to be caught, but the outcome is the same - we want to send
      // back the string for processing.
      if (error.stdout && error.stdout.indexOf('diff') === -1) {
        reject(new Error(`Comparing diff failed. stdout: "${error.stdout}"`));
        return;
      }

      resolve(error.stdout);
    }
  });
}

async function compare(golden: string, generated: string, fileName: string) {
  const {screenshot} = getBrowserAndPages();
  if (screenshot) {
    await screenshot.evaluate(opts => {
      (self as any).setState(opts);
    }, {type: 'status', msg: `Comparing ${fileName} to generated image...`});
  }

  const isInteractive = typeof screenshot !== 'undefined';
  const {rawMisMatchPercentage, diffPath} = await imageDiff(golden, generated, isInteractive);

  // Interactively allow the user to choose.
  if (screenshot && diffPath) {
    const root = join(__dirname, '../..');
    const left = golden.replace(root, '');
    const right = generated.replace(root, '');
    const diff = diffPath.replace(root, '');
    const type = 'outcome';

    await screenshot.evaluate(opts => {
      (self as any).setState(opts);
    }, {type, left, right, diff, rawMisMatchPercentage, fileName});

    const elementHandle = await screenshot.waitForSelector('.choice', {timeout: 0});
    const choice = await elementHandle.evaluate(node => node.getAttribute('data-choice'));

    // If they choose the test output, copy the generated screenshot over the golden.
    if (choice === 'generated') {
      setGoldenToGenerated(golden, generated);
    }
  } else {  // Assert no change.
    assert.isBelow(rawMisMatchPercentage, 1, `There is a ${rawMisMatchPercentage}% difference`);
  }
}

function setGoldenToGenerated(golden: string, generated: string) {
  console.log(`Copying ${generated} to ${golden}.`);
  fs.copyFileSync(generated, golden);
}

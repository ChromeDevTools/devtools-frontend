// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-console */
// no-console disabled here as this is a test runner and expects to output to the console

import * as puppeteer from 'puppeteer';
import {assert} from 'chai';
import {join} from 'path';
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import * as childProcess from 'child_process';
import * as os from 'os';
import * as path from 'path';
import {getBrowserAndPages} from './helper.js';

let platform: string;
switch (os.platform()) {
  case 'darwin':
    platform = 'mac';
    break;

  case 'win32':
    platform = 'win32';
    break;

  default:
    platform = 'linux';
    break;
}

function mkdirp(root: string, parts: string[]) {
  let target = root;
  for (const part of parts) {
    const newTarget = join(target, part);
    if (!fs.existsSync(newTarget)) {
      fs.mkdirSync(newTarget);
    }

    target = newTarget;
  }
}

const goldensScreenshotFolderParts = ['..', 'screenshots', 'goldens', platform];
const goldensScreenshotFolder = join(__dirname, ...goldensScreenshotFolderParts);
const generatedScreenshotFolderParts = ['..', 'screenshots', '.generated', platform];
const generatedScreenshotFolder = join(__dirname, ...generatedScreenshotFolderParts);

// Delete and create the generated images.
if (fs.existsSync(generatedScreenshotFolder)) {
  rimraf.sync(generatedScreenshotFolder);
}

mkdirp(__dirname, goldensScreenshotFolderParts);
mkdirp(__dirname, generatedScreenshotFolderParts);

const defaultScreenshotOpts: puppeteer.ScreenshotOptions = {
  type: 'png',
  fullPage: true,
  encoding: 'binary',
};
export const assertScreenshotUnchanged =
    async (page: puppeteer.Page, fileName: string, options: Partial<puppeteer.ScreenshotOptions> = {}) => {
  try {
    const goldensScreenshotPath = join(goldensScreenshotFolder, fileName);
    const generatedScreenshotPath = join(generatedScreenshotFolder, fileName);

    if (fs.existsSync(generatedScreenshotPath)) {
      throw new Error(`${generatedScreenshotPath} already exists.`);
    }

    const opts = {...defaultScreenshotOpts, ...options, path: generatedScreenshotPath};
    await page.screenshot(opts);

    // In the event that a golden does not exist, assume the generated screenshot is the new golden.
    if (!fs.existsSync(goldensScreenshotPath)) {
      console.log('Golden does not exist, using generated screenshot.');
      setGoldenToGenerated(goldensScreenshotPath, generatedScreenshotPath);
    }

    return compare(goldensScreenshotPath, generatedScreenshotPath, fileName);
  } catch (e) {
    throw new Error(`Error occurred when comparing screenhots: ${e.stack}`);
  }
};

interface ImageDiff {
  rawMisMatchPercentage: number;
  diffPath: string;
}

async function imageDiff(golden: string, generated: string, isInteractive = false) {
  const imageDiffPath = join(__dirname, '..', 'screenshots', 'image_diff', platform, 'image_diff');
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
    } catch (e) {
      reject(new Error(`Error when running image_diff: ${e.stack}`));
    }
  });
}

async function exec(cmd: string) {
  return new Promise<string>((resolve, reject) => {
    let commandOutput = '';
    try {
      commandOutput = childProcess.execSync(cmd, {encoding: 'utf8'});
      resolve(commandOutput);
    } catch (e) {
      // image_diff will exit with a status code of 1 if the diff is too big, so
      // this needs to be caught, but the outcome is the same - we want to send
      // back the string for processing.
      if (e.stdout && e.stdout.indexOf('diff') === -1) {
        reject(new Error(`Comparing diff failed. stdout: "${e.stdout}"`));
        return;
      }

      resolve(e.stdout);
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
    const root = join(__dirname, '..', '..');
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

// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-console */
// no-console disabled here as this is a test runner and expects to output to the console

import {assert} from 'chai';
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type * as puppeteer from 'puppeteer-core';

import {SOURCE_ROOT} from '../conductor/paths.js';
import {platform} from '../conductor/platform.js';
import {ScreenshotError} from '../conductor/screenshot-error.js';
import {TestConfig} from '../conductor/test_config.js';

/**
 * The goldens screenshot folder is always taken from the source directory (NOT
 * out/Target/...) because we commit these files to git. Therefore we use the
 * flags from the test runner config to locate the source directory and read our
 * goldens from there.
 */
const testRunnerCWD = SOURCE_ROOT;
const GOLDENS_FOLDER = path.join(testRunnerCWD, 'test', 'goldens', platform);

/**
 * It's assumed that the image_diff binaries are in CWD/third_party/image_diff/{platform}/image_diff
 */
const exeSuffix = platform.startsWith('win') ? '.exe' : '';
const IMAGE_DIFF_BINARY = path.join(testRunnerCWD, 'third_party', 'image_diff', platform, 'image_diff' + exeSuffix);
if (!fs.existsSync(IMAGE_DIFF_BINARY)) {
  throw new Error(`path to image_diff (${IMAGE_DIFF_BINARY}) did not exist.`);
}

/**
 * The generated screenshot path is relative, as we put the generated
 * screenshots into the out/TARGET/... directory.
 *
 * If we find it exists ahead of a test run, we remove it, so that when we start
 * a test run the folder is empty. This ensures no generated files left from
 * previous runs interfere.
 */
const generatedScreenshotFolderParts = ['..', '.generated', platform];
const generatedScreenshotFolder = path.join(__dirname, ...generatedScreenshotFolderParts);
if (fs.existsSync(generatedScreenshotFolder)) {
  fs.rmSync(generatedScreenshotFolder, {recursive: true});
}
fs.mkdirSync(generatedScreenshotFolder, {recursive: true});

const defaultScreenshotOpts: puppeteer.ScreenshotOptions = {
  type: 'png',
  encoding: 'binary',
  captureBeyondViewport: false,
};

const DEFAULT_RETRIES_COUNT = 1;
const DEFAULT_MS_BETWEEN_RETRIES = 150;

// Percentage difference when comparing golden vs new screenshot that is
// acceptable and will not fail the test.
const DEFAULT_SCREENSHOT_THRESHOLD_PERCENT = 0;

export const assertElementScreenshotUnchanged = async (
    element: puppeteer.ElementHandle|null,
    fileName: NonNullable<puppeteer.ScreenshotOptions['path']>,
    options: Partial<puppeteer.ScreenshotOptions> = {},
    ) => {
  assert.isOk(element, `Given element for test ${fileName} was not found.`);
  // Only assert screenshots on Linux. We don't observe platform-specific differences enough to justify
  // the costs of asserting 3 platforms per screenshot.
  if (platform !== 'linux') {
    // Extra new line to work with the progress-diff karma reporter that
    // replaces the previous line.
    console.warn('Screenshot assertions are only supported on Linux\n');
    return;
  }
  return await assertScreenshotUnchangedWithRetries(
      element, fileName, DEFAULT_SCREENSHOT_THRESHOLD_PERCENT, DEFAULT_RETRIES_COUNT, options);
};

const assertScreenshotUnchangedWithRetries = async (
    elementOrPage: puppeteer.ElementHandle|puppeteer.Page,
    fileName: NonNullable<puppeteer.ScreenshotOptions['path']>,
    maximumDiffThreshold: number,
    maximumRetries: number,
    options: Partial<puppeteer.ScreenshotOptions> = {},
    ) => {
  /**
   * You can call the helper with a path for the golden - e.g.
   * accordion/basic.png. So we split on `/` and then join on path.sep to
   * ensure we calculate the right path regardless of platform.
   */
  const fileNameForPlatform = fileName.split('/').join(path.sep);
  const goldenScreenshotPath = path.join(GOLDENS_FOLDER, fileNameForPlatform);
  const generatedScreenshotPath = path.join(
                                      generatedScreenshotFolder,
                                      fileNameForPlatform,
                                      ) as NonNullable<puppeteer.ScreenshotOptions['path']>;

  /**
   * Ensure that the directories for the golden/generated file exist. We need
   * this because if the user calls this function with `accordion/basic.png`,
   * we need to make sure that the `accordion` folder exists.
   */
  fs.mkdirSync(path.dirname(generatedScreenshotPath), {recursive: true});
  fs.mkdirSync(path.dirname(goldenScreenshotPath), {recursive: true});

  await assertScreenshotUnchanged({
    elementOrPage,
    generatedScreenshotPath,
    goldenScreenshotPath,
    screenshotOptions: options,
    fileName,
    maximumDiffThreshold,
    maximumRetries,
  });
};

interface ScreenshotAssertionOptions {
  goldenScreenshotPath: string;
  generatedScreenshotPath: NonNullable<puppeteer.ScreenshotOptions['path']>;
  screenshotOptions: Partial<puppeteer.ScreenshotOptions>;
  elementOrPage: puppeteer.ElementHandle|puppeteer.Page;
  fileName: string;
  maximumDiffThreshold: number;
  maximumRetries: number;
  retryCount?: number;
}

const assertScreenshotUnchanged = async (options: ScreenshotAssertionOptions) => {
  const {
    elementOrPage,
    generatedScreenshotPath,
    goldenScreenshotPath,
    fileName,
    maximumDiffThreshold,
    maximumRetries,
    retryCount = 1,
  } = options;
  const screenshotOptions = {...defaultScreenshotOpts, ...options.screenshotOptions, path: generatedScreenshotPath};
  await elementOrPage.screenshot(screenshotOptions);

  /**
   * The user can do UPDATE_GOLDEN=accordion/basic.png npm run screenshotstest
   * to update the golden image. This is useful if work has caused the
   * screenshot to change and therefore the test goldens need to be updated.
   */
  const shouldUpdate =
      TestConfig.onDiff.update && (TestConfig.onDiff.update === true || TestConfig.onDiff.update.includes(fileName));
  const throwAfterGoldensUpdate = TestConfig.onDiff.throw;

  let onBotAndImageNotFound = false;

  // In the event that a golden does not exist, assume the generated screenshot is the new golden.
  if (!fs.existsSync(goldenScreenshotPath)) {
    // LUCI_CONTEXT is an environment variable present on the bots.
    if (TestConfig.isLuci && !shouldUpdate) {
      // If the image is missing, there's no point retrying the test N more times.
      onBotAndImageNotFound = true;
      throw ScreenshotError.fromGeneratedScreenshot(
          'Failing test: in an environment with LUCI_CONTEXT and did not find a golden screenshot.',
          generatedScreenshotPath,
      );
    }

    console.log('Golden does not exist, using generated screenshot.');
    setGeneratedFileAsGolden(goldenScreenshotPath, generatedScreenshotPath);
    if (throwAfterGoldensUpdate) {
      throw ScreenshotError.fromGeneratedScreenshot(
          'Golden does not exist, using generated screenshot.', generatedScreenshotPath);
    }
  }

  try {
    await compare(goldenScreenshotPath, generatedScreenshotPath, maximumDiffThreshold, shouldUpdate);
  } catch (compareError) {
    if (!onBotAndImageNotFound && maximumRetries > 1) {
      console.log(
          `=> Test failed. Retrying (retry ${retryCount} of ${maximumRetries} maximum).`,
      );
    }

    if (retryCount === maximumRetries || onBotAndImageNotFound) {
      if (shouldUpdate) {
        console.log(`=> ${fileName} was out of date and failed; updating`);
        setGeneratedFileAsGolden(goldenScreenshotPath, generatedScreenshotPath);
        if (throwAfterGoldensUpdate) {
          throw compareError;
        }
        return;
      }
      // If we don't want to update, throw the assertion error so we fail the test.
      throw compareError;
    }

    // Wait a little bit before trying again
    await new Promise(resolve => setTimeout(resolve, DEFAULT_MS_BETWEEN_RETRIES));

    await assertScreenshotUnchanged({
      elementOrPage,
      generatedScreenshotPath,
      goldenScreenshotPath,
      fileName,
      maximumDiffThreshold,
      maximumRetries,
      retryCount: retryCount + 1,
      screenshotOptions: options.screenshotOptions,
    });
  }
};

interface ImageDiff {
  rawMisMatchPercentage: number;
  diffPath: string;
}

async function imageDiff(golden: string, generated: string) {
  return await new Promise<ImageDiff>(async (resolve, reject) => {
    try {
      const imageDiff: ImageDiff = {rawMisMatchPercentage: 0, diffPath: ''};
      const diffText = await execImageDiffCommand(`${IMAGE_DIFF_BINARY} --histogram ${golden} ${generated}`);

      // Parse out the number from the cmd output, i.e. diff: 48.9% failed => 48.9
      imageDiff.rawMisMatchPercentage = Number(diffText.replace(/^diff:\s/, '').replace(/%.*/, ''));

      if (Number.isNaN(imageDiff.rawMisMatchPercentage)) {
        reject('Unable to compare images');
      }

      // Only create a diff image if the images are different.
      if (imageDiff.rawMisMatchPercentage > 0) {
        imageDiff.diffPath = path.join(path.dirname(generated), `${path.basename(generated, '.png')}-diff.png`);
        await execImageDiffCommand(`${IMAGE_DIFF_BINARY} --diff ${golden} ${generated} ${imageDiff.diffPath}`);
      }

      resolve(imageDiff);
    } catch (e) {
      reject(new Error(`Error when running image_diff: ${e.stack}`));
    }
  });
}

async function execImageDiffCommand(cmd: string) {
  return await new Promise<string>((resolve, reject) => {
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

async function compare(golden: string, generated: string, maximumDiffThreshold: number, isInDiffUpdateMode: boolean) {
  const {rawMisMatchPercentage, diffPath} = await imageDiff(golden, generated);

  let debugInfo = '';
  if (TestConfig.isLuci) {
    debugInfo = '\nPlease check LUCI artifacts for the images.';
  } else if (!isInDiffUpdateMode) {
    const newImage = path.relative(testRunnerCWD, generated);
    const diffImage = path.relative(testRunnerCWD, diffPath);
    debugInfo = `
  => New image at ${newImage}
  => Diff image at ${diffImage}`;
  }

  const error = `Image assertion failed with ${rawMisMatchPercentage}% difference.${debugInfo}`;
  assert.isAtMost;
  if (rawMisMatchPercentage > maximumDiffThreshold) {
    throw ScreenshotError.fromScreenshotAssertionError(
        new Error(error),
        golden,
        generated,
        diffPath,
    );
  }

  if (rawMisMatchPercentage > 0) {
    console.log(
        `Image assertion passed with ${rawMisMatchPercentage}% difference`,
    );
  }
}

function setGeneratedFileAsGolden(golden: string, generated: string) {
  console.log(`Setting generated file to golden:
  ${path.relative(testRunnerCWD, generated)}
  => ${path.relative(testRunnerCWD, golden)}
  `);
  try {
    fs.copyFileSync(generated, golden);
  } catch (e) {
    assert.fail(`Error setting golden, ${e}`);
  }
}

// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-console */
// no-console disabled here as this is a test runner and expects to output to the console

import {assert} from 'chai';
import * as childProcess from 'child_process';
import {createHash} from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type * as puppeteer from 'puppeteer-core';

import {getTestRunnerConfigSetting} from '../conductor/test_runner_config.js';
import {
  getBrowserAndPages,
  platform,
  timeout,
  waitFor,
} from '../shared/helper.js';

/**
 * The goldens screenshot folder is always taken from the source directory (NOT
 * out/Target/...) because we commit these files to git. Therefore we use the
 * flags from the test runner config to locate the source directory and read our
 * goldens from there.
 */
const testRunnerCWD = getTestRunnerConfigSetting<string>('cwd', '');
const testSuiteSourceDir = getTestRunnerConfigSetting<string>('test-suite-source-dir', '');
if (!testRunnerCWD || !testSuiteSourceDir) {
  throw new Error('--cwd and --test-suite-source-dir must be provided when running the screenshot tests.');
}
const GOLDENS_FOLDER = path.join(testRunnerCWD, testSuiteSourceDir, 'goldens', platform);

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

const DEFAULT_RETRIES_COUNT = 5;
const DEFAULT_MS_BETWEEN_RETRIES = 150;

// Percentage difference when comparing golden vs new screenshot that is
// acceptable and will not fail the test.
const DEFAULT_SCREENSHOT_THRESHOLD_PERCENT = 4;

export const assertElementScreenshotUnchanged = async (
    element: puppeteer.ElementHandle|null, fileName: string,
    maximumDiffThreshold = DEFAULT_SCREENSHOT_THRESHOLD_PERCENT,
    options: Partial<puppeteer.ScreenshotOptions> = {}) => {
  if (!element) {
    assert.fail(`Given element for test ${fileName} was not found.`);
  }
  return assertScreenshotUnchangedWithRetries(element, fileName, maximumDiffThreshold, DEFAULT_RETRIES_COUNT, options);
};

const assertScreenshotUnchangedWithRetries = async (
    elementOrPage: puppeteer.ElementHandle|puppeteer.Page, fileName: string, maximumDiffThreshold: number,
    maximumRetries: number, options: Partial<puppeteer.ScreenshotOptions> = {}) => {
  const {frontend} = getBrowserAndPages();
  try {
    await frontend.evaluate(() => window.dispatchEvent(new Event('hidecomponentdocsui')));
    /**
     * You can call the helper with a path for the golden - e.g.
     * accordion/basic.png. So we split on `/` and then join on path.sep to
     * ensure we calculate the right path regardless of platform.
     */
    const fileNameForPlatform = fileName.split('/').join(path.sep);
    const goldenScreenshotPath = path.join(GOLDENS_FOLDER, fileNameForPlatform);
    const generatedScreenshotPath = path.join(generatedScreenshotFolder, fileNameForPlatform);

    if (fs.existsSync(generatedScreenshotPath)) {
      // If this happened something went wrong during the clean-up at the start of the test run, so let's bail.
      throw new Error(`${generatedScreenshotPath} already exists.`);
    }

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
  } finally {
    await frontend.evaluate(() => window.dispatchEvent(new Event('showcomponentdocsui')));
  }
};

interface ScreenshotAssertionOptions {
  goldenScreenshotPath: string;
  generatedScreenshotPath: string;
  screenshotOptions: Partial<puppeteer.ScreenshotOptions>;
  elementOrPage: puppeteer.ElementHandle|puppeteer.Page;
  fileName: string;
  maximumDiffThreshold: number;
  maximumRetries: number;
  retryCount?: number;
}

const assertScreenshotUnchanged = async(options: ScreenshotAssertionOptions): Promise<void> => {
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
  await (elementOrPage as puppeteer.Page).screenshot(screenshotOptions);

  /**
   * The user can do UPDATE_GOLDEN=accordion/basic.png npm run screenshotstest
   * to update the golden image. This is useful if work has caused the
   * screenshot to change and therefore the test goldens need to be updated.
   */
  const shouldUpdate = Boolean(process.env.FORCE_UPDATE_ALL_GOLDENS) ||
      Boolean(process.env.UPDATE_GOLDEN && process.env.UPDATE_GOLDEN === fileName);
  const throwAfterGoldensUpdate = Boolean(process.env.THROW_AFTER_GOLDENS_UPDATE);

  let onBotAndImageNotFound = false;

  // In the event that a golden does not exist, assume the generated screenshot is the new golden.
  if (!fs.existsSync(goldenScreenshotPath)) {
    // LUCI_CONTEXT is an environment variable present on the bots.
    if (process.env.LUCI_CONTEXT !== undefined && !shouldUpdate) {
      // If the image is missing, there's no point retrying the test N more times.
      onBotAndImageNotFound = true;
      throw ScreenshotError.fromMessage(
          `Failing test: in an environment with LUCI_CONTEXT and did not find a golden screenshot.

        Here's the image that this test generated as a base64:

        data:image/png;base64,${fs.readFileSync(generatedScreenshotPath, {
            encoding: 'base64',
          })}
        `,
          generatedScreenshotPath);
    }

    console.log('Golden does not exist, using generated screenshot.');
    setGeneratedFileAsGolden(goldenScreenshotPath, generatedScreenshotPath);
    if (throwAfterGoldensUpdate) {
      throw new Error('Golden does not exist, using generated screenshot.');
    }
  }

  try {
    await compare(goldenScreenshotPath, generatedScreenshotPath, maximumDiffThreshold);
  } catch (compareError) {
    if (!onBotAndImageNotFound) {
      console.log(`=> Test failed. Retrying (retry ${retryCount} of ${maximumRetries} maximum).`);
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
  return new Promise<ImageDiff>(async (resolve, reject) => {
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

async function compare(golden: string, generated: string, maximumDiffThreshold: number) {
  const isOnBot = process.env.LUCI_CONTEXT !== undefined;

  if (!isOnBot && process.env.SKIP_SCREENSHOT_COMPARISONS_FOR_FAST_COVERAGE) {
    // When checking test coverage locally the tests get sped up significantly
    // if we do not do the actual image comparison. Obviously this makes the
    // tests all pass, but it is useful to quickly get coverage stats.
    // Therefore you can pass this flag to skip all screenshot comparisions. We
    // make sure this is only possible if not on a CQ bot and 99.9% of the time
    // this should not be used!
    return;
  }

  const {rawMisMatchPercentage, diffPath} = await imageDiff(golden, generated);

  const base64TestGeneratedImageLog = `Here's the image the test generated as a base64:
    data:image/png;base64,${fs.readFileSync(generated, {
    encoding: 'base64',
  })}`;

  const base64DiffImageLog = `And here's the diff image as base64:\n
    data:image/png;base64,${
      diffPath ? fs.readFileSync(diffPath, {
        encoding: 'base64',
      }) :
                 ''}`;

  let debugInfo = '';
  if (isOnBot) {
    debugInfo = `${base64TestGeneratedImageLog}\n${base64DiffImageLog}\n`;
  } else {
    debugInfo = `Run the tests again with FORCE_UPDATE_ALL_GOLDENS to update all tests that fail.
  Only do this if you expected this screenshot to have changed!

  Diff image generated at:
  => ${path.relative(testRunnerCWD, diffPath)}\n`;
  }

  try {
    assert.isAtMost(
        rawMisMatchPercentage, maximumDiffThreshold,
        `There is a ${rawMisMatchPercentage}% difference between the golden and generated image.

    ${debugInfo}`);
    if (rawMisMatchPercentage > 0) {
      console.log(`test passed with difference of ${rawMisMatchPercentage}%`);
    }

  } catch (assertionError) {
    throw ScreenshotError.fromError(assertionError, golden, generated, diffPath);
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

export async function waitForDialogAnimationEnd(root?: puppeteer.ElementHandle) {
  const ANIMATION_TIMEOUT = 2000;
  const dialog = await waitFor('dialog[open]', root);
  const animationPromise = dialog.evaluate((dialog: Element) => {
    return new Promise<void>(resolve => {
      dialog.addEventListener('animationend', () => resolve(), {once: true});
    });
  });
  await Promise.race([animationPromise, timeout(ANIMATION_TIMEOUT)]);
}

type ArtifactGroup = {
  [key: string]: {
    filePath: string,
  },
};

export class ScreenshotError extends Error {
  // The max length of the summary is 4000, but we need to leave some room for
  // the rest of the HTML formatting (e.g. <pre> and </pre>).
  static readonly SUMMARY_LENGTH_CUTOFF = 3900;
  readonly screenshots: ArtifactGroup;

  private constructor(screenshots: ArtifactGroup, message?: string, cause?: Error) {
    message = message ?? cause?.message ?? '';
    super(message);
    this.cause = cause;
    this.screenshots = screenshots;
  }

  /**
   * Creates a ScreenshotError when a reference golden does not exists.
   */
  static fromMessage(message: string, generatedImgPath: string) {
    const screenshots = {
      'generated': {filePath: this.stashArtifact(generatedImgPath, 'generated')},
    };
    return new ScreenshotError(screenshots, message, undefined);
  }

  /**
   * Creates a ScreenshotError when a generated screenshot is different from
   * the golden.
   */
  static fromError(error: Error, goldenImgPath: string, generatedImgPath: string, diffImgPath: string) {
    const screenshots = {
      'expected_image': {filePath: this.stashArtifact(goldenImgPath, 'expected')},
      'actual_image': {filePath: this.stashArtifact(generatedImgPath, 'actual')},
      'image_diff': {filePath: this.stashArtifact(diffImgPath, 'diff')},
    };
    return new ScreenshotError(screenshots, undefined, error);
  }

  /**
   * Creates a ScreenshotError an unexpected error occurs. Screenshots are
   * were taken for both the target and the frontend.
   */
  static fromBase64Images(error: unknown, targetScreenshot?: string, frontendScreenshot?: string) {
    if (!targetScreenshot || !frontendScreenshot) {
      console.error('No artifacts to save.');
      return error;
    }
    const screenshots = {
      'target': {filePath: this.saveArtifact(targetScreenshot)},
      'frontend': {filePath: this.saveArtifact(frontendScreenshot)},
    };
    return new ScreenshotError(screenshots, undefined, error as Error);
  }

  /**
   * Costructs artifact group and summary for Milo
   * at resultdb publication time.
   */
  toMiloArtifacts(): [ArtifactGroup, string] {
    let summary: string;
    if ('expected_image' in this.screenshots) {
      // no summary; autogenerated by Milo based on artifact name convention
      summary = '';
    } else if ('generated' in this.screenshots) {
      // TODO(liviurau): embed image once Milo supports it
      summary = '<pre>' + this.message.slice(0, ScreenshotError.SUMMARY_LENGTH_CUTOFF) +
          '</pre><p>Screenshot generated (see below)</p>';
    } else {
      // TODO(liviurau): embed images once Milo supports it
      summary = '<pre>' + this.message.slice(0, ScreenshotError.SUMMARY_LENGTH_CUTOFF) +
          '</pre><p>Unexppected error. See target and frontend screenshots ' +
          'below.</p>';
    }
    return [this.screenshots, summary];
  }

  /**
   * Copy artifacts in tmp folder so they remain available
   * at resultdb publication time.
   */
  private static stashArtifact(originalFile: string, tag: string): string {
    const stashedFileName = tag + '-' + path.basename(originalFile);
    const artifactPath = path.join(os.tmpdir(), stashedFileName);
    fs.copyFileSync(originalFile, artifactPath);
    return artifactPath;
  }

  /**
   * Save base64 image in tmp folder to make it available at resultdb
   * publication time.
   */
  private static saveArtifact(base64Image: string): string {
    base64Image = base64Image.replace(/^data:image\/png;base64,/, '');
    const fileName = createHash('sha256').update(base64Image).digest('hex');
    const artifactPath = path.join(os.tmpdir(), fileName);
    fs.writeFileSync(artifactPath, base64Image, {encoding: 'base64'});
    return artifactPath;
  }
}

// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as os from 'node:os';
import * as path from 'node:path';

// @ts-expect-error created at test/BUILD.gn
import build from '../build.js';

export const SOURCE_ROOT: string = path.join(__dirname, '..', build.SOURCE_ROOT);
export const CHECKOUT_ROOT: string = path.join(__dirname, '..', build.CHECKOUT_ROOT);
export const BUILD_ROOT: string = path.join(__dirname, '..', build.BUILD_ROOT);
export const GEN_DIR: string = path.normalize(path.join(__dirname, '..', '..'));
export const BUILD_WITH_CHROMIUM: boolean = build.BUILD_WITH_CHROMIUM;
export const TEST_ID_REGEX: RegExp = /^(.*\.[tj]s):(.*)$/;

function rebase(fromRoot: string, toRoot: string, filename: string, newExt?: string) {
  if (!path.isAbsolute(filename) || !path.isAbsolute(fromRoot) || !path.isAbsolute(toRoot)) {
    return filename;
  }

  const relative = path.relative(fromRoot, filename);
  if (relative.startsWith('.')) {
    return filename;
  }
  if (!path.relative(toRoot, filename).startsWith('.') && toRoot.length > fromRoot.length) {
    return filename;
  }

  const rebased = path.resolve(toRoot, relative);
  if (!newExt) {
    return rebased;
  }

  const {ext} = path.parse(rebased);
  return ext.length > 0 ? rebased.substr(0, rebased.length - ext.length) + newExt : rebased;
}

export function isContainedInDirectory(contained: string, directory: string): boolean {
  return !path.relative(directory, contained).startsWith('..');
}

export class PathPair {
  protected constructor(readonly sourcePath: string, readonly buildPath: string) {
    if (!path.isAbsolute(sourcePath) || !path.isAbsolute(buildPath)) {
      throw new Error('Repo paths must be absolute');
    }
  }

  static get(pathname: string): PathPair|null {
    const absPath = path.normalize(path.resolve(pathname));
    if (!absPath) {
      return null;
    }

    const sourcePath = rebase(GEN_DIR, SOURCE_ROOT, absPath, '.ts');
    const buildPath = rebase(SOURCE_ROOT, GEN_DIR, absPath, '.js');

    return new PathPair(sourcePath, buildPath);
  }
}

// Test is either identified by the test file or a test file + the id for the
// subtest in that file.
export class TestId<Pair extends PathPair = PathPair> {
  protected constructor(readonly pathPair: Pair, readonly subTestId?: string) {
  }

  toBuildTestId(): string {
    if (!this.subTestId) {
      return this.pathPair.buildPath;
    }
    return `${this.pathPair.buildPath}:${this.subTestId}`;
  }

  static create(testId: string): TestId<PathPair>|null {
    let subTestId = undefined;
    let pathname = testId;
    if (TEST_ID_REGEX.test(testId)) {
      const match = testId.match(TEST_ID_REGEX)!;
      subTestId = match[2];
      pathname = match[1];
    }
    const pathPair = PathPair.get(pathname);
    if (!pathPair) {
      return null;
    }
    return new TestId(pathPair, subTestId);
  }
}

export function defaultChromePath(): string {
  if (BUILD_WITH_CHROMIUM) {
    // In a full chromium checkout, find the chrome binary in the build directory.
    const paths = {
      linux: path.join('chrome'),
      darwin: path.join('Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      win32: path.join('chrome.exe'),
    };
    return path.join(BUILD_ROOT, paths[os.platform() as 'linux' | 'win32' | 'darwin']);
  }
  return path.join(SOURCE_ROOT, 'third_party', 'chrome', localChromePath());
}

function localChromePath() {
  const platform = os.platform();
  switch (platform) {
    case 'linux':
      return path.join('chrome-linux', 'chrome-linux64', 'chrome');
    case 'darwin': {
      const name = os.arch() === 'arm64' ? 'chrome-mac-arm64' : 'chrome-mac-x64';
      return path.join(name, name, 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
    }
    case 'win32':
      return path.join('chrome-win', 'chrome-win64', 'chrome.exe');
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

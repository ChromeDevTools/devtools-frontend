// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import * as path from 'node:path';

import {resolveBuildTestId, SOURCE_ROOT, TEST_ID_REGEX} from './paths.js';
import {platform} from './platform.js';
import {TestConfig} from './test_config.js';
import {parseExpectations as parse, serializeExpectations as serialize} from './test_expectations_parser.js';

export type ExpectationResult = 'Failure'|'Pass'|'Skip';

export interface Expectation {
  /** The original line. If this is a comment or empty, other fields are undefined. */
  line: string;
  isCommentOrEmpty?: boolean;
  bugs?: string[];
  platforms?: string[];
  testName?: string;
  results?: ExpectationResult[];
}

export const parseExpectations = parse as (content: string) => Expectation[];
export const serializeExpectations = serialize as (expectations: Expectation[]) => string;
const parsedExpectations = new Map<string, Expectation[]>();

export function getExpectedResults(testId: string): ExpectationResult[]|undefined {
  const expectationsPath = TestConfig.expectationsFile ? path.resolve(TestConfig.expectationsFile) :
                                                         path.join(SOURCE_ROOT, 'test', 'TestExpectations');

  if (!parsedExpectations.has(expectationsPath)) {
    if (fs.existsSync(expectationsPath)) {
      const content = fs.readFileSync(expectationsPath, 'utf8');
      parsedExpectations.set(expectationsPath, parseExpectations(content).filter(e => !e.isCommentOrEmpty));
    } else {
      parsedExpectations.set(expectationsPath, []);
    }
  }

  const expectations = parsedExpectations.get(expectationsPath)!;

  const match = expectations.find(e => {
    if (!e.testName) {
      return false;
    }
    if (e.platforms && e.platforms.length > 0) {
      if (!e.platforms.includes(platform)) {
        return false;
      }
    }
    if (TEST_ID_REGEX.test(e.testName)) {
      return testId === e.testName;
    }
    return testId === e.testName || testId.startsWith(e.testName + ':');
  });

  return match?.results;
}

export function isExpectedResult(
    {exactTestId, success, skipped}: {exactTestId: string, success: boolean, skipped: boolean}): boolean {
  const expectedResults = getExpectedResults(exactTestId);
  if (!expectedResults) {
    return success || skipped;
  }
  if (skipped) {
    return expectedResults.includes('Skip');
  }
  if (success) {
    return expectedResults.includes('Pass');
  }
  return expectedResults.includes('Failure');
}

export function getSkippedTests(): string[] {
  const expectationsPath = TestConfig.expectationsFile ? path.resolve(TestConfig.expectationsFile) :
                                                         path.join(SOURCE_ROOT, 'test', 'TestExpectations');

  if (!parsedExpectations.has(expectationsPath)) {
    if (fs.existsSync(expectationsPath)) {
      const content = fs.readFileSync(expectationsPath, 'utf8');
      parsedExpectations.set(expectationsPath, parseExpectations(content).filter(e => !e.isCommentOrEmpty));
    } else {
      parsedExpectations.set(expectationsPath, []);
    }
  }

  const expectations = parsedExpectations.get(expectationsPath)!;

  const skippedFromExpectations = expectations
                                      .filter(e => {
                                        if (!e.testName) {
                                          return false;
                                        }
                                        if (e.results && !e.results.includes('Skip')) {
                                          return false;
                                        }
                                        if (e.platforms && e.platforms.length > 0 && !e.platforms.includes(platform)) {
                                          return false;
                                        }
                                        return true;
                                      })
                                      .map(e => resolveBuildTestId(e.testName as string));
  return [...skippedFromExpectations, ...TestConfig.excludedTests];
}

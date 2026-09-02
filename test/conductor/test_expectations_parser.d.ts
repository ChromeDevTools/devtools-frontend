// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export type ExpectationResult = 'Failure'|'Pass'|'Skip';

export interface Expectation {
  line: string;
  isCommentOrEmpty?: boolean;
  bugs?: string[];
  platforms?: string[];
  testName?: string;
  results?: ExpectationResult[];
}

export function parseExpectations(content: string): Expectation[];
export function parseExpectationLine(line: string): Expectation;
export function serializeExpectations(expectations: Expectation[]): string;
export function serializeExpectationLine(expectation: Expectation): string;

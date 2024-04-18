// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import * as path from 'path';
import {openSourcesPanel} from 'test/e2e/helpers/sources-helpers.js';
import {
  getTestServerPort,
  goTo,
} from 'test/shared/helper.js';

export interface Action {
  action: string;
  file?: string;
  breakpoint?: string;
}

export interface Variable {
  name: string;
  type?: string;
  value?: string;
}

export interface Evaluation {
  expression: string;
  value: string;
}

export interface Step {
  reason: string;
  file: string;
  line: number;
  actions?: Action[];
  variables?: Variable[];
  evaluations?: Evaluation[];
  thread?: string;
}

export interface TestSpec {
  name: string;
  test: string;
  extension_parameters?: string;
  script?: Step[];
  file?: string;
}

export async function openTestSuiteResourceInSourcesPanel(testInput: string) {
  await goTo(`${getTestsuiteResourcesPath()}/extension_test_suite/${testInput}`);

  await openSourcesPanel();
}

export function getTestsuiteResourcesPath() {
  return `https://localhost:${getTestServerPort()}`;
}

export function loadTests() {
  const tests = JSON.parse(fs.readFileSync(path.join(__dirname, 'tests.json')).toString());
  return tests as TestSpec[];
}

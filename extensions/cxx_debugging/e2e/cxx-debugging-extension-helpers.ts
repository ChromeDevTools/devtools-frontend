// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import * as path from 'node:path';
import {openSourcesPanel} from 'test/e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from 'test/e2e/shared/DevToolsPage.js';
import type {InspectedPage} from 'test/e2e/shared/InspectedPage.js';

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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  extension_parameters?: string;
  script?: Step[];
  file?: string;
}

export async function openTestSuiteResourceInSourcesPanel(testInput: string, inspectedPage: InspectedPage,
                                                          devToolsPage: DevToolsPage) {
  await inspectedPage.goTo(`${inspectedPage.domain()}/extension_test_suite/${testInput}`);

  await openSourcesPanel(devToolsPage);
}

export function loadTests() {
  const tests = JSON.parse(fs.readFileSync(path.join(__dirname, 'tests.json')).toString());
  return tests as TestSpec[];
}

export const CXX_DEBUGGING_EXTENSION_PATH =
    path.join(__dirname, '..', '..', '..', 'DevTools_CXX_Debugging.stage2', 'src');

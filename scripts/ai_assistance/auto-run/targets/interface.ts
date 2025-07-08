// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {ElementHandle, Page} from 'puppeteer-core';

import type {IndividualPromptRequestResponse, PatchTest} from '../../types.d.ts';

export interface TargetPreparationResult {
  queries: string[];
  explanation: string;
  rawComment: Record<string, string>;  // Assuming parseComment result
  patchTest?: PatchTest;
  performanceAnnotation?: ElementHandle<HTMLElement>;
}

export interface TargetExecutor {
  prepare(exampleUrl: string, page: Page, devtoolsPage: Page, commonLog: (text: string) => void, userArgs: {
    includeFollowUp: boolean,
  }): Promise<TargetPreparationResult>;

  execute(
      devtoolsPage: Page,
      preparationResult: TargetPreparationResult,
      exampleId: string,
      randomize: boolean,
      commonLog: (text: string) => void,
      ): Promise<IndividualPromptRequestResponse[]>;
}

// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as yaml from 'js-yaml';
import type {Page} from 'puppeteer-core';

import type {IndividualPromptRequestResponse, PatchTest, TestTarget} from '../../types.d.ts';

import type {TargetExecutor, TargetPreparationResult} from './interface.ts';

export class PatchingExecutor implements TargetExecutor {
  async prepare(exampleUrl: string, page: Page, _devtoolsPage: Page, commonLog: (text: string) => void, userArgs: {
    includeFollowUp: boolean,
    testTarget: TestTarget,
  }): Promise<TargetPreparationResult> {
    commonLog(`[PatchingExecutor] Preparing example: ${exampleUrl} with args: ${JSON.stringify(userArgs)}`);
    const text = await page.evaluate(() => {
      return document.querySelector('code')?.innerText;
    });
    if (!text) {
      throw new Error('Could not find YAML text for patching test');
    }
    const test: PatchTest = yaml.load(text);

    // Workspaces are slow to appear.
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      queries: [test.query],  // The query comes from the PatchTest
      explanation: `Patch test for ${test.folderName}`,
      rawComment: {prompt: test.query, explanation: `Patch test for ${test.folderName}`},
      patchTest: test,
    };
  }

  async execute(
      devtoolsPage: Page,
      preparationResult: TargetPreparationResult,
      exampleId: string,
      randomize: boolean,
      commonLog: (text: string) => void,
      ): Promise<IndividualPromptRequestResponse[]> {
    commonLog(`[PatchingExecutor] Executing for exampleId: ${exampleId}`);
    if (!preparationResult.patchTest) {
      throw new Error('PatchTest data is missing from preparationResult for PatchingExecutor');
    }
    const test = preparationResult.patchTest;
    await devtoolsPage.waitForFunction(() => {
      return 'aiAssistanceTestPatchPrompt' in window;
    });
    const {assertionFailures, debugInfo, error} =
        await devtoolsPage.evaluate(async (folderName, query, changedFiles) => {
          // @ts-expect-error this is run in the DevTools page context where this function does exist.
          return await aiAssistanceTestPatchPrompt(folderName, query, changedFiles);
        }, test.folderName, test.query, test.changedFiles);

    return [{
      // Estimate a score based on the number of assertion
      // failures and if the flow succeeded.
      score: error ? 0.25 : Math.max((1 - (assertionFailures.length * 0.25)), 0.25),
      request: test.query,
      response: debugInfo,
      exampleId,
      error,
      assertionFailures,
    }];
  }
}

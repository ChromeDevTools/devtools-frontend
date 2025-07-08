// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Page} from 'puppeteer-core';

import type {IndividualPromptRequestResponse, TestTarget} from '../../types.d.ts';
import {
  executePromptCycle,
  extractCommentMetadata,
  openAiAssistancePanelFromMenu,
  setupElementsPanelAndInspect,
  stripCommentsFromPage
} from '../shared/puppeteer-helpers.ts';

import type {TargetExecutor, TargetPreparationResult} from './interface.ts';

export class ElementsMultimodalExecutor implements TargetExecutor {
  async prepare(exampleUrl: string, page: Page, devtoolsPage: Page, commonLog: (text: string) => void, userArgs: {
    includeFollowUp: boolean,
    testTarget: TestTarget,
  }): Promise<TargetPreparationResult> {
    commonLog(`[ElementsMultimodalExecutor] Preparing example: ${exampleUrl} for target: ${userArgs.testTarget}`);
    await setupElementsPanelAndInspect(devtoolsPage, page, commonLog);
    const metadata = await extractCommentMetadata(page, userArgs.includeFollowUp, commonLog);
    await openAiAssistancePanelFromMenu(devtoolsPage, commonLog);
    await stripCommentsFromPage(page, commonLog);

    return {
      queries: metadata.queries,
      explanation: metadata.explanation,
      rawComment: metadata.rawComment,
    };
  }

  async execute(
      devtoolsPage: Page,
      preparationResult: TargetPreparationResult,
      exampleId: string,
      randomize: boolean,
      commonLog: (text: string) => void,
      ): Promise<IndividualPromptRequestResponse[]> {
    const allResults: IndividualPromptRequestResponse[] = [];
    const inputSelector = 'aria/Ask a question about the selected element';

    for (const query of preparationResult.queries) {
      commonLog(`[ElementsMultimodalExecutor] Executing query: "${query}" for example: ${exampleId}`);
      const results = await executePromptCycle(
          devtoolsPage,
          query,
          inputSelector,
          exampleId,
          /* isMultimodal */ true,
          randomize,
          commonLog,
      );
      allResults.push(...results);
    }
    commonLog(`[ElementsMultimodalExecutor] Finished executing all queries for example: ${exampleId}`);
    return allResults;
  }
}

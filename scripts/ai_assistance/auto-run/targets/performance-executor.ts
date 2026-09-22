// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Page} from 'puppeteer-core';

import type {IndividualPromptRequestResponse, TaskId, TestTarget} from '../../types.js';
import {
  executePromptCycle,
  extractCommentMetadata,
  openAiAssistancePanelFromMenu,
  stripCommentsFromPage,
  waitForElementToHaveHeight,
} from '../shared/puppeteer-helpers.ts';

import type {TargetExecutor, TargetPreparationResult} from './interface.js';

export class PerformanceExecutor implements TargetExecutor {
  async prepare(
      exampleUrl: string,
      page: Page,
      devtoolsPage: Page,
      commonLog: (text: string) => void,
      userArgs: {includeFollowUp: boolean, testTarget: TestTarget},
      ): Promise<TargetPreparationResult> {
    commonLog(`[PerformanceExecutor] Preparing example: ${exampleUrl} for target: ${userArgs.testTarget}`);

    await devtoolsPage.locator(':scope >>> #tab-timeline').setTimeout(5000).click();
    commonLog('[PerformanceExecutor] Opened Performance panel');

    const recordAndReloadButton = await devtoolsPage.$('aria/Record and reload');
    if (!recordAndReloadButton) {
      throw new Error('[PerformanceExecutor] Could not find "Record and reload" button.');
    }
    await recordAndReloadButton.click();
    commonLog('[PerformanceExecutor] Clicked "Record and reload"');

    commonLog('[PerformanceExecutor] Waiting for flame chart canvas...');
    const canvas = await devtoolsPage.waitForSelector(':scope >>> canvas.flame-chart-canvas', {timeout: 60_000});
    if (!canvas) {
      throw new Error('[PerformanceExecutor] Could not find flame chart canvas.');
    }
    const canvasVisible = await waitForElementToHaveHeight(canvas, 200, 150);
    if (!canvasVisible) {
      throw new Error('[PerformanceExecutor] Flame chart canvas did not become visible (height > 200px).');
    }
    commonLog('[PerformanceExecutor] Flame chart canvas is visible. Trace loaded.');

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
      taskId: TaskId,
      randomize: boolean,
      commonLog: (text: string) => void,
      ): Promise<IndividualPromptRequestResponse[]> {
    const allResults: IndividualPromptRequestResponse[] = [];
    const inputSelector = 'aria/Ask a question about the selected performance trace';

    for (const query of preparationResult.queries) {
      commonLog(`[PerformanceExecutor] Executing query: "${query}" for task: ${taskId}`);
      const results = await executePromptCycle(
          devtoolsPage,
          query,
          inputSelector,
          taskId,
          /* isMultimodal */ false,
          randomize,
          commonLog,
      );
      allResults.push(...results);
    }
    commonLog(`[PerformanceExecutor] Finished executing all queries for task: ${taskId}`);
    return allResults;
  }
}

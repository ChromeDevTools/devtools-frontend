// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {ElementHandle, Page} from 'puppeteer-core';

import type {IndividualPromptRequestResponse, TestTarget} from '../../types.d.ts';
import {
  executePromptCycle,
  extractCommentMetadata,
  stripCommentsFromPage,
} from '../shared/puppeteer-helpers.ts';

import type {TargetExecutor, TargetPreparationResult} from './interface.ts';

export class NetworkExecutor implements TargetExecutor {
  async prepare(exampleUrl: string, page: Page, devtoolsPage: Page, commonLog: (text: string) => void, userArgs: {
    includeFollowUp: boolean,
    testTarget: TestTarget,
  }): Promise<TargetPreparationResult> {
    commonLog(`[NetworkExecutor] Preparing example: ${exampleUrl} for target: ${userArgs.testTarget}`);
    const metadata = await extractCommentMetadata(page, userArgs.includeFollowUp, commonLog);

    if (!metadata.rawComment.request) {
      throw new Error(
          '[NetworkExecutor] Cannot execute network example without "Request:" in example comment metadata.');
    }
    const requestName = metadata.rawComment.request;

    // Open network panel and reload to capture requests
    await devtoolsPage.locator(':scope >>> #tab-network').click();
    commonLog('[NetworkExecutor] Reloading page to capture network requests');
    await page.reload({waitUntil: 'networkidle0'});

    commonLog(`[NetworkExecutor] Looking for request: ${requestName}`);

    // Wait for the data grid to appear
    const dataGridRowSelector = '.data-grid-data-grid-node';
    await devtoolsPage.waitForSelector(dataGridRowSelector);

    // Apply filter to find the request (handling virtual list/off-screen rows)
    commonLog('[NetworkExecutor] Filtering requests');
    const filterInputSelector = '.filter-bar .text-filter .toolbar-input-prompt';

    // Ensure filter bar is visible
    const filterInput = await devtoolsPage.$(filterInputSelector);
    if (!filterInput || !(await filterInput.boundingBox())) {
      const filterButtonSelector = '[aria-label="Filter"]';
      await devtoolsPage.click(filterButtonSelector);
      await devtoolsPage.waitForSelector(filterInputSelector);
    }

    // Clear existing filter if any
    const clearButtonSelector = 'devtools-button.toolbar-input-clear-button';
    const clearButton = await devtoolsPage.$(clearButtonSelector);
    if (clearButton && await clearButton.boundingBox()) {
      await clearButton.click();
    }

    await devtoolsPage.click(filterInputSelector);
    await devtoolsPage.keyboard.type(requestName);

    // Wait for the specific request to appear in the grid
    // We wait for a row that contains the text
    const requestNode = await devtoolsPage.waitForFunction((selector, text) => {
      const rows = document.querySelectorAll(selector);
      for (const row of rows) {
        if (row.textContent?.includes(text)) {
          return row;
        }
      }
      return false;
    }, {timeout: 5000}, dataGridRowSelector, requestName) as ElementHandle<Element>| false;

    if (!requestNode) {
      throw new Error(`[NetworkExecutor] Could not find a request matching: ${requestName}`);
    }

    commonLog('[NetworkExecutor] Selecting request');
    await requestNode.click();

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
    const inputSelector = 'aria/Ask a question about the selected network request';

    for (const query of preparationResult.queries) {
      commonLog(`[NetworkExecutor] Executing query: "${query}" for example: ${exampleId}`);
      const results = await executePromptCycle(
          devtoolsPage,
          query,
          inputSelector,
          exampleId,
          /* isMultimodal */ false,
          randomize,
          commonLog,
      );
      allResults.push(...results);
    }
    return allResults;
  }
}

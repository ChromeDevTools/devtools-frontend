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

    // Wait for the data grid to appear and populate
    const dataGridRowSelector = '.data-grid-data-grid-node';
    await devtoolsPage.waitForSelector(dataGridRowSelector);

    const rows = await devtoolsPage.$$(dataGridRowSelector);
    if (rows.length === 0) {
      throw new Error('[NetworkExecutor] No requests found in data grid.');
    }

    let requestNode: ElementHandle<Element>|undefined;

    if (requestName) {
      for (const row of rows) {
        const text = await row.evaluate(el => el.textContent);
        if (text?.includes(requestName)) {
          requestNode = row;
          break;
        }
      }
    }

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

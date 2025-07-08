// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Page} from 'puppeteer-core'; // ElementHandle removed as it's not directly used by this class anymore

import type {IndividualPromptRequestResponse, TestTarget} from '../../types.d.ts';
import {
  executePromptCycle,
  extractCommentMetadata,
  loadPerformanceTrace,
  stripCommentsFromPage
} from '../shared/puppeteer-helpers.ts';
import type {TraceDownloader} from '../trace-downloader.ts';

import type {TargetExecutor, TargetPreparationResult} from './interface.ts';

export class PerformanceInsightsExecutor implements TargetExecutor {
  readonly #traceDownloader: TraceDownloader;

  constructor(traceDownloader: TraceDownloader) {
    this.#traceDownloader = traceDownloader;
  }

  async prepare(exampleUrl: string, page: Page, devtoolsPage: Page, commonLog: (text: string) => void, userArgs: {
    includeFollowUp: boolean,
    testTarget: TestTarget,
  }): Promise<TargetPreparationResult> {
    commonLog(`[PerfInsightsExecutor] Preparing example: ${exampleUrl} for target: ${userArgs.testTarget}`);
    await loadPerformanceTrace(devtoolsPage, this.#traceDownloader, exampleUrl, page, commonLog);
    const metadata = await extractCommentMetadata(page, userArgs.includeFollowUp, commonLog);

    if (!metadata.rawComment.insight) {
      throw new Error(
          '[PerfInsightsExecutor] Cannot execute performance-insights example without "Insight:" in example comment metadata.');
    }
    const insightTitle = metadata.rawComment.insight;

    // Select Insight in Performance Panel
    commonLog('[PerfInsightsExecutor] Selecting insight in the performance panel...');
    await devtoolsPage.locator(':scope >>> #tab-timeline').setTimeout(5000).click();

    const sidebarButton = await devtoolsPage.$('aria/Show sidebar');
    if (sidebarButton) {
      await sidebarButton.click();
      commonLog('[PerfInsightsExecutor] Opened Performance panel sidebar.');
    } else {
      commonLog('[PerfInsightsExecutor] Performance panel sidebar already open or not found.');
    }

    commonLog(`[PerfInsightsExecutor] Expanding Insight: ${insightTitle}`);
    // Now find the header for the right insight, and click to expand it.
    // Note that we can't use aria here because the aria-label for insights
    // can be extended to include estimated savings. So we use the data
    // attribute instead. The title is JSON so it is already wrapped with double quotes.
    await devtoolsPage.locator(`:scope >>> [data-insight-header-title=${insightTitle}]`).setTimeout(10_000).click();
    commonLog('[PerfInsightsExecutor] Clicked on insight header.');

    // Open AI Assistance Panel via "Ask AI" button
    commonLog('[PerfInsightsExecutor] Clicking "Ask AI" button for the insight...');
    await devtoolsPage.locator(':scope >>> devtools-button[data-insights-ask-ai]').setTimeout(5000).click();
    commonLog('[PerfInsightsExecutor] AI Assistance panel opened via insights button.');

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
    const inputSelector = 'aria/Ask a question about the selected performance insight';

    for (const query of preparationResult.queries) {
      commonLog(`[PerfInsightsExecutor] Executing query: "${query}" for example: ${exampleId}`);
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
    commonLog(`[PerfInsightsExecutor] Finished executing all queries for example: ${exampleId}`);
    return allResults;
  }
}

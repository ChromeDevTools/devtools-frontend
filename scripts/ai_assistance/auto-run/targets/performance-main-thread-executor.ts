// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {ElementHandle, Page} from 'puppeteer-core';

import type {IndividualPromptRequestResponse, TestTarget} from '../../types.d.ts';
import {
  executePromptCycle,
  extractCommentMetadata,
  loadPerformanceTrace,
  openAiAssistancePanelFromMenu,
  stripCommentsFromPage
} from '../shared/puppeteer-helpers.ts';
import type {TraceDownloader} from '../trace-downloader.ts';

import type {TargetExecutor, TargetPreparationResult} from './interface.ts';

export class PerformanceMainThreadExecutor implements TargetExecutor {
  readonly #traceDownloader: TraceDownloader;

  constructor(traceDownloader: TraceDownloader) {
    this.#traceDownloader = traceDownloader;
  }

  async #lookForAnnotatedPerformanceEvent(devtoolsPage: Page, commonLog: (text: string) => void):
      Promise<ElementHandle<HTMLElement>> {
    commonLog('[PerfMainThreadExecutor] Looking for annotated performance event...');
    const elem = await devtoolsPage.$(
        'devtools-entry-label-overlay >>> [aria-label="Entry label"]',
    );
    if (!elem) {
      throw new Error(
          '[PerfMainThreadExecutor] Could not find annotated event in the performance panel. Only traces that have one entry label annotation are supported.',
      );
    }
    commonLog('[PerfMainThreadExecutor] Found annotated performance event.');
    return elem as ElementHandle<HTMLElement>;
  }

  async prepare(exampleUrl: string, page: Page, devtoolsPage: Page, commonLog: (text: string) => void, userArgs: {
    includeFollowUp: boolean,
    testTarget: TestTarget,
  }): Promise<TargetPreparationResult> {
    commonLog(`[PerfMainThreadExecutor] Preparing example: ${exampleUrl} for target: ${userArgs.testTarget}`);
    await loadPerformanceTrace(devtoolsPage, this.#traceDownloader, exampleUrl, page, commonLog);
    const performanceAnnotation = await this.#lookForAnnotatedPerformanceEvent(devtoolsPage, commonLog);
    const metadata = await extractCommentMetadata(page, userArgs.includeFollowUp, commonLog);

    // Select Event in Timeline
    commonLog('[PerfMainThreadExecutor] Selecting event in the performance timeline...');
    await devtoolsPage.locator(':scope >>> #tab-timeline').setTimeout(5000).click();
    await performanceAnnotation.click();
    await devtoolsPage.waitForSelector(
        ':scope >>> .timeline-details-chip-title',
    );
    commonLog('[PerfMainThreadExecutor] Event selected in timeline.');
    await openAiAssistancePanelFromMenu(devtoolsPage, commonLog);
    await stripCommentsFromPage(page, commonLog);

    return {
      queries: metadata.queries,
      explanation: metadata.explanation,
      rawComment: metadata.rawComment,
      performanceAnnotation,  // Still need to return this
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
    const inputSelector = 'aria/Ask a question about the selected item and its call tree';

    if (!preparationResult.performanceAnnotation) {
      throw new Error('[PerfMainThreadExecutor] performanceAnnotation is missing from preparationResult.');
    }

    for (const query of preparationResult.queries) {
      commonLog(`[PerfMainThreadExecutor] Executing query: "${query}" for example: ${exampleId}`);
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
    commonLog(`[PerfMainThreadExecutor] Finished executing all queries for example: ${exampleId}`);
    return allResults;
  }
}

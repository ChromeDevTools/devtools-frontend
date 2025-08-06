// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'path';
import type {ElementHandle, Page} from 'puppeteer-core';

import type {IndividualPromptRequestResponse} from '../../types.d.ts';
import {TraceDownloader} from '../trace-downloader.ts';

import {parseComment, parseFollowUps} from './comment-parsers.ts';

const DEFAULT_FOLLOW_UP_QUERY = 'Fix the issue using JavaScript code execution.';

/**
 * Waits for an element to have a clientHeight greater than the specified height.
 * @param elem The Puppeteer element handle.
 * @param height The minimum height.
 * @param tries The number of tries so far.
 * @returns True if the element reaches the height, false otherwise.
 */
export async function waitForElementToHaveHeight(
    elem: ElementHandle<HTMLElement>, height: number, tries = 5): Promise<boolean> {
  const h = await elem.evaluate(e => e.clientHeight);
  if (h > height) {
    return true;
  }
  if (tries > 10) {
    return false;
  }
  return await new Promise(r => {
    setTimeout(() => r(waitForElementToHaveHeight(elem, height, tries + 1)), 100);
  });
}

/**
 * Executes a single prompt cycle in the AI Assistant.
 * This includes typing the query, handling auto-accept evaluations, and retrieving results.
 * @param devtoolsPage The Puppeteer page object for the DevTools frontend.
 * @param query The query to send to the AI Assistant.
 * @param inputSelector The CSS selector for the prompt input field.
 * @param exampleId The ID of the current example, used for tagging results.
 * @param isMultimodal Whether the current test target is multimodal (e.g., requires a screenshot).
 * @param randomize Whether to add a random suffix.
 * @param commonLog A logging function.
 * @returns A promise that resolves to an array of prompt responses.
 */
export async function executePromptCycle(
    devtoolsPage: Page,
    query: string,
    inputSelector: string,
    exampleId: string,
    isMultimodal: boolean,
    randomize: boolean,
    commonLog: (text: string) => void,
    ): Promise<IndividualPromptRequestResponse[]> {
  commonLog(
      `[Info]: Running the user prompt "${query}" (This step might take a long time)`,
  );

  if (isMultimodal) {
    await devtoolsPage.locator('aria/Take screenshot').click();
  }

  await devtoolsPage.locator(inputSelector).click();
  // Add randomness to bust cache
  const suffix = randomize ? `${(Math.random() * 1000)}`.split('.')[0] : '';
  await devtoolsPage.locator(inputSelector).fill(`${query}${suffix}`);

  const abort = new AbortController();
  const autoAcceptEvals = async (signal: AbortSignal) => {
    while (!signal.aborted) {
      await devtoolsPage.locator('aria/Continue').click({signal});
    }
  };

  const autoAcceptPromise = autoAcceptEvals(abort.signal).catch(err => {
    // Catch errors from the promise itself, though individual errors are caught inside the loop
    if (err instanceof Error && (err.message.includes('Target closed') || err.message.includes('signal'))) {
      return;
    }
    console.error('autoAcceptEvals promise error:', err);
  });

  const done = devtoolsPage.evaluate(() => {
    return new Promise<void>(resolve => {
      window.addEventListener(
          'aiassistancedone',
          () => {
            resolve();
          },
          {
            once: true,
          },
      );
    });
  });

  await devtoolsPage.keyboard.press('Enter');
  await done;
  abort.abort();
  await autoAcceptPromise;  // Ensure the auto-accept loop finishes cleaning up

  const logs = await devtoolsPage.evaluate(() => {
    return localStorage.getItem('aiAssistanceStructuredLog');
  });

  if (!logs) {
    throw new Error('No aiAssistanceStructuredLog entries were found.');
  }
  const results = JSON.parse(logs) as IndividualPromptRequestResponse[];

  return results.map(r => ({...r, exampleId}));
}

/**
 * Retrieves all comment strings from the page and stores comment elements globally.
 * This function evaluates code in the browser context.
 * @param page The Puppeteer page object.
 * @returns A promise that resolves to an array of comment strings.
 */
export async function getCommentStringsFromPage(page: Page): Promise<string[]> {
  const commentStringsFromPage = await page.evaluate(() => {
    function collectComments(root: Node|ShadowRoot):
        Array<{comment: string, commentElement: Comment, targetElement: Element | null}> {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
      const results: Array<{comment: string, commentElement: Comment, targetElement: Element | null}> = [];
      while (walker.nextNode()) {
        const comment = walker.currentNode;
        if (!(comment instanceof Comment)) {
          continue;
        }

        results.push({
          comment: comment.textContent?.trim() ?? '',
          commentElement: comment,
          targetElement: comment.nextElementSibling,
        });
      }
      return results;
    }
    const elementWalker = document.createTreeWalker(
        document.documentElement,
        NodeFilter.SHOW_ELEMENT,
    );
    const results = [...collectComments(document.documentElement)];
    while (elementWalker.nextNode()) {
      const el = elementWalker.currentNode;
      if (el instanceof Element && 'shadowRoot' in el && el.shadowRoot) {
        results.push(...collectComments(el.shadowRoot));
      }
    }
    globalThis.__commentElements = results;
    return results.map(result => result.comment);
  });
  return commentStringsFromPage;
}

/**
 * Loads a performance trace into the Performance panel.
 */
export async function loadPerformanceTrace(
    devtoolsPage: Page,
    traceDownloader: TraceDownloader,
    exampleUrl: string,
    page: Page,
    commonLog: (text: string) => void,
    ): Promise<void> {
  await devtoolsPage.keyboard.press('Escape');
  await devtoolsPage.keyboard.press('Escape');
  commonLog('[Loading performance trace] Ensuring DevTools is in a clean state.');

  await devtoolsPage.locator(':scope >>> #tab-timeline').setTimeout(5000).click();
  commonLog('[Loading performance trace] Opened Performance panel');

  const fileName = await traceDownloader.download(exampleUrl, page);
  commonLog(`[Loading performance trace] Downloaded trace file: ${fileName}`);

  const fileUploader = await devtoolsPage.locator('input[type=file]').waitHandle();
  const tracePath = path.join(TraceDownloader.location, fileName);
  await fileUploader.uploadFile(tracePath);
  commonLog(`[Loading performance trace] Imported ${fileName} to performance panel`);

  const canvas = await devtoolsPage.waitForSelector(':scope >>> canvas.flame-chart-canvas');
  if (!canvas) {
    throw new Error('[Loading performance trace] Could not find flame chart canvas.');
  }
  const canvasVisible = await waitForElementToHaveHeight(canvas, 200);
  if (!canvasVisible) {
    throw new Error('[Loading performance trace] Flame chart canvas did not become visible (height > 200px).');
  }
  commonLog('[Loading performance trace] Flame chart canvas is visible.');
}

/**
 * Extracts comment metadata (queries, explanation, rawComment) from the page.
 */
export async function extractCommentMetadata(
    page: Page,
    includeFollowUp: boolean,
    commonLog: (text: string) => void,
    ): Promise<{queries: string[], explanation: string, rawComment: Record<string, string>}> {
  const commentStrings = await getCommentStringsFromPage(page);
  if (commentStrings.length === 0) {
    throw new Error('[Extracting comment metadata] No comments found on the page.');
  }
  commonLog(`[Extracting comment metadata] Extracted ${commentStrings.length} comment strings.`);

  const comments = commentStrings.map(comment => parseComment(comment));
  const rawComment = comments[0];  // Assuming the first comment is the main one
  if (!rawComment?.prompt) {
    throw new Error('[Extracting comment metadata] Could not parse a valid prompt from the page comments.');
  }
  commonLog(`[Extracting comment metadata] Parsed main comment: ${JSON.stringify(rawComment)}`);

  const queries = [rawComment.prompt];
  const followUpPromptsFromExample = parseFollowUps(rawComment);
  if (includeFollowUp && followUpPromptsFromExample.length === 0) {
    queries.push(DEFAULT_FOLLOW_UP_QUERY);
  } else {
    queries.push(...followUpPromptsFromExample);
  }
  commonLog(`[Extracting comment metadata] Determined queries: ${JSON.stringify(queries)}`);

  return {
    queries,
    explanation: rawComment.explanation || '',
    rawComment,
  };
}

/**
 * Opens the AI Assistance panel via the DevTools menu.
 */
export async function openAiAssistancePanelFromMenu(
    devtoolsPage: Page,
    commonLog: (text: string) => void,
    ): Promise<void> {
  commonLog('Opening AI Assistance panel via menu...');
  await devtoolsPage.locator('aria/Customize and control DevTools').click();
  await devtoolsPage.locator('aria/More tools').click();
  await devtoolsPage.locator('aria/AI assistance').click();
  commonLog('AI Assistance panel opened.');
}

/**
 * Strips comment elements from the page DOM.
 * Relies on globalThis.__commentElements being populated by getCommentStringsFromPage.
 */
export async function stripCommentsFromPage(
    page: Page,
    commonLog: (text: string) => void,
    ): Promise<void> {
  commonLog('Stripping comment elements from the page...');
  await page.evaluate(() => {
    for (const {commentElement} of globalThis.__commentElements ?? []) {
      if (commentElement?.remove) {
        commentElement.remove();
      }
    }
  });
  commonLog('Comment elements stripped.');
}

/**
 * Sets up the Elements panel and inspects a target element.
 * Calls getCommentStringsFromPage to populate globalThis.__commentElements.
 */
export async function setupElementsPanelAndInspect(
    devtoolsPage: Page,
    page: Page,
    commonLog: (text: string) => void,
    ): Promise<void> {
  commonLog('[Setup elements panel] Setting up Elements panel');
  await devtoolsPage.locator(':scope >>> #tab-elements').setTimeout(5000).click();
  commonLog('[Setup elements panel] Opened Elements panel');

  await devtoolsPage.locator('aria/<body>').click();
  commonLog('[Setup elements panel] Clicked body in Elements panel');

  commonLog('[Setup elements panel] Expanding all elements...');
  let expand = await devtoolsPage.$$('pierce/.expand-button');
  while (expand.length) {
    for (const btn of expand) {
      await btn.click();
    }
    await new Promise(resolve => setTimeout(resolve, 100));  // Wait for new buttons to appear
    expand = await devtoolsPage.$$('pierce/.expand-button');
  }
  commonLog('[Setup elements panel] Finished expanding all elements');

  // Ensure __commentElements is populated before trying to inspect
  await getCommentStringsFromPage(page);
  commonLog('[Setup elements panel] Populated globalThis.__commentElements by calling getCommentStringsFromPage.');

  commonLog('[Setup elements panel] Locating console to inspect the element');
  await devtoolsPage.locator(':scope >>> #tab-console').click();
  await devtoolsPage.locator('aria/Console prompt').click();
  await devtoolsPage.keyboard.type(
      'inspect(globalThis.__commentElements[0].targetElement)',
  );
  await devtoolsPage.keyboard.press('Enter');
  commonLog('[Setup elements panel] Typed inspect command in console');

  await devtoolsPage.locator(':scope >>> #tab-elements').click();
  commonLog('[Setup elements panel] Switched back to Elements panel');
}

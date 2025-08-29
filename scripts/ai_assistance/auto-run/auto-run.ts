// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import * as path from 'path';
import type {Browser, Page} from 'puppeteer-core';
import puppeteer from 'puppeteer-core';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';

import type {
  ExampleMetadata, ExecutedExample, IndividualPromptRequestResponse, Logs, RpcGlobalId, RunResult, TestTarget} from
  '../types';

import {createTargetExecutor} from './targets/factory.ts';
import type {TargetExecutor, TargetPreparationResult} from './targets/interface.ts';
import {TraceDownloader} from './trace-downloader.ts';

const startTime = performance.now();
const numberFormatter = new Intl.NumberFormat('en-EN', {
  maximumSignificantDigits: 3,
});
const acquiredDevToolsTargets = new WeakMap();
function formatElapsedTime() {
  return `${numberFormatter.format((performance.now() - startTime) / 1000)}s`;
}

const globalUserArgs =
    yargs(hideBin(process.argv))
        .option('example-urls', {
          string: true,
          type: 'array',
          demandOption: true,
        })
        .option('parallel', {
          boolean: true,
          default: true,
        })
        .option('times', {
          describe: 'How many times do you want to run an example?',
          number: true,
          default: 1,
        })
        .option('label', {string: true, default: 'run'})
        .option('include-follow-up', {
          boolean: true,
          default: false,
        })
        .option('randomize', {
          boolean: true,
          default: false,
        })
        .option('test-target', {
          describe: 'Which panel do you want to run the examples against?',
          choices: ['elements', 'performance-main-thread', 'performance-insights', 'elements-multimodal', 'patching'] as
              const,
          demandOption: true,
        })
        .parseSync();

const exampleUrls: string[] = [];
const OUTPUT_DIR = path.resolve(import.meta.dirname, 'data');

for (const exampleUrl of globalUserArgs.exampleUrls) {
  for (let i = 0; i < globalUserArgs.times; i++) {
    const url = new URL(exampleUrl);
    if (i !== 0) {
      url.searchParams.set('iteration', `${i + 1}`);
    }
    exampleUrls.push(url.toString());
  }
}

class Logger {
  #logs: Logs = {};
  #updateElapsedTimeInterval: NodeJS.Timeout|null = null;

  constructor() {
    this.#updateElapsedTimeInterval = setInterval(() => {
      this.#updateElapsedTime();
    }, 1000);
  }

  #updateElapsedTime() {
    this.#logs['elapsedTime'] = {
      index: 999,
      text: `\nElapsed time: ${formatElapsedTime()}`,
    };
    this.#flushLogs();
  }

  #flushLogs() {
    process.stdout.write('\x1Bc');
    const values = Object.values(this.#logs);
    const sortedValues = values.sort((val1, val2) => val1.index - val2.index);
    for (const {text} of sortedValues) {
      process.stdout.write(`${text}\n`);
    }
  }

  formatError(err: Error): string {
    const stack = typeof err.cause === 'object' && err.cause && 'stack' in err.cause ? err.cause.stack : '';
    return `${err.stack}${err.cause ? `\n${stack}` : ''}`;
  }

  /**
   * Logs a header message to the console.
   * @param text The header text to log.
   */
  head(text: string) {
    this.log('head', -1, `${text}\n`);
  }

  /**
   * @param id
   * @param index
   * @param text
   */
  log(id: string, index: number, text: string) {
    this.#updateElapsedTime();
    this.#logs[id] = {index, text};
    this.#flushLogs();
  }

  error(id: string, index: number, text: string) {
    this.log(id, index, text);
  }

  destroy() {
    if (this.#updateElapsedTimeInterval) {
      clearInterval(this.#updateElapsedTimeInterval);
    }
  }
}

export class Example {
  #url: string;
  #browser: Browser;
  #ready = false;
  #page: Page|null = null;
  #devtoolsPage: Page|null = null;

  #logger: Logger;
  #userArgs: typeof globalUserArgs;
  #executor: TargetExecutor;
  #traceDownloader: TraceDownloader;
  #preparationResult: TargetPreparationResult|null = null;

  constructor(
      url: string, browser: Browser, testTarget: TestTarget, userArgs: typeof globalUserArgs, logger: Logger,
      traceDownloader: TraceDownloader) {
    this.#url = url;
    this.#browser = browser;
    this.#logger = logger;
    this.#userArgs = userArgs;
    this.#traceDownloader = traceDownloader;
    this.#executor = createTargetExecutor(testTarget, this.#traceDownloader);
  }

  url(): string {
    return this.#url;
  }

  id(): string {
    return this.#url.split('/').pop()?.replace('.html', '') ?? 'unknown-id';
  }

  isReady() {
    return this.#ready;
  }

  async prepare() {
    this.log('Creating a page');
    try {
      const page = await this.#browser.newPage();
      this.#page = page;
      await page.goto(this.#url);
      this.log(`Navigated to ${this.#url}`);

      const devtoolsTarget = await this.#browser.waitForTarget(target => {
        const isAcquiredBefore = acquiredDevToolsTargets.has(target);
        return (target.type() === 'other' && target.url().startsWith('devtools://') && !isAcquiredBefore);
      });
      acquiredDevToolsTargets.set(devtoolsTarget, true);

      const devtoolsPage = await devtoolsTarget.asPage();
      this.#devtoolsPage = devtoolsPage;
      this.log('[Info]: Got devtools page');

      // Delegate to executor's prepare
      this.#preparationResult = await this.#executor.prepare(
          this.#url, this.#page, this.#devtoolsPage, (text: string) => this.log(text), this.#userArgs);

      this.#ready = true;
    } catch (err) {
      this.#ready = false;
      const errorMsg = err instanceof Error ? this.#logger.formatError(err) : String(err);
      this.error(`Preparation failed.\n${errorMsg}`);
    }
  }

  async execute(): Promise<ExecutedExample> {
    if (!this.#devtoolsPage) {
      throw new Error('Cannot execute without DevTools page.');
    }
    if (!this.#page) {
      throw new Error('Cannot execute without target page');
    }
    if (!this.#preparationResult) {
      throw new Error('Cannot execute without preparation result. Call prepare() first.');
    }

    const executionStartTime = performance.now();
    try {
      // Delegate to executor's execute
      const results: IndividualPromptRequestResponse[] = await this.#executor.execute(
          this.#devtoolsPage,
          this.#preparationResult,
          this.id(),
          globalUserArgs.randomize,
          (text: string) => this.log(text),
      );

      await this.#page.close();

      /**
       * Because we collect the set of structured logs after each user prompt, that means that we can duplicate responses. E.g. imagine a conversation with:
       *
       * Query A
       * Query B
       * Query C
       *
       * When we log after A, the logs are [A]
       * When we log after B, the logs are [A, B]
       * When we log after C, the logs are [A, B, C]
       * But, what we want is a final log of [A, B, C].
       * More generally, we want to avoid duplicate responses.
       * We could do this by only capturing the log after Query C, but we want
       * to be robust to problems or errors during the process, and in that
       * case we still want to capture as much as we had. So it's safer to
       * capture everything and filter it later.
       * Luckily for us, the "rpcGlobalId" is a reliable way to spot duplicated data.
       */
      const seenRPCIds = new Set<RpcGlobalId>();
      const filteredResults = results.filter(result => {
        if (typeof result.aidaResponse === 'string') {
          return true;
        }
        const id = result.aidaResponse.metadata.rpcGlobalId;
        if (!id) {
          return false;
        }
        if (seenRPCIds.has(id)) {
          return false;
        }
        seenRPCIds.add(id);
        return true;
      });

      return {
        results: filteredResults,
        metadata: {exampleId: this.id(), explanation: this.#preparationResult.explanation},
      };

    } finally {
      const elapsedTime = numberFormatter.format(
          (performance.now() - executionStartTime) / 1000,
      );
      this.log(`Finished (${elapsedTime}s)`);
    }
  }

  log(text: string) {
    const indexOfExample = exampleUrls.indexOf(this.#url);
    this.#logger.log(
        this.id(),
        indexOfExample,
        `\x1b[33m[${indexOfExample + 1}/${exampleUrls.length}] ${this.id()}:\x1b[0m ${text}`,
    );
  }

  error(text: string) {
    const indexOfExample = exampleUrls.indexOf(this.#url);
    this.#logger.error(
        this.id(),
        indexOfExample,
        `\x1b[33m[${indexOfExample + 1}/${exampleUrls.length}] ${this.id()}:[0m [31m${text}[0m`,
    );
  }
}

const logger = new Logger();
async function runInParallel(examples: Example[]): Promise<RunResult> {
  logger.head('Preparing examples...');
  for (const example of examples) {
    await example.prepare();
  }

  logger.head('Running examples...');
  const allExampleResults: IndividualPromptRequestResponse[] = [];
  const metadata: ExampleMetadata[] = [];
  await Promise.all(
      examples.filter(example => example.isReady()).map(async example => {
        try {
          const executedExample = await example.execute();
          allExampleResults.push(...executedExample.results);
          metadata.push(executedExample.metadata);
        } catch (err) {
          const errorMsg = err instanceof Error ? logger.formatError(err) : String(err);
          example.error(
              `There is an error, skipping it.\n${errorMsg}`,
          );
        }
      }),
  );

  return {allExampleResults, metadata};
}

async function runSequentially(examples: Example[]): Promise<RunResult> {
  const allExampleResults: IndividualPromptRequestResponse[] = [];
  const metadata: ExampleMetadata[] = [];
  logger.head('Running examples sequentially...');
  for (const example of examples) {
    await example.prepare();
    if (!example.isReady()) {
      continue;
    }

    try {
      const executedExample = await example.execute();
      allExampleResults.push(...executedExample.results);
      metadata.push(executedExample.metadata);
    } catch (err) {
      const errorMsg = err instanceof Error ? logger.formatError(err) : String(err);
      example.error(
          `There is an error, skipping it.\n${errorMsg}`,
      );
    }
  }

  return {allExampleResults, metadata};
}

async function main() {
  logger.head('Connecting to the browser...');
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
    targetFilter: target => {
      if (target.url().startsWith('chrome-extension://')) {
        return false;
      }
      return true;
    },
  });
  logger.head('Browser connection is ready...');

  logger.head(
      'Getting browser pages... (If stuck in here, please close all the tabs in the connected Chrome manually.)',
  );
  try {
    for (const page of await browser.pages()) {
      if (page.url() === 'about:blank') {
        continue;
      }
      await page.close();
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? logger.formatError(err) : String(err);
    logger.head(
        `There was an error closing pages\n${errorMsg}`,
    );
  }

  logger.head('Preparing examples...');
  const traceDownloader = new TraceDownloader();
  const examples = exampleUrls.map(
      exampleUrl =>
          new Example(exampleUrl, browser, globalUserArgs.testTarget, globalUserArgs, logger, traceDownloader));
  let allExampleResults: IndividualPromptRequestResponse[] = [];
  let metadata: ExampleMetadata[] = [];

  if (globalUserArgs.parallel) {
    ({allExampleResults, metadata} = await runInParallel(examples));
  } else {
    ({allExampleResults, metadata} = await runSequentially(examples));
  }

  await browser.disconnect();

  let score = 0;
  {
    let scoreSum = 0;
    let count = 0;
    for (const example of allExampleResults) {
      if (example.score !== undefined) {
        scoreSum += example.score;
        count++;
      }
    }
    if (count > 0) {
      score = scoreSum / count;
    }
  }

  const output = {
    score,
    metadata,
    examples: allExampleResults,
  };

  const dateSuffix = new Date().toISOString().slice(0, 19);
  const outputPath = path.resolve(
      OUTPUT_DIR,
      `${globalUserArgs.label}-${dateSuffix}.json`,
  );
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.info(
      `\n[Info]: Finished exporting results to ${outputPath}, it took ${formatElapsedTime()}`,
  );
  logger.destroy();
}

void main();

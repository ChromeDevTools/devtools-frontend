// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {execSync} from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type {Browser, Page} from 'puppeteer-core';
import puppeteer from 'puppeteer-core';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';

import {convertRawOutputToEval, formatChatLog, type RawOutput, slug} from '../suite/to_eval_output.ts';
import type {Trajectory} from '../suite/types.js';
import type {ExampleMetadata, ExecutedExample, IndividualPromptRequestResponse, Logs, RpcGlobalId} from '../types.js';

import {
  generateRunId,
  PROJECT_ID,
  TaskOutputFile,
  type TaskStatus,
  uploadEvalToGCS,
  uploadRunCompleted,
  uploadRunLog,
  uploadRunStarted,
  uploadTaskCompleted,
  uploadTaskContent,
} from './gcs-upload.ts';
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

const userArgsBuilder =
    yargs(hideBin(process.argv))
        .option('example-urls', {
          string: true,
          type: 'array',
          demandOption: false,
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
          choices: [
            'elements',
            'performance-main-thread',
            'performance',
            'performance-insights',
            'elements-multimodal',
            'patching',
            'network',
          ] as const,
          demandOption: true,
        })
        .option('eval', {
          describe: 'Output to the format required for the DevTools Eval framework',
          boolean: true,
          default: true,
        })
        .option('grade', {
          describe: 'Automatically grade the result',
          boolean: true,
          default: false,
        })
        .option('upload', {
          describe:
              'Upload resulting eval trajectory.json (and eval_result.json when --grade is specified) files to GCS',
          boolean: true,
          default: false,
        })
        .check(argv => {
          const rawArgs = hideBin(process.argv);
          const hasLabel = rawArgs.includes('--label');
          const hasExampleUrls = argv['example-urls'] && argv['example-urls'].length > 0;
          if (!hasExampleUrls && hasLabel) {
            throw new Error('Cannot provide --label when running without --example-urls');
          }
          return true;
        });
type UserArgs = ReturnType<typeof userArgsBuilder.parseSync>;

const ANSI_YELLOW = '\x1b[33m';
const ANSI_RED = '\x1b[31m';
const ANSI_RESET = '\x1b[0m';

class Logger {
  #terminalLogs: Logs = {};
  #updateElapsedTimeInterval: NodeJS.Timeout|null = null;
  // Suite-level run log entries uploaded per run to GCS as eval_run.log.
  #runLogEntries: string[] = [];
  // Granular per-task agent execution traces keyed by taskId, uploaded per trajectory to GCS as agent_logs/agent.log.
  #taskLogEntries = new Map<string, string[]>();
  // Granular per-task agent stderr traces keyed by taskId, uploaded per trajectory to GCS as agent_logs/agent_stderr.log.
  #taskStderrEntries = new Map<string, string[]>();

  constructor() {
    this.#updateElapsedTimeInterval = setInterval(() => {
      this.#updateElapsedTime();
    }, 1000);
  }

  #stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();
  }

  #recordRunLog(text: string) {
    const cleanText = this.#stripAnsi(text);
    if (!cleanText) {
      return;
    }
    const timestamp = new Date().toISOString();
    for (const line of cleanText.split('\n')) {
      this.#runLogEntries.push(`[${timestamp}] ${line}`);
    }
  }

  #recordTaskLog(taskId: string, text: string, isError = false) {
    const cleanText = this.#stripAnsi(text);
    if (!cleanText) {
      return;
    }
    let entries = this.#taskLogEntries.get(taskId);
    if (!entries) {
      entries = [];
      this.#taskLogEntries.set(taskId, entries);
    }
    const prefix = isError ? '[ERROR] ' : '';
    for (const line of cleanText.split('\n')) {
      entries.push(`${prefix}${line}`);
    }
  }

  #recordTaskStderr(taskId: string, text: string) {
    const cleanText = this.#stripAnsi(text);
    if (!cleanText) {
      return;
    }
    let entries = this.#taskStderrEntries.get(taskId);
    if (!entries) {
      entries = [];
      this.#taskStderrEntries.set(taskId, entries);
    }
    for (const line of cleanText.split('\n')) {
      entries.push(line);
    }
  }

  #updateElapsedTime() {
    this.#terminalLogs['elapsedTime'] = {
      index: 999,
      text: `\nElapsed time: ${formatElapsedTime()}`,
    };
    this.#flushLogs();
  }

  #flushLogs() {
    process.stdout.write('\x1Bc');
    const values = Object.values(this.#terminalLogs);
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
    if (id === 'head') {
      this.#recordRunLog(text);
    }
    this.#updateElapsedTime();
    this.#terminalLogs[id] = {index, text};
    this.#flushLogs();
  }

  error(id: string, index: number, text: string) {
    this.log(id, index, text);
  }

  taskLog(taskId: string, index: number, total: number, text: string) {
    this.#recordTaskLog(taskId, text);
    const indexPrefix = total > 0 ? `[${index + 1}/${total}] ` : '';
    this.log(taskId, index, `${ANSI_YELLOW}${indexPrefix}${taskId}:${ANSI_RESET} ${text}`);
  }

  taskError(taskId: string, index: number, total: number, text: string) {
    this.#recordTaskLog(taskId, text, /* isError= */ true);
    this.#recordTaskStderr(taskId, text);
    const indexPrefix = total > 0 ? `[${index + 1}/${total}] ` : '';
    this.error(taskId, index, `${ANSI_YELLOW}${indexPrefix}${taskId}:${ANSI_RESET} ${ANSI_RED}${text}${ANSI_RESET}`);
  }

  append(text: string) {
    this.#recordRunLog(text);
  }

  /**
   * Execution log for a single run, uploaded once per run to GCS as `eval_run.log`.
   * Example:
   * [2026-09-11T11:45:00.000Z] Evaluation run started for 2026-09-11-114500-c0c1-8f25f69 at 1726055100000
   * [2026-09-11T11:45:00.000Z] Target: elements, Agent: devtools-elements
   * [2026-09-11T11:45:10.000Z] [Task life-with-charlie] Finished execution (10.25s)
   * [2026-09-11T11:45:15.000Z] Total tasks: 1, Passed: 1, Failed: 0
   * [2026-09-11T11:45:15.000Z] Run completed with status: COMPLETED
   */
  getRunLogContent(): string {
    return this.#runLogEntries.join('\n') + '\n';
  }

  getLogContent(): string {
    return this.getRunLogContent();
  }

  /**
   * Returns the formatted log content for a specific task, uploaded per trajectory to GCS
   * as `agent_logs/agent.log`. Captures the task lifecycle including harness setup, executor
   * query execution, completion duration, and error traces.
   *
   * Example output:
   * [2026-09-11T11:45:00.000Z] Creating a page
   * [2026-09-11T11:45:01.000Z] Navigated to http://127.0.0.1:8000/life-with-charlie.html
   * [2026-09-11T11:45:02.000Z] [Info]: Got devtools page
   * [2026-09-11T11:45:03.000Z] [ElementsExecutor] Preparing example: life-with-charlie for target: elements
   * [2026-09-11T11:45:04.000Z] [ElementsExecutor] Executing query: "inspect the image" for example: life-with-charlie
   * [2026-09-11T11:45:05.000Z] [Info]: Running the user prompt "inspect the image" (This step might take a long time)
   * [2026-09-11T11:45:10.000Z] [ElementsExecutor] Finished executing all queries for example: life-with-charlie
   * [2026-09-11T11:45:10.000Z] Finished (10.25s)
   */
  getTaskLogContent(taskId: string): string {
    const entries = this.#taskLogEntries.get(taskId);
    if (!entries || entries.length === 0) {
      return '(No log entries recorded)\n';
    }
    return entries.join('\n') + '\n';
  }

  /**
   * Returns the formatted stderr content for a specific task, uploaded per trajectory to GCS
   * as `agent_logs/agent_stderr.log`. Captures errors, assertion failures, and stack traces.
   * Returns an empty string if no errors occurred.
   */
  getTaskStderrContent(taskId: string): string {
    const entries = this.#taskStderrEntries.get(taskId);
    if (!entries || entries.length === 0) {
      return '';
    }
    return entries.join('\n') + '\n';
  }

  destroy() {
    if (this.#updateElapsedTimeInterval) {
      clearInterval(this.#updateElapsedTimeInterval);
    }
  }
}

export class Example {
  #url: string;
  #label: string;
  #browser: Browser;
  #ready = false;
  #page: Page|null = null;
  #devtoolsPage: Page|null = null;

  #logger: Logger;
  #userArgs: UserArgs;
  #executor: TargetExecutor;
  #traceDownloader: TraceDownloader;
  #preparationResult: TargetPreparationResult|null = null;
  #exampleUrls: readonly string[];
  #durationSeconds = 0;

  constructor(
      url: string, label: string, browser: Browser, userArgs: UserArgs, logger: Logger,
      traceDownloader: TraceDownloader, exampleUrls: readonly string[]) {
    this.#url = url;
    this.#label = label;
    this.#browser = browser;
    this.#logger = logger;
    this.#userArgs = userArgs;
    this.#traceDownloader = traceDownloader;
    this.#executor = createTargetExecutor(userArgs.testTarget, this.#traceDownloader);
    this.#exampleUrls = exampleUrls;
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
        return (target.type() === 'other' && target.url().includes('devtools_app.html') && !isAcquiredBefore);
      });
      acquiredDevToolsTargets.set(devtoolsTarget, true);

      const devtoolsPage = await devtoolsTarget.asPage();
      this.#devtoolsPage = devtoolsPage;
      this.log('[Info]: Got devtools page');

      await devtoolsPage.evaluate(() => {
        localStorage.setItem('aiAssistanceStructuredLogEnabled', 'true');
      });

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

  async execute(): Promise<ExecutedExample&{label: string}> {
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
          this.#userArgs.randomize,
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
        metadata: {session_id: this.id(), explanation: this.#preparationResult.explanation},
        label: this.#label,
      };

    } finally {
      // Record task execution duration in seconds, rounded to two decimal places, for reporting in eval_task_completed.json.
      this.#durationSeconds = Number(((performance.now() - executionStartTime) / 1000).toFixed(2));
      const elapsedTime = numberFormatter.format(this.#durationSeconds);
      this.log(`Finished (${elapsedTime}s)`);
    }
  }

  durationSeconds(): number {
    return this.#durationSeconds;
  }

  log(text: string) {
    const indexOfExample = this.#exampleUrls.indexOf(this.#url);
    this.#logger.taskLog(this.id(), indexOfExample, this.#exampleUrls.length, text);
  }

  error(text: string) {
    const indexOfExample = this.#exampleUrls.indexOf(this.#url);
    this.#logger.taskError(this.id(), indexOfExample, this.#exampleUrls.length, text);
  }
}

function recordTaskFailure(
    taskId: string,
    runId: string,
    durationSeconds: number,
    taskStatuses: TaskStatus[],
) {
  uploadTaskCompleted({
    taskId,
    runId,
    status: 'FAILED',
    // Failed tasks receive 0.0 as they encountered an error or timeout prior to completing.
    score: 0.0,
    durationSeconds,
    tokens: {},
  });
  taskStatuses.push({taskId, status: 'FAILED', score: 0.0});
}

function handleTaskFailure(
    example: Example,
    runId: string,
    phase: 'Preparation'|'Execution',
    logger: Logger,
    taskStatuses: TaskStatus[],
    taskDurations: Map<string, number>,
    userArgs: UserArgs,
) {
  const durationSeconds = example.durationSeconds();
  taskDurations.set(example.id(), durationSeconds);
  logger.append(`[Task ${example.id()}] ${phase} failed (${durationSeconds}s)`);
  if (userArgs.upload) {
    const taskId = example.id();
    uploadTaskContent(runId, taskId, TaskOutputFile.AGENT_LOG, logger.getTaskLogContent(taskId));
    uploadTaskContent(runId, taskId, TaskOutputFile.AGENT_STDERR, logger.getTaskStderrContent(taskId));
    recordTaskFailure(taskId, runId, durationSeconds, taskStatuses);
  }
}

async function runInParallel(
    examples: Example[],
    logger: Logger,
    userArgs: UserArgs,
    runId: string,
    taskStatuses: TaskStatus[],
    taskDurations: Map<string, number>,
    ): Promise<Array<{results: IndividualPromptRequestResponse[], metadata: ExampleMetadata, label: string}>> {
  logger.head('Preparing examples...');
  for (const example of examples) {
    await example.prepare();
    if (!example.isReady()) {
      handleTaskFailure(example, runId, 'Preparation', logger, taskStatuses, taskDurations, userArgs);
    }
  }

  logger.head('Running examples...');
  const results: Array<{results: IndividualPromptRequestResponse[], metadata: ExampleMetadata, label: string}> = [];
  await Promise.all(
      examples.filter(example => example.isReady()).map(async example => {
        try {
          const executedExample = await example.execute();
          const durationSeconds = example.durationSeconds();
          taskDurations.set(example.id(), durationSeconds);
          logger.append(`[Task ${example.id()}] Finished execution (${durationSeconds}s)`);
          results.push(executedExample);
        } catch (err) {
          const errorMsg = err instanceof Error ? logger.formatError(err) : String(err);
          example.error(
              `There is an error, skipping it.\n${errorMsg}`,
          );
          handleTaskFailure(example, runId, 'Execution', logger, taskStatuses, taskDurations, userArgs);
        }
      }),
  );

  return results;
}

async function runSequentially(
    examples: Example[],
    logger: Logger,
    userArgs: UserArgs,
    runId: string,
    taskStatuses: TaskStatus[],
    taskDurations: Map<string, number>,
    ): Promise<Array<{results: IndividualPromptRequestResponse[], metadata: ExampleMetadata, label: string}>> {
  const results: Array<{results: IndividualPromptRequestResponse[], metadata: ExampleMetadata, label: string}> = [];
  logger.head('Running examples sequentially...');
  for (const example of examples) {
    await example.prepare();
    if (!example.isReady()) {
      handleTaskFailure(example, runId, 'Preparation', logger, taskStatuses, taskDurations, userArgs);
      continue;
    }

    try {
      const executedExample = await example.execute();
      const durationSeconds = example.durationSeconds();
      taskDurations.set(example.id(), durationSeconds);
      logger.append(`[Task ${example.id()}] Finished execution (${durationSeconds}s)`);
      results.push(executedExample);
    } catch (err) {
      const errorMsg = err instanceof Error ? logger.formatError(err) : String(err);
      example.error(`There is an error, skipping it.\n${errorMsg}`);
      handleTaskFailure(example, runId, 'Execution', logger, taskStatuses, taskDurations, userArgs);
    }
  }

  return results;
}

function loadRecipes(target: string): Array<{url: string, label: string}> {
  const recipesPath = path.resolve(import.meta.dirname, 'recipes.json');
  if (!fs.existsSync(recipesPath)) {
    throw new Error(`recipes.json not found at ${recipesPath}`);
  }
  const recipesData = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
  const targetRecipes = recipesData[target];
  if (!targetRecipes) {
    throw new Error(`No recipes found for target ${target} in recipes.json`);
  }
  return targetRecipes;
}

// Run if this file invoked as a CLI directly
async function main() {
  const userArgs: UserArgs = userArgsBuilder.parseSync();
  if (userArgs.grade) {
    const graderScript = path.resolve(import.meta.dirname, '..', 'suite', `${userArgs.testTarget}.eval.ts`);
    if (!fs.existsSync(graderScript)) {
      throw new Error(`Grader script not found at ${graderScript}. Cannot run with --grade.`);
    }
  }

  const runId = generateRunId();
  const runStartTimestamp = new Date().toISOString();
  console.info(`\n[Info]: Run ID for this evaluation: ${runId}`);

  if (userArgs.upload) {
    uploadRunStarted({
      project: PROJECT_ID,
      runId,
      agent: `devtools-${userArgs.testTarget}`,
      // TODO: Figure out if the model ID can be determined prior to execution. Currently,
      // the exact model ID is resolved server-side by AIDA and only available in the response metadata per task.
      model: 'default',
      startTime: runStartTimestamp,
      status: 'RUNNING',
    });
  }

  const pairsToRun: Array<{url: string, label: string}> = [];
  const isRecipeMode = !userArgs.exampleUrls || userArgs.exampleUrls.length === 0;

  if (isRecipeMode) {
    const recipes = loadRecipes(userArgs.testTarget);
    for (const recipe of recipes) {
      for (let i = 0; i < userArgs.times; i++) {
        const url = new URL(recipe.url);
        if (i !== 0) {
          url.searchParams.set('iteration', `${i + 1}`);
        }
        pairsToRun.push({url: url.toString(), label: recipe.label});
      }
    }
  } else if (userArgs.exampleUrls) {
    for (const exampleUrl of userArgs.exampleUrls) {
      for (let i = 0; i < userArgs.times; i++) {
        const url = new URL(exampleUrl);
        if (i !== 0) {
          url.searchParams.set('iteration', `${i + 1}`);
        }
        pairsToRun.push({url: url.toString(), label: userArgs.label});
      }
    }
  }

  const logger = new Logger();
  logger.append(`Evaluation run started for ${runId} at ${runStartTimestamp}`);
  logger.append(`Target: ${userArgs.testTarget}, Agent: devtools-${userArgs.testTarget}`);
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
      'Getting browser pages... (If stuck in here, please close all the tabs in the connected Chrome manually.)');
  try {
    for (const page of await browser.pages()) {
      if (page.url() === 'about:blank') {
        continue;
      }
      await page.close();
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? logger.formatError(err) : String(err);
    logger.head(`There was an error closing pages\n${errorMsg}`);
  }

  logger.head('Preparing examples...');
  const traceDownloader = new TraceDownloader();

  const allUrls = pairsToRun.map(p => p.url);
  const examples =
      pairsToRun.map(pair => new Example(pair.url, pair.label, browser, userArgs, logger, traceDownloader, allUrls));

  const taskStatuses: TaskStatus[] = [];
  const taskDurations = new Map<string, number>();

  const executionResults = userArgs.parallel ?
      await runInParallel(examples, logger, userArgs, runId, taskStatuses, taskDurations) :
      await runSequentially(examples, logger, userArgs, runId, taskStatuses, taskDurations);

  await browser.disconnect();

  // Group results by label
  const groupedResults = new Map<string, {results: IndividualPromptRequestResponse[], metadata: ExampleMetadata[]}>();
  for (const res of executionResults) {
    let group = groupedResults.get(res.label);
    if (!group) {
      group = {results: [], metadata: []};
      groupedResults.set(res.label, group);
    }
    group.results.push(...res.results);
    group.metadata.push(res.metadata);
  }

  // Write output for each group
  for (const [label, data] of groupedResults) {
    const output = {
      metadata: data.metadata,
      trajectories: data.results,
    };
    writeOutput({
      output,
      userArgs: {...userArgs, label},
      runId,
      taskStatuses,
      taskDurations,
      logger,
    });
  }

  let graderFailed = false;
  // Run grader once at the end if --grade is set
  if (userArgs.grade) {
    const target = userArgs.testTarget;
    const graderScript = path.resolve(import.meta.dirname, '..', 'suite', `${target}.eval.ts`);
    if (fs.existsSync(graderScript)) {
      const graderMsg = `Running grader ${graderScript} at the end`;
      console.info(`\n[Info]: ${graderMsg}`);
      logger.append(graderMsg);
      try {
        const cwd = path.resolve(import.meta.dirname, '..');
        const cmd = `node suite/${target}.eval.ts`;
        const cmdMsg = `Running command: ${cmd} in ${cwd}`;
        console.info(`\n[Info]: ${cmdMsg}`);
        logger.append(cmdMsg);
        const stdout = execSync(cmd, {cwd, encoding: 'utf8'});
        console.info(stdout);
        logger.append(stdout);

        if (userArgs.upload) {
          const evalResultPath = path.resolve(import.meta.dirname, 'data', `eval_result-${runId}.json`);
          fs.writeFileSync(evalResultPath,
                           JSON.stringify({
                             runId,
                             target,
                             gradingOutput: stdout,
                           },
                                          null, 2));

          const allTaskIds = new Set(executionResults.map(r => r.metadata.session_id));
          for (const taskId of allTaskIds) {
            uploadEvalToGCS({
              runId,
              taskId,
              localJsonPath: evalResultPath,
              destinationFileName: TaskOutputFile.EVAL_RESULT,
            });
            uploadTaskContent(runId, taskId, TaskOutputFile.GRADER_LOG, stdout);
            const durationSeconds = taskDurations.get(taskId) ?? 0.0;
            // TODO: Parse grader output to report individual task pass/fail status and scores instead of defaulting to 1.0.
            uploadTaskCompleted({
              taskId,
              runId,
              status: 'PASSED',
              score: 1.0,
              durationSeconds,
              tokens: {},
            });
            taskStatuses.push({taskId, status: 'PASSED', score: 1.0});
          }
        }
      } catch (error) {
        graderFailed = true;
        const errorMsg = error instanceof Error ? (error.stack ?? error.message) : String(error);
        const errorMessage = `[Error]: Grader failed: ${errorMsg}`;
        console.error(`\n${errorMessage}`);
        logger.append(errorMessage);
        if (userArgs.upload) {
          const allTaskIds = new Set(executionResults.map(r => r.metadata.session_id));
          for (const taskId of allTaskIds) {
            uploadTaskContent(runId, taskId, TaskOutputFile.GRADER_LOG, errorMessage);
            const durationSeconds = taskDurations.get(taskId) ?? 0.0;
            recordTaskFailure(taskId, runId, durationSeconds, taskStatuses);
          }
        }
      }
    } else {
      graderFailed = true;
      const notFoundMessage = `[Error]: Grader script ${graderScript} not found.`;
      console.error(`\n${notFoundMessage}`);
      logger.append(notFoundMessage);
      if (userArgs.upload) {
        const allTaskIds = new Set(executionResults.map(r => r.metadata.session_id));
        for (const taskId of allTaskIds) {
          uploadTaskContent(runId, taskId, TaskOutputFile.GRADER_LOG, notFoundMessage);
          const durationSeconds = taskDurations.get(taskId) ?? 0.0;
          recordTaskFailure(taskId, runId, durationSeconds, taskStatuses);
        }
      }
    }
  }

  if (userArgs.upload) {
    const totalTasks = taskStatuses.length;
    const failedTasks = taskStatuses.filter(t => t.status === 'FAILED').length;
    const passedTasks = totalTasks - failedTasks;
    const runStatus = (graderFailed || failedTasks > 0 || totalTasks === 0) ? 'FAILED' : 'COMPLETED';

    logger.append(`Total tasks: ${totalTasks}, Passed: ${passedTasks}, Failed: ${failedTasks}`);
    logger.append(`Run completed with status: ${runStatus}`);

    uploadRunLog(runId, logger.getLogContent());
    uploadRunCompleted({
      project: PROJECT_ID,
      runId,
      status: runStatus,
      startTime: runStartTimestamp,
      endTime: new Date().toISOString(),
      totalTasks,
      passedTasks,
      failedTasks,
    });
  }

  logger.destroy();
}

/**
 * Identifies a single auto-run example, i.e. one "task".
 *
 * The very same value is stored as `session_id` on the raw
 * {@link IndividualPromptRequestResponse} results and as `auto_run_example_id`
 * on the converted {@link Trajectory} metadata, and it is the key that every
 * per-task GCS artifact and every {@link TaskStatus} is recorded under.
 *
 * Not to be confused with `Trajectory['metadata']['session_id']`, which is a
 * synthetic `<input-hash>-<index>` identifier minted by
 * `convertRawOutputToEval` and only used to name the exported `.eval.json`
 * file.
 */
type TaskId = string;

/** Run-wide state shared by every per-task step. */
interface EvalRunContext {
  output: {metadata: ExampleMetadata[], trajectories: IndividualPromptRequestResponse[]};
  trajectoriesByTaskId: Map<TaskId, IndividualPromptRequestResponse[]>;
  userArgs: UserArgs;
  runId: string;
  outputDir: string;
  gradeTargetDir?: string;
  taskStatuses: TaskStatus[];
  taskDurations: Map<TaskId, number>;
  logger: Logger;
}

/** The parts of {@link EvalRunContext} supplied by the caller; the rest is derived. */
type WriteOutputOptions = Omit<EvalRunContext, 'outputDir'|'gradeTargetDir'|'trajectoriesByTaskId'>;

/**
 * Persists the results of one `--label` group.
 *
 * This is the last step of a run: it is called once per label group after every
 * task has finished and the browser has been disconnected, and just before the
 * optional `--grade` pass, which picks the exported trajectories back up from
 * disk.
 *
 * Per trajectory it always writes the eval output locally, and additionally
 * uploads the per-task artifacts and records the task completion when
 * `--upload` is set.
 */
function writeOutput(options: WriteOutputOptions) {
  const {output, userArgs} = options;

  const outputDir = path.resolve(import.meta.dirname, 'data');
  fs.mkdirSync(outputDir, {recursive: true});

  if (output.metadata.length === 0 && output.trajectories.length === 0) {
    console.info('\n[Warn]: No results to export.');
    return;
  }

  const trajectories = convertRawOutputToEval({
    inputFromAutoRun: output as RawOutput,
    label: userArgs.label,
  });

  // When grading, the eval outputs are additionally collected in a dated,
  // per-test-target folder that the grader reads from.
  let gradeTargetDir: string|undefined;
  if (userArgs.grade) {
    const runDate = new Date().toISOString().slice(0, 10);
    gradeTargetDir =
        path.resolve(import.meta.dirname, '..', 'suite', 'outputs', 'outputs', userArgs.testTarget, runDate);
    fs.mkdirSync(gradeTargetDir, {recursive: true});
  }

  const trajectoriesByTaskId = Map.groupBy(output.trajectories, e => e.session_id);
  const ctx: EvalRunContext = {...options, outputDir, gradeTargetDir, trajectoriesByTaskId};

  for (const trajectory of trajectories) {
    const evalOutputPath = exportEvalTrajectory(ctx, trajectory);

    if (!userArgs.upload) {
      continue;
    }

    const allUploadsSucceeded = uploadTaskArtifacts(ctx, trajectory, evalOutputPath);
    if (!userArgs.grade) {
      recordTaskCompletion(ctx, trajectory.metadata.auto_run_example_id, allUploadsSucceeded);
    }
  }
}

/**
 * Writes the eval trajectory to the local output directory and, when grading is
 * enabled, copies it into the dated grading folder. Returns the path of the
 * canonical local copy.
 */
function exportEvalTrajectory(ctx: EvalRunContext, trajectory: Trajectory): string {
  const fileName = `${slug(ctx.userArgs.label)}-${trajectory.metadata.session_id}`;
  const evalOutputPath = path.resolve(ctx.outputDir, `${fileName}.eval.json`);
  fs.writeFileSync(evalOutputPath, JSON.stringify(trajectory, null, 2));
  console.info(`\n[Info]: Exported eval output to ${evalOutputPath}`);

  if (ctx.gradeTargetDir) {
    const copiedFilePath = path.resolve(ctx.gradeTargetDir, `${fileName}.json`);
    fs.copyFileSync(evalOutputPath, copiedFilePath);
    console.info(`\n[Info]: Copied eval output to ${copiedFilePath}`);
  }

  return evalOutputPath;
}

/**
 * Uploads every per-task artifact to GCS. Returns true only if all of them
 * were uploaded successfully.
 */
function uploadTaskArtifacts(ctx: EvalRunContext, trajectory: Trajectory, evalOutputPath: string): boolean {
  const {runId, logger} = ctx;
  const taskId: TaskId = trajectory.metadata.auto_run_example_id;

  const trajectoryUploaded = uploadEvalToGCS({
    runId,
    taskId,
    localJsonPath: evalOutputPath,
    destinationFileName: TaskOutputFile.TRAJECTORY,
  });
  const agentLogUploaded = uploadTaskContent(runId, taskId, TaskOutputFile.AGENT_LOG, logger.getTaskLogContent(taskId));
  const chatLogUploaded = uploadTaskContent(runId, taskId, TaskOutputFile.CHAT_LOG, formatChatLog(trajectory));
  const agentStderrUploaded =
      uploadTaskContent(runId, taskId, TaskOutputFile.AGENT_STDERR, logger.getTaskStderrContent(taskId));
  const verificationStdoutUploaded =
      uploadTaskContent(runId, taskId, TaskOutputFile.VERIFICATION_STDOUT, formatVerificationStdout(ctx, taskId));
  const verificationStderrUploaded =
      uploadTaskContent(runId, taskId, TaskOutputFile.VERIFICATION_STDERR, formatVerificationStderr(ctx, taskId));

  return trajectoryUploaded && agentLogUploaded && chatLogUploaded && agentStderrUploaded &&
      verificationStdoutUploaded && verificationStderrUploaded;
}

/**
 * Summarises the outcome of a task's verification step for the
 * verification_stdout.log artifact.
 */
function formatVerificationStdout(ctx: EvalRunContext, taskId: TaskId): string {
  const matchingTrajectories = ctx.trajectoriesByTaskId.get(taskId) ?? [];
  const hasError = matchingTrajectories.some(e => Boolean(e.error) ||
                                                 Boolean(e.assertionFailures && e.assertionFailures.length > 0));

  return [
    `[Verification] Task: ${taskId}`,
    `[Verification] Target: ${ctx.userArgs.testTarget}`,
    `[Verification] Result: ${hasError ? 'FAILED' : 'PASSED'}`,
    '',
  ].join('\n');
}

/**
 * Collects the errors and assertion failures of a task for the
 * verification_stderr.log artifact. Returns an empty string when the
 * task did not fail.
 */
function formatVerificationStderr(ctx: EvalRunContext, taskId: TaskId): string {
  const matchingTrajectories = ctx.trajectoriesByTaskId.get(taskId) ?? [];
  const errorLines = matchingTrajectories.flatMap(
      e => [...(e.error ? [`[Error]: ${e.error}`] : []),
            ...(e.assertionFailures ?? []).map(failure => `[AssertionFailure]: ${failure}`),
  ]);

  return errorLines.length > 0 ? `${errorLines.join('\n')}\n` : '';
}

/**
 * Derives the task score and status and reports the completion both to GCS and
 * to the in-memory run summary.
 */
function recordTaskCompletion(ctx: EvalRunContext, taskId: TaskId, allUploadsSucceeded: boolean): void {
  const {runId, taskDurations, taskStatuses, trajectoriesByTaskId} = ctx;
  // Raw results carry the auto-run example id in their `session_id` field.
  const matchingTrajectories = trajectoriesByTaskId.get(taskId) ?? [];
  const hasError = matchingTrajectories.some(e => Boolean(e.error) ||
                                                 Boolean(e.assertionFailures && e.assertionFailures.length > 0));

  // TODO: Parse grader output or evaluation assertions to report individual task scores instead of defaulting to 1.0.
  const baseScore = matchingTrajectories.find(e => e.score !== undefined)?.score ?? (hasError ? 0.0 : 1.0);
  const score = allUploadsSucceeded ? baseScore : 0.0;
  // Status indicates execution outcome (PASSED if prompt turns completed and uploaded without error,
  // FAILED if upload failed, assertion failures occurred, or score is 0.0).
  const status = (!allUploadsSucceeded || hasError || score <= 0.0) ? 'FAILED' : 'PASSED';
  const durationSeconds = taskDurations.get(taskId) ?? 0.0;

  uploadTaskCompleted({
    taskId,
    runId,
    status,
    score,
    durationSeconds,
    tokens: {},
  });
  taskStatuses.push({taskId, status, score});
}

// If run directly, invoke the CLI
if (import.meta.main) {
  void main();
}

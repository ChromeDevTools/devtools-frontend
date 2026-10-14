// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as Mocha from 'mocha';
import * as fs from 'node:fs';
import type * as puppeteer from 'puppeteer-core';

import type * as AiAssistance from '../../front_end/panels/ai_assistance/ai_assistance.js';
import {TestConfig} from '../conductor/test_config.js';
import {type E2EState, StateProvider, type SuiteSettings} from '../e2e/conductor/state-provider.js';
import {type BrowserSettings, type BrowserWrapper, Launcher} from '../e2e/shared/BrowserWrapper.js';
import type {DevToolsPage} from '../e2e/shared/DevToolsPage.js';
import {InspectedPage} from '../e2e/shared/InspectedPage.js';

import {getDefaultOtaAccount} from './helpers/eval-environment.js';
import {EvalLogger} from './report/eval-logger.js';
import {finalizeEvalTask, handleTaskFailure} from './report/eval-task-recorder.js';
import {
  evaluateTrajectory,
  formatStoreResults,
  type ItEval,
  printResults,
  ResultStore,
} from './report/evaluators.js';
import {
  generateRunId,
  PROJECT_ID,
  type TaskStatus,
  uploadRunCompleted,
  uploadRunLog,
  uploadRunStarted,
} from './report/gcs-upload.js';
import {createTempEvalDir, type Step, TrajectoryBuilder} from './report/trajectory-builder.js';

export type AiAssistanceContext = NonNullable<AiAssistance.ExternalHandler.ExternalAIRequestOptions['context']>;

// Eval target type used when a test's evalConfig does not set `type`.
const DEFAULT_EVAL_TYPE = 'eval';
// Agent name reported in run_started.json when a run contains eval tests of several types.
const MIXED_TARGETS_AGENT = 'devtools-ai-evals';

export interface AiEvalConfig {
  type?: string;
  label: string;
  taskId: string;
  evals?: ItEval[];
}

export interface ExecutePromptOptions {
  context?: AiAssistanceContext;
  prompts: string[];
}

export class EvalTaskHandle {
  readonly type: string;
  readonly taskId: string;
  readonly label: string;
  readonly evals: ItEval[];
  readonly isConfigured: boolean;
  readonly startTime: number = performance.now();
  readonly trajectoryBuilder: TrajectoryBuilder;
  readonly #devToolsPage: DevToolsPage;
  readonly #logger: EvalLogger;
  hasFailed = false;
  failureError?: string;

  constructor(config: AiEvalConfig, devToolsPage: DevToolsPage, logger: EvalLogger, isConfigured = true) {
    this.type = config.type ?? DEFAULT_EVAL_TYPE;
    this.taskId = config.taskId;
    this.label = config.label;
    this.evals = [...(config.evals ?? [])];
    this.isConfigured = isConfigured;
    this.trajectoryBuilder = new TrajectoryBuilder({taskId: this.taskId});
    this.#devToolsPage = devToolsPage;
    this.#logger = logger;
  }

  itEval(config: ItEval): void {
    this.evals.push(config);
  }

  async executePrompt(options: ExecutePromptOptions): Promise<Step[]> {
    this.#logger.taskLog(this.taskId, `Executing prompt: ${JSON.stringify(options.prompts)}`);
    const steps = (await this.#devToolsPage.evaluate(async (opts: ExecutePromptOptions) => {
                    const path = './panels/ai_assistance/ai_assistance.js';
                    const AiAssistance = await import(path);
                    return await AiAssistance.ExternalHandler.handleExternalAIRequest(opts);
                  }, options)) as Step[];
    assert.isNotEmpty(steps, 'Expected non-empty interaction steps from handleExternalAIRequest.');
    this.trajectoryBuilder.addSteps(steps);
    return steps;
  }
}

export interface AiEvalState extends E2EState {
  evalTask: EvalTaskHandle;
}

/**
 * Settings that AI eval suites can register via `setup()`.
 */
export type AiEvalSuiteSettings = SuiteSettings&{evalConfig?: AiEvalConfig};

export class AiEvalStateProvider extends StateProvider {
  static override instance: AiEvalStateProvider = new AiEvalStateProvider();
  #suiteToEvalConfig = new WeakMap<Mocha.Suite, AiEvalConfig>();
  #runId = '';
  #runStartTimestamp = '';
  #tempOutputDir = '';
  #logger = new EvalLogger();
  #taskStatuses: TaskStatus[] = [];
  #taskToolCallCounts = new Map<string, number>();
  #resultStores: ResultStore[] = [];
  // Target types of all registered eval tests. Suites are registered while the test files
  // are loaded, i.e. before `startEvalRun` is called from the global setup.
  #evalTypes = new Set<string>();

  override registerSuiteSettings(suite: Mocha.Suite, suiteSettings: AiEvalSuiteSettings): void {
    super.registerSuiteSettings(suite, suiteSettings);
    if (suiteSettings.evalConfig) {
      this.#suiteToEvalConfig.set(suite, suiteSettings.evalConfig);
      this.#evalTypes.add(suiteSettings.evalConfig.type ?? DEFAULT_EVAL_TYPE);
    }
  }

  startEvalRun(): void {
    this.#runId = generateRunId();
    this.#runStartTimestamp = new Date().toISOString();
    this.#tempOutputDir = createTempEvalDir();
    this.#logger = new EvalLogger();
    this.#taskStatuses = [];
    this.#taskToolCallCounts = new Map();
    this.#resultStores = [];
    const targets = [...this.#evalTypes];
    const agent = targets.length === 1 ? `devtools-${targets[0]}` : MIXED_TARGETS_AGENT;
    this.#logger.append(`Evaluation run started for ${this.#runId} at ${this.#runStartTimestamp}`);
    this.#logger.append(`Target: ${targets.join(', ')}, Agent: ${agent}`);
    uploadRunStarted({
      project: PROJECT_ID,
      runId: this.#runId,
      agent,
      model: 'default',
      startTime: this.#runStartTimestamp,
      status: 'RUNNING',
    });
    this.#logger.head('Running examples sequentially...');
  }

  finishEvalRun(): void {
    if (!this.#runId) {
      return;
    }
    const totalTasks = this.#taskStatuses.length;
    const failedTasks = this.#taskStatuses.filter(t => t.status === 'FAILED').length;
    const passedTasks = totalTasks - failedTasks;
    const totalToolCalls = Array.from(this.#taskToolCallCounts.values()).reduce((sum, count) => sum + count, 0);
    const status = (failedTasks > 0 || totalTasks === 0) ? 'FAILED' : 'COMPLETED';
    this.#logger.append(`Total tasks: ${totalTasks}, Passed: ${passedTasks}, Failed: ${failedTasks}`);
    this.#logger.append(`Run completed with status: ${status}`);
    uploadRunLog(this.#runId, this.#logger.getRunLogContent());
    uploadRunCompleted({
      project: PROJECT_ID,
      runId: this.#runId,
      status,
      startTime: this.#runStartTimestamp,
      endTime: new Date().toISOString(),
      totalTasks,
      passedTasks,
      failedTasks,
      metrics: {
        totalToolCalls,
      },
    });
    if (this.#tempOutputDir && fs.existsSync(this.#tempOutputDir)) {
      fs.rmSync(this.#tempOutputDir, {recursive: true, force: true});
    }
    this.#logger.info(`\nElapsed time: ${this.#logger.formatElapsedTime()}`);
  }

  override async launchBrowser(settings: BrowserSettings): Promise<BrowserWrapper> {
    return await Launcher.browserSetup({
      ...settings,
      chromeUsername: TestConfig.otaUsername ?? getDefaultOtaAccount(),
      chromePassword: TestConfig.otaPassword,
    },
                                       StateProvider.serverPort);
  }

  override async browsingContext(browser: BrowserWrapper): Promise<puppeteer.BrowserContext> {
    return browser.browser.defaultBrowserContext();
  }

  override async setupInspectedPage(context: puppeteer.BrowserContext, serverPort: number): Promise<InspectedPage> {
    const page = await context.newPage();
    return new InspectedPage(page, serverPort);
  }

  #resolveEvalConfig(suite: Mocha.Suite): AiEvalConfig|undefined {
    for (let currentSuite: Mocha.Suite|undefined = suite; currentSuite; currentSuite = currentSuite.parent) {
      const evalConfig = this.#suiteToEvalConfig.get(currentSuite);
      if (evalConfig) {
        return evalConfig;
      }
    }
    return undefined;
  }

  #recordPreparationFailure(evalConfig: AiEvalConfig, startTime: number, error: unknown): void {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    const errorMessage = this.#logger.formatError(normalizedError);
    this.#logger.taskError(evalConfig.taskId, errorMessage);
    handleTaskFailure({
      runId: this.#runId,
      taskId: evalConfig.taskId,
      target: evalConfig.type ?? DEFAULT_EVAL_TYPE,
      phase: 'Preparation',
      durationSeconds: Number(((performance.now() - startTime) / 1000).toFixed(2)),
      logger: this.#logger,
      taskStatuses: this.#taskStatuses,
      errorMessage,
    });
  }

  override async prepareSuite(suite: Mocha.Suite): Promise<void> {
    const startTime = performance.now();
    try {
      await super.prepareSuite(suite);
    } catch (error) {
      const evalConfig = this.#resolveEvalConfig(suite);
      if (evalConfig) {
        this.#recordPreparationFailure(evalConfig, startTime, error);
      }
      throw error;
    }
  }

  override async createState(suite: Mocha.Suite): Promise<AiEvalState> {
    const startTime = performance.now();
    const evalConfig = this.#resolveEvalConfig(suite);
    let baseState: E2EState;
    try {
      baseState = await super.createState(suite);
    } catch (error) {
      if (evalConfig) {
        this.#recordPreparationFailure(evalConfig, startTime, error);
      }
      throw error;
    }
    const evalTask = new EvalTaskHandle(
        evalConfig ?? {label: suite.title, taskId: suite.title},
        baseState.devToolsPage,
        this.#logger,
        Boolean(evalConfig),
    );
    if (evalConfig) {
      this.#logger.taskLog(evalConfig.taskId, `Prepared task ${evalConfig.taskId}`);
    }
    return {...baseState, evalTask};
  }

  override async onTestError(state: E2EState|undefined, error: Error): Promise<Error> {
    const evalTask = (state as AiEvalState | undefined)?.evalTask;
    if (evalTask?.isConfigured) {
      evalTask.hasFailed = true;
      evalTask.failureError = this.#logger.formatError(error);
      this.#logger.taskError(evalTask.taskId, evalTask.failureError);
    }
    return await super.onTestError(state, error);
  }

  override async cleanupState(state: E2EState): Promise<void> {
    const evalTask = (state as Partial<AiEvalState>).evalTask;
    try {
      if (evalTask?.isConfigured) {
        const durationSeconds = Number(((performance.now() - evalTask.startTime) / 1000).toFixed(2));
        if (evalTask.hasFailed && !evalTask.trajectoryBuilder.hasSteps()) {
          handleTaskFailure({
            runId: this.#runId,
            taskId: evalTask.taskId,
            target: evalTask.type,
            phase: 'Execution',
            durationSeconds,
            logger: this.#logger,
            taskStatuses: this.#taskStatuses,
            errorMessage: evalTask.failureError,
          });
        } else {
          try {
            const trajectory = evalTask.trajectoryBuilder.build();
            let customScore: number|null = null;
            let gradingOutput: string|undefined;

            if (!evalTask.hasFailed && evalTask.evals.length > 0) {
              const store = new ResultStore(evalTask.type, evalTask.label);
              const dateFolder = (this.#runStartTimestamp || new Date().toISOString()).slice(0, 10);
              customScore = await evaluateTrajectory(trajectory, evalTask.evals, store, dateFolder);
              if (store.results.size > 0) {
                this.#resultStores.push(store);
                printResults(store);
                gradingOutput = formatStoreResults(store);
                this.#logger.append(gradingOutput);
              }
            }

            finalizeEvalTask({
              runId: this.#runId,
              taskId: evalTask.taskId,
              label: evalTask.label,
              target: evalTask.type,
              trajectory,
              outputDir: this.#tempOutputDir,
              durationSeconds,
              logger: this.#logger,
              taskStatuses: this.#taskStatuses,
              taskToolCallCounts: this.#taskToolCallCounts,
              hasError: evalTask.hasFailed,
              errorMessage: evalTask.failureError,
              customScore,
              gradingOutput,
            });
          } catch (err) {
            const errorMessage = this.#logger.formatError(err as Error);
            this.#logger.taskError(evalTask.taskId, errorMessage);
            handleTaskFailure({
              runId: this.#runId,
              taskId: evalTask.taskId,
              target: evalTask.type,
              phase: 'Finalization',
              durationSeconds,
              logger: this.#logger,
              taskStatuses: this.#taskStatuses,
              errorMessage,
              toolCallCount: this.#taskToolCallCounts.get(evalTask.taskId),
            });
          }
        }
      }
    } finally {
      try {
        if (state.inspectedPage) {
          await state.inspectedPage.page.close().catch(() => {});
        }
      } catch {
        // Ignore cleanup error for default browser context.
      }
    }
  }
}

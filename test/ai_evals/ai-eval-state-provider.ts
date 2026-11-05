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
  type RunOutcomeStatus,
  type TaskStatus,
  uploadRunCompleted,
  uploadRunLog,
  uploadRunStarted,
} from './report/gcs-upload.js';
import {aggregateRunMetrics, buildRunTags} from './report/report-helpers.js';
import {
  createTempEvalDir,
  type Step,
  type ToolCallStats,
  type Trajectory,
  TrajectoryBuilder,
} from './report/trajectory-builder.js';

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
  readonly trajectoryBuilder: TrajectoryBuilder;
  readonly #devToolsPage: DevToolsPage;
  readonly #logger: EvalLogger;
  // Total time spent executing prompts, reported as the task duration.
  #executionSeconds = 0;
  lastPromptEndTime = 0;
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

  /**
   * Time spent in `executePrompt` in seconds, rounded to two decimal places.
   */
  get durationSeconds(): number {
    return Number(this.#executionSeconds.toFixed(2));
  }

  /**
   * Records a line in the task log (`agent_logs/agent.log`).
   */
  log(text: string): void {
    this.#logger.taskLog(this.taskId, text);
  }

  async executePrompt(options: ExecutePromptOptions): Promise<Step[]> {
    for (const prompt of options.prompts) {
      this.log(`Executing query: "${prompt}" for task: ${this.taskId}`);
      this.log(`[Info]: Running the user prompt "${prompt}" (This step might take a long time)`);
    }
    const executionStartTime = performance.now();
    try {
      const steps = (await this.#devToolsPage.evaluate(async (opts: ExecutePromptOptions) => {
                      const path = './panels/ai_assistance/ai_assistance.js';
                      const AiAssistance = await import(path);
                      return await AiAssistance.ExternalHandler.handleExternalAIRequest(opts);
                    }, options)) as Step[];
      assert.isNotEmpty(steps, 'Expected non-empty interaction steps from handleExternalAIRequest.');
      this.trajectoryBuilder.addSteps(steps);
      return steps;
    } finally {
      const endTime = performance.now();
      const executionSeconds = (endTime - executionStartTime) / 1000;
      this.#executionSeconds += executionSeconds;
      this.lastPromptEndTime = endTime;
      this.log(`Finished (${executionSeconds.toFixed(2)}s)`);
    }
  }
}

export interface AiEvalState extends E2EState {
  evalTask: EvalTaskHandle;
}

interface TaskGradingResult {
  customScore: number|null;
  gradingOutput?: string;
  gradingDurationSeconds: number;
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
  #taskToolCallStats = new Map<string, ToolCallStats>();
  #resolvedModel: string|null = null;
  #resultStores: ResultStore[] = [];
  // Target types of all registered eval tests. Suites are registered while the test files
  // are loaded, i.e. before `startEvalRun` is called from the global setup.
  #evalTypes = new Set<string>();
  #navigationListeners = new WeakMap<puppeteer.Page, (frame: puppeteer.Frame) => void>();

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
    this.#taskToolCallStats = new Map();
    this.#resolvedModel = null;
    this.#resultStores = [];
    const targets = [...this.#evalTypes];
    const agent = targets.length === 1 ? `devtools-${targets[0]}` : MIXED_TARGETS_AGENT;
    this.#logger.append(`Evaluation run started for ${this.#runId} at ${this.#runStartTimestamp}`);
    this.#logger.append(`Target: ${targets.join(', ')}, Agent: ${agent}`);
    uploadRunStarted({
      project: PROJECT_ID,
      runId: this.#runId,
      agent,
      startTime: this.#runStartTimestamp,
      status: 'RUNNING',
      tags: buildRunTags(targets),
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
    const status: RunOutcomeStatus = (failedTasks > 0 || totalTasks === 0) ? 'FAILED' : 'COMPLETED';
    this.#logger.append(`Total tasks: ${totalTasks}, Passed: ${passedTasks}, Failed: ${failedTasks}`);
    this.#logger.append(`Run completed with status: ${status}`);
    uploadRunLog(this.#runId, this.#logger.getRunLogContent());
    uploadRunCompleted({
      project: PROJECT_ID,
      runId: this.#runId,
      status,
      startTime: this.#runStartTimestamp,
      endTime: new Date().toISOString(),
      model: this.#resolvedModel ?? 'unknown',
      tags: buildRunTags(this.#evalTypes),
      totalTasks,
      passedTasks,
      failedTasks,
      metrics: aggregateRunMetrics(this.#taskToolCallStats.values()),
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
    await page.bringToFront();
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

  #recordPreparationFailure(evalConfig: AiEvalConfig, error: unknown): void {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    const errorMessage = this.#logger.formatError(normalizedError);
    this.#logger.taskError(evalConfig.taskId, `Preparation failed.\n${errorMessage}`);
    handleTaskFailure({
      runId: this.#runId,
      taskId: evalConfig.taskId,
      target: evalConfig.type ?? DEFAULT_EVAL_TYPE,
      phase: 'Preparation',
      // No prompt was executed yet.
      durationSeconds: 0,
      logger: this.#logger,
      taskStatuses: this.#taskStatuses,
      toolCallStats: {
        total: 0,
        byTool: {},
        failedByTool: {},
        activationsBySkill: {},
      },
      errorMessage,
    });
  }

  override async prepareSuite(suite: Mocha.Suite): Promise<void> {
    try {
      await super.prepareSuite(suite);
    } catch (error) {
      const evalConfig = this.#resolveEvalConfig(suite);
      if (evalConfig) {
        this.#recordPreparationFailure(evalConfig, error);
      }
      throw error;
    }
  }

  override async createState(suite: Mocha.Suite): Promise<AiEvalState> {
    const evalConfig = this.#resolveEvalConfig(suite);
    let baseState: E2EState;
    try {
      baseState = await super.createState(suite);
      await baseState.inspectedPage.bringToFront();
    } catch (error) {
      if (evalConfig) {
        this.#recordPreparationFailure(evalConfig, error);
      }
      throw error;
    }
    const evalTask = new EvalTaskHandle(
        evalConfig ?? {label: suite.title, taskId: suite.title},
        baseState.devToolsPage,
        this.#logger,
        Boolean(evalConfig),
    );
    if (evalTask.isConfigured) {
      evalTask.log(`Prepared task ${evalTask.taskId}`);
      const onFrameNavigated = (frame: puppeteer.Frame): void => {
        if (frame === baseState.inspectedPage.page.mainFrame() && frame.url() !== 'about:blank') {
          evalTask.log(`Navigated to ${frame.url()}`);
        }
      };
      this.#navigationListeners.set(baseState.inspectedPage.page, onFrameNavigated);
      baseState.inspectedPage.page.on('framenavigated', onFrameNavigated);
    }
    return {...baseState, evalTask};
  }

  override async onTestError(state: E2EState|undefined, error: Error): Promise<Error> {
    const evalTask = (state as AiEvalState | undefined)?.evalTask;
    if (evalTask?.isConfigured) {
      evalTask.hasFailed = true;
      evalTask.failureError = this.#logger.formatError(error);
      this.#logger.taskError(evalTask.taskId, `There is an error, skipping it.\n${evalTask.failureError}`);
    }
    return await super.onTestError(state, error);
  }

  async #gradeTaskTrajectory(evalTask: EvalTaskHandle, trajectory: Trajectory): Promise<TaskGradingResult> {
    if (evalTask.hasFailed || evalTask.evals.length === 0) {
      return {customScore: null, gradingDurationSeconds: 0};
    }
    const gradingStart = performance.now();
    const store = new ResultStore(evalTask.type, evalTask.label);
    const dateFolder = (this.#runStartTimestamp || new Date().toISOString()).slice(0, 10);
    const customScore = await evaluateTrajectory(trajectory, evalTask.evals, store, dateFolder);
    const gradingDurationSeconds = Number(((performance.now() - gradingStart) / 1000).toFixed(3));
    let gradingOutput: string|undefined;
    if (store.results.size > 0) {
      this.#resultStores.push(store);
      printResults(store);
      gradingOutput = formatStoreResults(store);
      this.#logger.append(gradingOutput);
    }
    return {customScore, gradingOutput, gradingDurationSeconds};
  }

  async #finalizeConfiguredTask(evalTask: EvalTaskHandle): Promise<void> {
    const durationSeconds = evalTask.durationSeconds;
    if (evalTask.hasFailed && !evalTask.trajectoryBuilder.hasSteps()) {
      handleTaskFailure({
        runId: this.#runId,
        taskId: evalTask.taskId,
        target: evalTask.type,
        phase: 'Execution',
        durationSeconds,
        logger: this.#logger,
        taskStatuses: this.#taskStatuses,
        toolCallStats: {
          total: 0,
          byTool: {},
          failedByTool: {},
          activationsBySkill: {},
        },
        errorMessage: evalTask.failureError,
      });
      return;
    }

    const verificationDurationSeconds = Number(((performance.now() - evalTask.lastPromptEndTime) / 1000).toFixed(3));
    try {
      const trajectory = evalTask.trajectoryBuilder.build();
      if (trajectory.metadata.model) {
        this.#resolvedModel = trajectory.metadata.model;
      }
      const {customScore, gradingOutput, gradingDurationSeconds} =
          await this.#gradeTaskTrajectory(evalTask, trajectory);
      finalizeEvalTask({
        runId: this.#runId,
        taskId: evalTask.taskId,
        label: evalTask.label,
        target: evalTask.type,
        trajectory,
        outputDir: this.#tempOutputDir,
        durationSeconds,
        verificationDurationSeconds,
        logger: this.#logger,
        taskStatuses: this.#taskStatuses,
        taskToolCallStats: this.#taskToolCallStats,
        hasError: evalTask.hasFailed,
        errorMessage: evalTask.failureError,
        customScore,
        gradingOutput,
        gradingDurationSeconds,
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
        toolCallStats: this.#taskToolCallStats.get(evalTask.taskId) ?? {
          total: 0,
          byTool: {},
          failedByTool: {},
          activationsBySkill: {},
        },
        errorMessage,
      });
    }
  }

  override async cleanupState(state: E2EState): Promise<void> {
    const evalTask = (state as Partial<AiEvalState>).evalTask;
    try {
      if (evalTask?.isConfigured) {
        await this.#finalizeConfiguredTask(evalTask);
      }
    } finally {
      try {
        if (state.devToolsPage) {
          await state.devToolsPage.page.close().catch(() => {});
        }
        if (state.inspectedPage) {
          const onFrameNavigated = this.#navigationListeners.get(state.inspectedPage.page);
          if (onFrameNavigated) {
            state.inspectedPage.page.off('framenavigated', onFrameNavigated);
            this.#navigationListeners.delete(state.inspectedPage.page);
          }
          await state.inspectedPage.page.close().catch(() => {});
        }
      } catch {
        // Ignore cleanup error for default browser context.
      }
    }
  }
}

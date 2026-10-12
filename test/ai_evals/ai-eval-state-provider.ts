// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as Mocha from 'mocha';
import * as fs from 'node:fs';
import type * as puppeteer from 'puppeteer-core';

import type * as AiAssistance from '../../front_end/panels/ai_assistance/ai_assistance.js';
import {TestConfig} from '../conductor/test_config.js';
import {type E2EState, StateProvider} from '../e2e/conductor/state-provider.js';
import {type BrowserSettings, type BrowserWrapper, Launcher} from '../e2e/shared/BrowserWrapper.js';
import type {DevToolsPage} from '../e2e/shared/DevToolsPage.js';
import {InspectedPage} from '../e2e/shared/InspectedPage.js';

import {EvalLogger} from './report/eval-logger.js';
import {finalizeEvalTask, handleTaskFailure} from './report/eval-task-recorder.js';
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

export interface AiEvalConfig {
  label: string;
  taskId: string;
}

export interface ExecutePromptOptions {
  context?: AiAssistanceContext;
  prompts: string[];
}

export class EvalTaskHandle {
  readonly taskId: string;
  readonly label: string;
  readonly isConfigured: boolean;
  readonly startTime: number = performance.now();
  readonly trajectoryBuilder: TrajectoryBuilder;
  readonly #devToolsPage: DevToolsPage;
  readonly #logger: EvalLogger;
  hasFailed = false;
  failureError?: string;

  constructor(config: AiEvalConfig, devToolsPage: DevToolsPage, logger: EvalLogger, isConfigured = true) {
    this.taskId = config.taskId;
    this.label = config.label;
    this.isConfigured = isConfigured;
    this.trajectoryBuilder = new TrajectoryBuilder({autoRunExampleId: this.taskId});
    this.#devToolsPage = devToolsPage;
    this.#logger = logger;
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

declare global {
  namespace Mocha {
    interface HookFunction {
      (fn: E2E.SuiteSettings&{evalConfig?: AiEvalConfig}): void;
    }
  }
  namespace E2E {
    interface State {
      evalTask: EvalTaskHandle;
    }
  }
}

export class AiEvalStateProvider extends StateProvider {
  static override instance: AiEvalStateProvider = new AiEvalStateProvider();
  #suiteToEvalConfig = new WeakMap<Mocha.Suite, AiEvalConfig>();
  #runId = '';
  #runStartTimestamp = '';
  #tempOutputDir = '';
  #logger = new EvalLogger();
  #taskStatuses: TaskStatus[] = [];

  override registerSuiteSettings(suite: Mocha.Suite,
                                 suiteSettings: E2E.SuiteSettings&{evalConfig?: AiEvalConfig}): void {
    super.registerSuiteSettings(suite, suiteSettings);
    if (suiteSettings.evalConfig) {
      this.#suiteToEvalConfig.set(suite, suiteSettings.evalConfig);
    }
  }

  startEvalRun(): void {
    this.#runId = generateRunId();
    this.#runStartTimestamp = new Date().toISOString();
    this.#tempOutputDir = createTempEvalDir();
    this.#logger = new EvalLogger();
    this.#taskStatuses = [];
    this.#logger.append(`Evaluation run started for ${this.#runId} at ${this.#runStartTimestamp}`);
    uploadRunStarted({
      project: PROJECT_ID,
      runId: this.#runId,
      agent: 'devtools-ai-evals',
      model: 'default',
      startTime: this.#runStartTimestamp,
      status: 'RUNNING',
    });
  }

  finishEvalRun(): void {
    if (!this.#runId) {
      return;
    }
    const totalTasks = this.#taskStatuses.length;
    const failedTasks = this.#taskStatuses.filter(t => t.status === 'FAILED').length;
    const passedTasks = totalTasks - failedTasks;
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
    });
    if (this.#tempOutputDir && fs.existsSync(this.#tempOutputDir)) {
      fs.rmSync(this.#tempOutputDir, {recursive: true, force: true});
    }
  }

  override async launchBrowser(settings: BrowserSettings): Promise<BrowserWrapper> {
    return await Launcher.browserSetup({...settings, chromeUsername: TestConfig.otaUsername}, StateProvider.serverPort);
  }

  override async browsingContext(browser: BrowserWrapper): Promise<puppeteer.BrowserContext> {
    return browser.browser.defaultBrowserContext();
  }

  override async setupInspectedPage(context: puppeteer.BrowserContext, serverPort: number): Promise<InspectedPage> {
    const page = await context.newPage();
    return new InspectedPage(page, serverPort);
  }

  override async createState(suite: Mocha.Suite): Promise<AiEvalState> {
    const baseState = await super.createState(suite);
    let evalConfig: AiEvalConfig|undefined;
    for (let currentSuite: Mocha.Suite|undefined = suite; currentSuite; currentSuite = currentSuite.parent) {
      evalConfig = this.#suiteToEvalConfig.get(currentSuite);
      if (evalConfig) {
        break;
      }
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
            label: evalTask.label,
            phase: 'Execution',
            durationSeconds,
            logger: this.#logger,
            taskStatuses: this.#taskStatuses,
            errorMessage: evalTask.failureError,
          });
        } else {
          try {
            finalizeEvalTask({
              runId: this.#runId,
              taskId: evalTask.taskId,
              label: evalTask.label,
              trajectory: evalTask.trajectoryBuilder.build(),
              outputDir: this.#tempOutputDir,
              durationSeconds,
              logger: this.#logger,
              taskStatuses: this.#taskStatuses,
              hasError: evalTask.hasFailed,
              errorMessage: evalTask.failureError,
            });
          } catch (err) {
            const errorMessage = this.#logger.formatError(err as Error);
            this.#logger.taskError(evalTask.taskId, errorMessage);
            handleTaskFailure({
              runId: this.#runId,
              taskId: evalTask.taskId,
              label: evalTask.label,
              phase: 'Finalization',
              durationSeconds,
              logger: this.#logger,
              taskStatuses: this.#taskStatuses,
              errorMessage,
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

// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type * as AiAssistance from '../../../front_end/panels/ai_assistance/ai_assistance.js';
import {
  clearTextFilter,
  openNetworkTab,
  selectRequestByName,
  setTextFilter,
} from '../../e2e/helpers/network-helpers.js';
import type {DevToolsPage} from '../../e2e/shared/DevToolsPage.js';

import {BASE_APPS_DIR, EVALS_DIR, formatMissingDependenciesMessage} from './eval-environment.js';

export const TASK_TEXTPROTO = 'task.textproto';

export type AiAssistanceContext = NonNullable<AiAssistance.ExternalHandler.ExternalAIRequestOptions['context']>;

export type AppFlavor = 'express'|'vue'|'next';

export interface EvalTaskConfig {
  /** The folder name of the base app inside `eval_data/base-apps/`. */
  baseApp: string;
  /** The initial URL to navigate to for the evaluation. */
  initialUrl?: string;
}

export interface RunningEvalApp {
  process: childProcess.ChildProcess;
  config: EvalTaskConfig;
  getOutput: () => string;
  waitForOutput: (pattern: RegExp|string, timeoutMs?: number) => Promise<string>;
}

/**
 * Parses the `base_app` and optional `initial_url` fields from a `task.textproto` file.
 */
export function parseTaskTextproto(content: string): EvalTaskConfig {
  const baseAppMatch = content.match(/^\s*base_app:\s*"([^"]+)"/m);
  if (!baseAppMatch) {
    throw new Error(`Missing \`base_app\` field in ${TASK_TEXTPROTO}`);
  }
  const baseApp = baseAppMatch[1];

  const initialUrlMatch = content.match(/^\s*initial_url:\s*["']([^"']+)["']/m);
  const initialUrl = initialUrlMatch ? initialUrlMatch[1] : undefined;

  return {
    baseApp,
    initialUrl,
  };
}

/**
 * Waits for a process's output to match a given pattern using stream events.
 * Throws if the process exits prematurely or if the timeout is exceeded.
 */
export function waitForProcessOutput(
    child: childProcess.ChildProcess,
    getOutput: () => string,
    pattern: RegExp|string,
    timeoutMs = 30_000,
    ): Promise<string> {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  const currentOutput = getOutput();
  if (regex.test(currentOutput)) {
    return Promise.resolve(currentOutput);
  }
  if (child.exitCode !== null) {
    return Promise.reject(
        new Error(`Process exited prematurely with code ${child.exitCode}.\nOutput:\n${currentOutput}`));
  }

  return new Promise((resolve, reject) => {
    let timer: NodeJS.Timeout|undefined;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      child.stdout?.off('data', onData);
      child.stderr?.off('data', onData);
      child.off('exit', onExit);
    };

    const onData = () => {
      const output = getOutput();
      if (regex.test(output)) {
        cleanup();
        resolve(output);
      }
    };

    const onExit = (code: number|null) => {
      cleanup();
      reject(new Error(`Process exited prematurely with code ${code}.\nOutput:\n${getOutput()}`));
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out after ${timeoutMs}ms waiting for console output matching ${regex}.\nOutput so far:\n${
          getOutput()}`));
    }, timeoutMs);

    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.once('exit', onExit);
  });
}

/**
 * Stops a spawned process group by sending SIGTERM, with a fallback to SIGKILL.
 */
export async function stopProcess(child?: childProcess.ChildProcess): Promise<void> {
  if (!child?.pid || child.exitCode !== null) {
    return;
  }

  const killPid = (signal: NodeJS.Signals) => {
    try {
      // Negative PID terminates the node server process group directly
      // (without an intermediate shell wrapper), ensuring the server and any
      // child processes it spawns are terminated.
      process.kill(-child.pid!, signal);
    } catch {
      // Process or process group already exited.
    }
  };

  killPid('SIGTERM');

  await new Promise<void>(resolve => {
    const timer = setTimeout(() => {
      killPid('SIGKILL');
      resolve();
    }, 2000);

    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * Stops a running eval app and its child process group.
 */
export async function stopEvalApp(app: RunningEvalApp): Promise<void> {
  await stopProcess(app.process);
}

/**
 * Locates the eval folder under `test/ai_evals/eval_data/evals/` (either directly at
 * `<evalId>` or nested under `<evalFolder>/<evalId>`), parses its `task.textproto`
 * for `base_app`, starts the pre-built app with `node server.js`, and waits until
 * the server confirms it is listening on `localhost`.
 */
export async function setupAndRunEvalApp(
    evalFolder: string,
    evalId: string,
    flavor: AppFlavor = 'next',
    ): Promise<RunningEvalApp> {
  const nestedProtoPath = path.join(EVALS_DIR, evalFolder, evalId, TASK_TEXTPROTO);
  const flatProtoPath = path.join(EVALS_DIR, evalId, TASK_TEXTPROTO);
  const taskProtoPath = fs.existsSync(nestedProtoPath) ? nestedProtoPath : flatProtoPath;

  if (!fs.existsSync(taskProtoPath)) {
    throw new Error(`${TASK_TEXTPROTO} not found at: ${nestedProtoPath}\n\n${formatMissingDependenciesMessage()}`);
  }

  const content = fs.readFileSync(taskProtoPath, 'utf-8');
  const config = parseTaskTextproto(content);

  const baseAppRoot = path.join(BASE_APPS_DIR, config.baseApp);
  const flavoredAppDir = path.join(baseAppRoot, flavor);
  const appDir = fs.existsSync(flavoredAppDir) ? flavoredAppDir : baseAppRoot;
  if (!fs.existsSync(appDir)) {
    throw new Error(`Base app directory not found at: ${appDir}\n\n${formatMissingDependenciesMessage()}`);
  }

  const isVerbose = Boolean(process.env.DEBUG || process.env.VERBOSE);

  const serverProcess = childProcess.spawn('node', ['server.js'], {
    cwd: appDir,
    stdio: ['inherit', 'pipe', 'pipe'],
    detached: true,
    env: process.env,
  });

  let output = '';
  serverProcess.stdout?.on('data', (chunk: Buffer) => {
    output += chunk.toString();
    if (isVerbose) {
      process.stdout.write(chunk);
    }
  });
  serverProcess.stderr?.on('data', (chunk: Buffer) => {
    output += chunk.toString();
    if (isVerbose) {
      process.stderr.write(chunk);
    }
  });

  const getOutput = (): string => output;

  try {
    await waitForProcessOutput(serverProcess, getOutput, /localhost:\d+/i);
  } catch (error) {
    await stopProcess(serverProcess);
    throw error;
  }

  return {
    process: serverProcess,
    config,
    getOutput,
    waitForOutput: (pattern, timeoutMs) => waitForProcessOutput(serverProcess, getOutput, pattern, timeoutMs),
  };
}

/**
 * Filters the Network log and selects the specified request.
 * Filtering is required because the grid is virtualized: off-screen requests
 * are not in the DOM and cannot be selected by name alone.
 */
export async function selectNetworkRequest(
    devToolsPage: DevToolsPage,
    requestName: string,
    ): Promise<void> {
  await openNetworkTab(devToolsPage);
  await clearTextFilter(devToolsPage);
  await setTextFilter(devToolsPage, requestName);
  await selectRequestByName(devToolsPage, requestName);
}

/**
 * Finds and selects the specified context in DevTools so that it is set
 * as the active flavor (e.g. in UI.Context.Context) for AI evaluation.
 */
export async function findAndSetContext(
    devToolsPage: DevToolsPage,
    context: AiAssistanceContext,
    ): Promise<void> {
  switch (context.type) {
    case 'NETWORK_REQUEST': {
      await selectNetworkRequest(devToolsPage, context.contextIdentifier);
      break;
    }
    default: {
      const unsupportedType: never = context.type;
      throw new Error(`Unsupported context type: ${unsupportedType}`);
    }
  }
}

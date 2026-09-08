// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type * as AiAssistance from '../../../front_end/panels/ai_assistance/ai_assistance.js';
import {openNetworkTab, selectRequestByName} from '../../e2e/helpers/network-helpers.js';
import type {DevToolsPage} from '../../e2e/shared/frontend-helper.js';

import {BASE_APPS_DIR, EVALS_DIR, formatMissingDependenciesMessage} from './eval-environment.js';

export const TASK_TEXTPROTO = 'task.textproto';

export type AiAssistanceContext = NonNullable<AiAssistance.ExternalHandler.ExternalAIRequestOptions['context']>;

export interface EvalTaskConfig {
  /** The folder name of the base app inside `eval_data/base-apps/`. */
  baseApp: string;
  /**
   * The ordered sequence of shell commands to set up and run the app
   * (e.g. `["npm install", "npm run dev"]`). Commands are executed sequentially
   * one by one in order, and the final command starts the application server.
   */
  taskEntryPoint: string[];
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
 * Parses the `base_app`, `task_entry_point`, and optional `initial_url` fields from a `task.textproto` file.
 */
export function parseTaskTextproto(content: string): EvalTaskConfig {
  const baseAppMatch = content.match(/^\s*base_app:\s*"([^"]+)"/m);
  if (!baseAppMatch) {
    throw new Error(`Missing \`base_app\` field in ${TASK_TEXTPROTO}`);
  }
  const baseApp = baseAppMatch[1];

  // Matches the bracketed list of quoted command strings, e.g.:
  // task_entry_point: ["npm install", "npm run dev"]
  const taskEntryPointMatch = content.match(/^\s*task_entry_point:\s*\[([^\]]*)\]/m);
  if (!taskEntryPointMatch) {
    throw new Error(`Missing \`task_entry_point\` field in ${TASK_TEXTPROTO}`);
  }

  const taskEntryPoint = [...taskEntryPointMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
  if (taskEntryPoint.length === 0) {
    throw new Error(`Missing or empty \`task_entry_point\` field in ${TASK_TEXTPROTO}`);
  }

  const initialUrlMatch = content.match(/^\s*initial_url:\s*["']([^"']+)["']/m);
  const initialUrl = initialUrlMatch ? initialUrlMatch[1] : undefined;

  return {
    baseApp,
    taskEntryPoint,
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
      // Negative PID sends the signal to the entire process group, ensuring
      // child processes (shell, npm, node server) are terminated, not just
      // the parent shell wrapper.
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
 * Locates the eval folder under `test/ai_evals/eval_data/evals/<evalFolder>/<evalId>`,
 * parses its `task.textproto` for `base_app` and `task_entry_point`, and runs the
 * build/start commands inside `test/ai_evals/eval_data/base-apps/<base_app>`.
 */
export async function setupAndRunEvalApp(
    evalFolder: string,
    evalId: string,
    ): Promise<RunningEvalApp> {
  const evalDir = path.join(EVALS_DIR, evalFolder, evalId);
  const taskProtoPath = path.join(evalDir, TASK_TEXTPROTO);

  if (!fs.existsSync(taskProtoPath)) {
    throw new Error(`${TASK_TEXTPROTO} not found at: ${taskProtoPath}\n\n${formatMissingDependenciesMessage()}`);
  }

  const content = fs.readFileSync(taskProtoPath, 'utf-8');
  const config = parseTaskTextproto(content);

  const appDir = path.join(BASE_APPS_DIR, config.baseApp);
  if (!fs.existsSync(appDir)) {
    throw new Error(`Base app directory not found at: ${appDir}\n\n${formatMissingDependenciesMessage()}`);
  }

  let serverProcess: childProcess.ChildProcess|undefined;

  const appEnv = {...process.env};
  appEnv.npm_config_omit = '';
  appEnv.npm_config_include = 'optional';
  appEnv.npm_config_ignore_scripts = 'false';
  appEnv.CHOKIDAR_USEPOLLING = '1';

  const isVerbose = Boolean(process.env.DEBUG || process.env.VERBOSE);

  for (let i = 0; i < config.taskEntryPoint.length; i++) {
    const cmd = config.taskEntryPoint[i];
    const isLast = i === config.taskEntryPoint.length - 1;

    if (!isLast) {
      // Skip npm install if node_modules is already present to avoid 10-15s overhead per test.
      const isInstallCmd = cmd.trim().startsWith('npm install') || cmd.trim().startsWith('npm i');
      if (isInstallCmd && fs.existsSync(path.join(appDir, 'node_modules'))) {
        continue;
      }
      childProcess.execSync(cmd, {
        cwd: appDir,
        stdio: isVerbose ? 'inherit' : 'pipe',
        env: appEnv,
        timeout: 120_000,
      });
    } else {
      serverProcess = childProcess.spawn(cmd, {
        cwd: appDir,
        shell: true,
        stdio: ['inherit', 'pipe', 'pipe'],
        detached: true,
        env: appEnv,
      });
    }
  }

  if (!serverProcess) {
    throw new Error('No command was executed to start the app.');
  }

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

  return {
    process: serverProcess,
    config,
    getOutput,
    waitForOutput: (pattern, timeoutMs) => waitForProcessOutput(serverProcess!, getOutput, pattern, timeoutMs),
  };
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
      await openNetworkTab(devToolsPage);
      await selectRequestByName(devToolsPage, context.contextIdentifier);
      break;
    }
    default: {
      const unsupportedType: never = context.type;
      throw new Error(`Unsupported context type: ${unsupportedType}`);
    }
  }
}

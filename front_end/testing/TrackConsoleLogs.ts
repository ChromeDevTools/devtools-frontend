// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {after, before} from 'mocha';

export interface ExpectedConsoleLogs {
  warn?: string[];
  log?: string[];
  error?: string[];
}

const expectedLogsStack: ExpectedConsoleLogs[] = [];

/** This needs to be invoked within a describe block, rather than within an it() block. **/
export function expectConsoleLogs(expectedLogs: ExpectedConsoleLogs): void {
  before(() => {
    expectedLogsStack.push(expectedLogs);
  });
  after(() => {
    const idx = expectedLogsStack.lastIndexOf(expectedLogs);
    if (idx !== -1) {
      expectedLogsStack.splice(idx, 1);
    }
  });
}

type ConsoleLogLevel = 'log'|'warn'|'error';

interface UnexpectedConsoleLog {
  level: 'error'|'warn';
  message: string;
  stack: string;
}

export type ConsoleLike = Pick<Console, 'log'|'warn'|'error'>;

export interface ConsoleLogTracker {
  startTracking(): void;
  stopTracking(): void;
  checkForUnexpectedLogs(testName?: string): void;
}

function safeFormatArg(arg: unknown): string {
  if (arg === null || arg === undefined) {
    return '';
  }
  try {
    return String(arg);
  } catch {
    return Object.prototype.toString.call(arg);
  }
}

function safeJoinArgs(data: unknown[]): string {
  return data.map(safeFormatArg).join(' ');
}

function getStack(error: Error): string {
  return (error.stack ?? 'No stack').split('\n').slice(2).join('\n');
}

export function createConsoleLogTracker(targetConsole: ConsoleLike = console): ConsoleLogTracker {
  const originals = {
    log: targetConsole.log,
    warn: targetConsole.warn,
    error: targetConsole.error,
  };
  const unexpectedLogs: UnexpectedConsoleLog[] = [];

  function isExpected(level: ConsoleLogLevel, joined: string): boolean {
    return expectedLogsStack.some(entry => entry[level]?.includes(joined));
  }

  function startTracking(): void {
    unexpectedLogs.length = 0;
    targetConsole.log = (...data: unknown[]) => {
      if (isExpected('log', safeJoinArgs(data))) {
        return;
      }
      originals.log.apply(targetConsole, data);
    };
    for (const level of ['warn', 'error'] as const) {
      targetConsole[level] = (...data: unknown[]) => {
        const message = safeJoinArgs(data);
        if (isExpected(level, message)) {
          return;
        }
        unexpectedLogs.push({
          level,
          message,
          stack: getStack(new Error()),
        });
        originals[level].apply(targetConsole, data);
      };
    }
  }

  function stopTracking(): void {
    unexpectedLogs.length = 0;
    targetConsole.log = originals.log;
    targetConsole.warn = originals.warn;
    targetConsole.error = originals.error;
  }

  function checkForUnexpectedLogs(testName = ''): void {
    if (unexpectedLogs.length === 0) {
      return;
    }
    const details =
        unexpectedLogs.map(entry => `console.${entry.level}: ${entry.message}\n${entry.stack}`).join('\n\n');
    throw new Error(`The test "${testName}" produced ${unexpectedLogs.length} unexpected console.${
        unexpectedLogs.length === 1 ? 'error/warn call' : 'error/warn calls'}:\n${details}`);
  }

  return {
    startTracking,
    stopTracking,
    checkForUnexpectedLogs,
  };
}

const defaultTracker = createConsoleLogTracker(console);

export function startTrackingConsoleLogs(): void {
  defaultTracker.startTracking();
}

export function stopTrackingConsoleLogs(): void {
  defaultTracker.stopTracking();
}

export function checkForUnexpectedConsoleLogs(testName = ''): void {
  defaultTracker.checkForUnexpectedLogs(testName);
}

// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Functions and state to tie error reporting and console output of
 * the browser process and frontend pages together.
 */

/* eslint-disable no-console */

// use require here due to
// https://github.com/evanw/esbuild/issues/587#issuecomment-901397213
import puppeteer = require('puppeteer-core');
const path = require('path');

const ALLOWED_ASSERTION_FAILURES = [
  // Failure during shutdown. crbug.com/1145969
  'Session is unregistering, can\'t dispatch pending call to Debugger.setBlackboxPatterns',
  // Failure during shutdown. crbug.com/1199322
  'Session is unregistering, can\'t dispatch pending call to DOM.getDocument',
  // Expected failures in assertion_test.ts
  'expected failure 1',
  'expected failure 2',
  // A failing fetch isn't itself a real error.
  // TODO(https://crbug.com/124534) Remove once those messages are not printed anymore.
  'Failed to load resource: the server responded with a status of 404 (Not Found)',
  // Every letter "typed" into the console can trigger a preview `Runtime.evaluate` call.
  // There is no way for an e2e test to know whether all of them have resolved or if there are
  // still pending calls. If the test finishes too early, the JS context is destroyed and pending
  // evaluations will fail. We ignore these kinds of errors. Tests have to make sure themselves
  // that all assertions and success criteria are met (e.g. autocompletions etc).
  // See: https://crbug.com/1192052
  'Request Runtime.evaluate failed. {"code":-32602,"message":"uniqueContextId not found"}',
  'uniqueContextId not found',
  'Request Storage.getStorageKeyForFrame failed. {"code":-32602,"message":"Frame tree node for given frame not found"}',
  'Unable to create texture',
];

const logLevels = {
  log: 'I',
  info: 'I',
  warning: 'I',
  error: 'E',
  exception: 'E',
  assert: 'E',
};

let stdout = '', stderr = '';
let unhandledRejectionSet = false;

export function setupBrowserProcessIO(browser: puppeteer.Browser): void {
  const browserProcess = browser.process();
  if (!browserProcess) {
    throw new Error('browserProcess is unexpectedly not defined.');
  }

  if (browserProcess.stderr) {
    browserProcess.stderr.setEncoding('utf8');
    browserProcess.stderr.on('data', data => {
      stderr += data;
    });
  }

  if (browserProcess.stdout) {
    browserProcess.stdout.setEncoding('utf8');
    browserProcess.stdout.on('data', data => {
      stdout += data;
    });
  }

  if (!unhandledRejectionSet) {
    browserProcess.on('unhandledRejection', error => {
      throw new Error(`Unhandled rejection in Frontend: ${error}`);
    });
    unhandledRejectionSet = true;
  }
}

export function installPageErrorHandlers(page: puppeteer.Page): void {
  page.on('error', error => {
    console.log('STDOUT:');
    console.log(stdout);
    console.log();
    console.log('STDERR:');
    console.log(stderr);
    console.log();
    throw new Error(`Error in Frontend: ${error}`);
  });

  page.on('pageerror', error => {
    if (error.message.includes(path.join('ui', 'components', 'docs'))) {
      uiComponentDocErrors.push(error);
    }
    throw new Error(`Page error in Frontend: ${error}`);
  });

  page.on('console', async msg => {
    const logLevel = logLevels[msg.type() as keyof typeof logLevels] as string;
    if (logLevel) {
      if (logLevel === 'E') {
        let message = `${logLevel}> `;
        if (msg.text() === 'JSHandle@error') {
          const errorHandle = msg.args()[0] as puppeteer.JSHandle<Error>;
          message += await errorHandle.evaluate(error => {
            return error.stack;
          });
          await errorHandle.dispose();
        } else {
          message += msg.text();
          for (const frame of msg.stackTrace()) {
            message += '\n' + formatStackFrame(frame);
          }
        }
        if (isExpectedError(msg)) {
          expectedErrors.push(message);
          console.log('(expected) ' + message);
        } else {
          fatalErrors.push(message);
          console.error(message);
        }
      } else {
        console.log(`${logLevel}> ${formatStackFrame(msg.location())}: ${msg.text()}`);
      }
    }
  });
}

function isExpectedError(consoleMessage: puppeteer.ConsoleMessage) {
  if (ALLOWED_ASSERTION_FAILURES.some(f => consoleMessage.text().includes(f))) {
    return true;
  }
  for (const expectation of pendingErrorExpectations) {
    if (expectation.check(consoleMessage)) {
      pendingErrorExpectations.delete(expectation);
      return true;
    }
  }
  return false;
}

export class ErrorExpectation {
  #caught: puppeteer.ConsoleMessage|undefined;
  readonly #msg: string|RegExp;
  constructor(msg: string|RegExp) {
    this.#msg = msg;
    pendingErrorExpectations.add(this);
  }

  drop() {
    pendingErrorExpectations.delete(this);
    return this.#caught;
  }

  get caught() {
    return this.#caught;
  }

  check(consoleMessage: puppeteer.ConsoleMessage) {
    const text = consoleMessage.text();
    const match = (this.#msg instanceof RegExp) ? Boolean(text.match(this.#msg)) : text.includes(this.#msg);
    if (match) {
      this.#caught = consoleMessage;
    }
    return match;
  }
}

export function expectError(msg: string|RegExp) {
  return new ErrorExpectation(msg);
}

function formatStackFrame(stackFrame: puppeteer.ConsoleMessageLocation): string {
  if (!stackFrame || !stackFrame.url) {
    return '<unknown>';
  }
  const filename = stackFrame.url.replace(/^.*\//, '');
  return `${filename}:${stackFrame.lineNumber}:${stackFrame.columnNumber}`;
}

export function dumpCollectedErrors(): void {
  console.log('Expected errors: ' + expectedErrors.length);
  console.log('   Fatal errors: ' + fatalErrors.length);
  if (fatalErrors.length) {
    throw new Error('Fatal errors logged:\n' + fatalErrors.join('\n'));
  }
  if (uiComponentDocErrors.length) {
    console.log(
        '\nErrors from component examples during test run:\n', uiComponentDocErrors.map(e => e.message).join('\n  '));
  }
}

const pendingErrorExpectations = new Set<ErrorExpectation>();
export const fatalErrors: string[] = [];
export const expectedErrors: string[] = [];
// Gathered separately so we can surface them during screenshot tests to help
// give an idea of failures, rather than having to guess purely based on the
// screenshot.
export const uiComponentDocErrors: Error[] = [];

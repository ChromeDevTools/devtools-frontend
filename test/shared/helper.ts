// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {AssertionError} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {AsyncScope} from '../conductor/async-scope.js';
import {reloadDevTools} from '../conductor/hooks.js';
import {getBrowserAndPages} from '../conductor/puppeteer-state.js';

import {getBrowserAndPagesWrappers} from './non_hosted_wrappers.js';

export {platform} from '../conductor/platform.js';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __pendingEvents: Map<string, Event[]>;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    __eventHandlers: WeakMap<Element, Map<string, Promise<void>>>;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    __getRenderCoordinatorPendingFrames(): number;
  }
}

export const waitFor = async<ElementType extends Element|null = null, Selector extends string = string>(
    selector: Selector, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope(), handler?: string,
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  return await devToolsPage.waitFor<ElementType, Selector>(selector, root, asyncScope, handler);
};
export const waitForFunction = async<T>(
    fn: () => Promise<T|undefined>, asyncScope = new AsyncScope(), description?: string,
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  return await devToolsPage.waitForFunction(fn, asyncScope, description);
};

export const step = async<T = unknown>(description: string, step: () => Promise<T>| T): Promise<Awaited<T>> => {
  try {
    return await step();
  } catch (error) {
    if (error instanceof AssertionError) {
      throw new AssertionError(
          `Unexpected Result in Step "${description}"
      ${error.message}`,
          error);
    } else {
      error.message += ` in Step "${description}"`;
      throw error;
    }
  }
};

export const selectOption = async (select: puppeteer.ElementHandle<HTMLSelectElement>, value: string) => {
  await select.evaluate(async (node, _value) => {
    node.value = _value;
    const event = document.createEvent('HTMLEvents');
    event.initEvent('change', false, true);
    node.dispatchEvent(event);
  }, value);
};

export {getBrowserAndPages, reloadDevTools};

export function matchString(actual: string, expected: string|RegExp): true|string {
  if (typeof expected === 'string') {
    if (actual !== expected) {
      return `Expected item "${actual}" to equal "${expected}"`;
    }
  } else if (!expected.test(actual)) {
    return `Expected item "${actual}" to match "${expected}"`;
  }
  return true;
}

export function matchArray<A, E>(
    actual: A[], expected: E[], comparator: (actual: A, expected: E) => true | string): true|string {
  if (actual.length !== expected.length) {
    return `Expected [${actual.map(x => `"${x}"`).join(', ')}] to have length ${expected.length}`;
  }

  for (let i = 0; i < expected.length; ++i) {
    const result = comparator(actual[i], expected[i]);
    if (result !== true) {
      return `Mismatch in row ${i}: ${result}`;
    }
  }
  return true;
}

export function assertOk<Args extends unknown[]>(check: (...args: Args) => true | string) {
  return (...args: Args) => {
    const result = check(...args);
    if (result !== true) {
      throw new AssertionError(result);
    }
  };
}

export function matchTable<A, E>(
    actual: A[][], expected: E[][], comparator: (actual: A, expected: E) => true | string) {
  return matchArray(actual, expected, (actual, expected) => matchArray<A, E>(actual, expected, comparator));
}

export const matchStringArray = (actual: string[], expected: Array<string|RegExp>) =>
    matchArray(actual, expected, matchString);

export const assertMatchArray = assertOk(matchStringArray);

export const matchStringTable = (actual: string[][], expected: Array<Array<string|RegExp>>) =>
    matchTable(actual, expected, matchString);

export const replacePuppeteerUrl = (value: string) => {
  return value.replace(/pptr:.*:([0-9]+)$/, (_, match) => {
    return `(index):${match}`;
  });
};

// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';

export class ExecutionError extends Error {}
export class SideEffectError extends Error {}

/* istanbul ignore next */
async function stringifyObjectOnThePage(this: unknown): Promise<string> {
  const seenBefore = new WeakMap();
  const obj = await this;
  if (obj === undefined) {
    return 'undefined';
  }
  if (typeof obj === 'bigint') {
    return `${obj}n`;
  }
  if (typeof obj === 'symbol') {
    return obj.toString();
  }
  if (typeof obj === 'function') {
    return obj.toString();
  }
  return JSON.stringify(obj, function replacer(this: unknown, key: string, value: unknown) {
    if (typeof value === 'object' && value !== null) {
      if (seenBefore.has(value)) {
        return '(cycle)';
      }

      seenBefore.set(value, true);
    }

    if (value instanceof HTMLElement) {
      const idAttribute = value.id ? ` id="${value.id}"` : '';
      const classAttribute = value.classList.value ? ` class="${value.classList.value}"` : '';

      return `<${value.nodeName.toLowerCase()}${idAttribute}${classAttribute}>${value.hasChildNodes() ? '...' : ''}</${
          value.nodeName.toLowerCase()}>`;
    }

    if (this instanceof CSSStyleDeclaration) {
      // Do not add number keys to the output.
      if (!isNaN(Number(key))) {
        return undefined;
      }
    }

    return value;
  });
}

export interface Options {
  throwOnSideEffect: boolean;
}
export class FreestylerEvaluateAction {
  static async execute(code: string, executionContext: SDK.RuntimeModel.ExecutionContext, {throwOnSideEffect}: Options):
      Promise<string> {
    const response = await executionContext.evaluate(
        {
          expression: code,
          replMode: true,
          includeCommandLineAPI: true,
          returnByValue: false,
          silent: false,
          generatePreview: true,
          allowUnsafeEvalBlockedByCSP: false,
          throwOnSideEffect,
        },
        /* userGesture */ false, /* awaitPromise */ true);

    try {
      if (!response) {
        throw new Error('Response is not found');
      }

      if ('error' in response) {
        throw new ExecutionError(response.error);
      }

      if (response.exceptionDetails) {
        const exceptionDescription = response.exceptionDetails.exception?.description;
        if (SDK.RuntimeModel.RuntimeModel.isSideEffectFailure(response)) {
          throw new SideEffectError(exceptionDescription);
        }
        throw new ExecutionError(exceptionDescription || 'JS exception');
      }

      return await response.object.callFunctionJSON(stringifyObjectOnThePage, undefined, /* awaitPromise = */ true);
    } finally {
      executionContext.runtimeModel.releaseEvaluationResult(response);
    }
  }
}

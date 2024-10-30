// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

export class ExecutionError extends Error {}
export class SideEffectError extends Error {}

/* istanbul ignore next */
function stringifyObjectOnThePage(this: unknown): string {
  const seenBefore = new WeakMap();
  return JSON.stringify(this, function replacer(this: unknown, key: string, value: unknown) {
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

async function stringifyRemoteObject(object: SDK.RemoteObject.RemoteObject): Promise<string> {
  switch (object.type) {
    case Protocol.Runtime.RemoteObjectType.String:
      return `'${object.value}'`;
    case Protocol.Runtime.RemoteObjectType.Bigint:
      return `${object.value}n`;
    case Protocol.Runtime.RemoteObjectType.Boolean:
    case Protocol.Runtime.RemoteObjectType.Number:
      return `${object.value}`;
    case Protocol.Runtime.RemoteObjectType.Undefined:
      return 'undefined';
    case Protocol.Runtime.RemoteObjectType.Symbol:
    case Protocol.Runtime.RemoteObjectType.Function:
      return `${object.description}`;
    case Protocol.Runtime.RemoteObjectType.Object: {
      const res = await object.callFunction(stringifyObjectOnThePage);
      if (!res.object || res.object.type !== Protocol.Runtime.RemoteObjectType.String) {
        throw new Error('Could not stringify the object' + object);
      }

      return res.object.value;
    }
    default:
      throw new Error('Unknown type to stringify ' + object.type);
  }
}

export interface Options {
  throwOnSideEffect: boolean;
}
export class FreestylerEvaluateAction {
  static async execute(
      functionDeclaration: string, args: Array<SDK.RemoteObject.RemoteObject>,
      executionContext: SDK.RuntimeModel.ExecutionContext, {throwOnSideEffect}: Options): Promise<string> {
    if (executionContext.debuggerModel.selectedCallFrame()) {
      throw new ExecutionError('Cannot evaluate JavaScript because the execution is paused on a breakpoint.');
    }
    const response = await executionContext.callFunctionOn({
      functionDeclaration,
      includeCommandLineAPI: false,
      returnByValue: false,
      allowUnsafeEvalBlockedByCSP: false,
      throwOnSideEffect,
      userGesture: true,
      awaitPromise: true,
      arguments: args.map(remoteObject => {
        return {objectId: remoteObject.objectId};
      }),
    });

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

      return stringifyRemoteObject(response.object);
    } finally {
      executionContext.runtimeModel.releaseEvaluationResult(response);
    }
  }
}

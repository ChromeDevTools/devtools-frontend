// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

export class ExecutionError extends Error {}

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
      const attributesText = [];
      for (const attribute of value.attributes) {
        attributesText.push(`${attribute.name}="${attribute.value}"`);
      }

      return `<${value.nodeName.toLowerCase()}${attributesText.length > 0 ? ` ${attributesText.join(' ')}` : ''}>${
          value.hasChildNodes() ? '...' : ''}</${value.nodeName.toLowerCase()}>`;
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

      return res.object.value as string;
    }
    default:
      throw new Error('Unknown type to stringify ' + object.type);
  }
}

export class FreestylerEvaluateAction {
  static async execute(code: string, executionContext: SDK.RuntimeModel.ExecutionContext): Promise<string> {
    const response = await executionContext.evaluate(
        {
          expression: code,
          replMode: true,
          includeCommandLineAPI: true,
          returnByValue: false,
          silent: false,
          generatePreview: true,
          allowUnsafeEvalBlockedByCSP: false,
        },
        /* userGesture */ false, /* awaitPromise */ true);

    if (!response) {
      throw new Error('Response is not found');
    }

    if ('error' in response) {
      throw new ExecutionError(response.error);
    }

    if (response.exceptionDetails) {
      // TODO(ergunsh): We can return the exception message so that it can tweak the code to run.
      throw new ExecutionError(response.exceptionDetails.exception?.description || 'JS exception');
    }

    return stringifyRemoteObject(response.object);
  }
}

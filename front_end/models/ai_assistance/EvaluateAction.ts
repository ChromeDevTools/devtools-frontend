// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

import {
  getErrorStackOnThePage,
  type GetErrorStackOutput,
  stringifyObjectOnThePage,
} from './DOMHelpers.js';
import {PAGE_EXPOSED_FUNCTIONS} from './injected.js';

/**
 * Caps concurrent `DOM.describeNode` CDP calls and retained element
 * `RemoteObject` handles per evaluation.
 */
export const MAX_SERIALIZED_ELEMENT_UIDS = 50;

export function formatError(message: string): string {
  return `Error: ${message}`;
}
export class SideEffectError extends Error {}

/**
 * Releases own and internal property `RemoteObject` handles returned by
 * `RemoteObject#getOwnProperties(false)`.
 *
 * `RemoteObject#release()` frees only the receiver handle itself, not child
 * handles (such as `elements`, individual DOM nodes, or `[[Prototype]]`)
 * allocated by `Runtime.getProperties`.
 */
function releaseProperties(
    properties: SDK.RemoteObject.RemoteObjectProperty[]|null,
    internalProperties: SDK.RemoteObject.RemoteObjectProperty[]|null,
    ): void {
  for (const property of [...(properties ?? []), ...(internalProperties ?? [])]) {
    // TODO(b/590037053): Replace manual field releases with `property.release()`.
    property.value?.release();
    property.symbol?.release();
    property.getter?.release();
    property.setter?.release();
  }
}

/**
 * Resolves `backendNodeId` values (`depth: 0`) for an array `RemoteObject` of
 * DOM `Element` handles.
 *
 * Individual lookup failures yield `null` at that element's index without
 * aborting serialization.
 */
async function resolveElementBackendNodeIds(
    elementsArray: SDK.RemoteObject.RemoteObject,
    domAgent: ProtocolProxyApi.DOMApi,
    ): Promise<Array<number|null>> {
  const {properties, internalProperties} = await elementsArray.getOwnProperties(false);
  try {
    const elementProperties = (properties ?? []).filter(property => {
      const index = Number(property.name);
      return Number.isInteger(index) && index >= 0 && String(index) === property.name;
    });

    const resolvedEntries = await Promise.all(
        elementProperties.map(async property => {
          const index = Number(property.name);
          const objectId = property.value?.objectId;
          if (!objectId) {
            return {index, backendNodeId: null};
          }
          const response = await domAgent.invoke_describeNode({objectId, depth: 0});
          const backendNodeId =
              !response.getError() && response.node?.backendNodeId ? response.node.backendNodeId : null;
          return {index, backendNodeId};
        }),
    );

    const maxIndex = resolvedEntries.reduce((max, entry) => Math.max(max, entry.index), -1);
    const resolvedUids: Array<number|null> = Array.from({length: maxIndex + 1}, () => null);
    for (const {index, backendNodeId} of resolvedEntries) {
      resolvedUids[index] = backendNodeId;
    }
    return resolvedUids;
  } finally {
    releaseProperties(properties, internalProperties);
  }
}

/**
 * Executes a page helper on `object` under `throwOnSideEffect: true` and
 * returns its `RemoteObject` result.
 *
 * Releases the exception handle and throws if the page call throws or returns
 * no object; callers are responsible for releasing the returned `RemoteObject`.
 */
async function callPageFunction<TArgs extends unknown[]>(
    object: SDK.RemoteObject.RemoteObject,
    fn: (this: unknown, ...args: TArgs) => unknown,
    args?: Protocol.Runtime.CallArgument[],
    ): Promise<SDK.RemoteObject.RemoteObject> {
  const res = await object.callFunction(fn, args, {throwOnSideEffect: true});
  if (res.wasThrown) {
    const description = res.object?.description ?? object;
    res.object?.release();
    throw new Error(`Could not stringify the object: ${description}`);
  }
  if (!res.object) {
    throw new Error('Could not stringify the object' + object);
  }
  return res.object;
}

/**
 * Serializes a non-error `RemoteObject` on the inspected page and prefixes any
 * DOM `Element` tags with their resolved `BackendNodeId` (`(uid=<id>)`).
 *
 * Page JavaScript cannot read Blink's internal `backendNodeId`, so this runs
 * `stringifyObjectOnThePage` once to capture a `StringifiedPageObject`
 * (`{json, elements}`) where each collected element tag is prefixed with a
 * unique placeholder (`<prefix><index>__`), resolves each handle in `elements`
 * with `DOM.describeNode`, and swaps each placeholder for `(uid=<id>) ` (or
 * `""` on failure). Capturing `json` and `elements` in a single pass ensures
 * live DOM collections (`HTMLCollection`, `NodeList`) mutating while
 * `DOM.describeNode` is in flight cannot shift indices and attach UIDs to the
 * wrong elements. Releases all intermediate `RemoteObject` handles in
 * `finally`.
 */
async function stringifyRemoteObjectOnThePage(object: SDK.RemoteObject.RemoteObject): Promise<string> {
  // Generate the placeholder nonce in DevTools because `stringifyObjectOnThePage`
  // runs under `throwOnSideEffect: true`, and keeping the nonce out of
  // main-world reach prevents page content from forging UID prefixes.
  const uidPlaceholderPrefix = `__devtools_uid_${crypto.randomUUID()}_`;
  const resultObject = await callPageFunction(
      object,
      stringifyObjectOnThePage,
      [{value: {maxElements: MAX_SERIALIZED_ELEMENT_UIDS, uidPlaceholderPrefix}}],
  );
  try {
    if (resultObject.type !== Protocol.Runtime.RemoteObjectType.Object) {
      throw new Error('Could not stringify the object' + object);
    }
    const {properties, internalProperties} = await resultObject.getOwnProperties(false);
    try {
      const jsonProp = properties?.find(property => property.name === 'json')?.value;
      const elementsProp = properties?.find(property => property.name === 'elements')?.value;
      if (!jsonProp || jsonProp.type !== Protocol.Runtime.RemoteObjectType.String ||
          typeof jsonProp.value !== 'string') {
        throw new Error('Could not stringify the object' + object);
      }
      if (!elementsProp || elementsProp.subtype !== Protocol.Runtime.RemoteObjectSubtype.Array) {
        throw new Error('Could not stringify the object' + object);
      }
      let json = jsonProp.value;
      const elementCount = elementsProp.arrayLength();
      if (elementCount > 0) {
        const resolvedUids = await resolveElementBackendNodeIds(
            elementsProp,
            object.runtimeModel().target().domAgent(),
        );
        // Bound by `elementCount` (`elementsProp.arrayLength()`) as well as
        // `resolvedUids.length` so every emitted placeholder is stripped even if
        // `getOwnProperties()` returns fewer entries than collected elements.
        // Pass a callback replacer to `replaceAll` to avoid `$`-pattern interpretation.
        const maxElements = Math.max(elementCount, resolvedUids.length);
        for (let i = 0; i < maxElements; i++) {
          const uid = resolvedUids[i];
          json = json.replaceAll(`${uidPlaceholderPrefix}${i}__`, () => (uid ? `(uid=${uid}) ` : ''));
        }
      }
      return json;
    } finally {
      releaseProperties(properties, internalProperties);
    }
  } finally {
    resultObject.release();
  }
}

export async function stringifyRemoteObject(
    object: SDK.RemoteObject.RemoteObject, functionDeclaration: string): Promise<string> {
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
      if (object.subtype === 'error') {
        const res = await object.callFunctionJSON(getErrorStackOnThePage, [], {throwOnSideEffect: true});

        if (!res) {
          throw new Error('Could not stringify the object' + object);
        }

        return EvaluateAction.stringifyError(res, functionDeclaration);
      }
      return await stringifyRemoteObjectOnThePage(object);
    }
    default:
      throw new Error('Unknown type to stringify ' + object.type);
  }
}

export interface Options {
  throwOnSideEffect: boolean;
}
export class EvaluateAction {
  static async execute(
      functionDeclaration: string, args: SDK.RemoteObject.RemoteObject[],
      executionContext: SDK.RuntimeModel.ExecutionContext, {throwOnSideEffect}: Options): Promise<string> {
    if (executionContext.debuggerModel.selectedCallFrame()) {
      return formatError('Cannot evaluate JavaScript because the execution is paused on a breakpoint.');
    }
    const response = await executionContext.callFunctionOn({
      functionDeclaration,
      returnByValue: false,
      allowUnsafeEvalBlockedByCSP: false,
      throwOnSideEffect,
      userGesture: false,
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
        return formatError(response.error);
      }

      if (response.exceptionDetails) {
        const exceptionDescription = response.exceptionDetails.exception?.description;
        if (SDK.RuntimeModel.RuntimeModel.isSideEffectFailure(response)) {
          throw new SideEffectError(exceptionDescription);
        }
        return formatError(exceptionDescription ?? 'JS exception');
      }

      return await stringifyRemoteObject(response.object, functionDeclaration);
    } finally {
      executionContext.runtimeModel.releaseEvaluationResult(response);
    }
  }

  static getExecutedLineFromStack(stack: string, pageExposedFunctions: string[]): number|null {
    const lines = stack.split('\n');

    const stackLines = lines.map(curr => curr.trim()).filter(trimmedLine => {
      return trimmedLine.startsWith('at');
    });

    const selectedStack = stackLines.find(stackLine => {
      const splittedStackLine = stackLine.split(' ');

      if (splittedStackLine.length < 2) {
        return false;
      }

      const signature = splittedStackLine[1] === 'async' ?
          splittedStackLine[2] :  // if the stack line contains async the function name is the next element
          splittedStackLine[1];

      const lastDotIndex = signature.lastIndexOf('.');
      const functionName = lastDotIndex !== -1 ? signature.substring(lastDotIndex + 1) : signature;

      return !pageExposedFunctions.includes(functionName);
    });

    if (!selectedStack) {
      return null;
    }

    const frameLocationRegex = /:(\d+)(?::\d+)?\)?$/;
    const match = selectedStack.match(frameLocationRegex);

    if (!match?.[1]) {
      return null;
    }

    const lineNum = parseInt(match[1], 10);
    if (isNaN(lineNum)) {
      return null;
    }

    return lineNum - 1;
  }

  static stringifyError(result: GetErrorStackOutput, functionDeclaration: string): string {
    if (!result.stack) {
      return `Error: ${result.message}`;
    }

    const lineNum = EvaluateAction.getExecutedLineFromStack(result.stack, PAGE_EXPOSED_FUNCTIONS);
    if (!lineNum) {
      return `Error: ${result.message}`;
    }

    const functionLines = functionDeclaration.split('\n');

    const errorLine = functionLines[lineNum];
    if (!errorLine) {
      return `Error: ${result.message}`;
    }

    return `Error: executing the line "${errorLine.trim()}" failed with the following error:\n${result.message}`;
  }
}

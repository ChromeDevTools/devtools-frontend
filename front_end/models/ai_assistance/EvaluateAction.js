// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
export function formatError(message) {
    return `Error: ${message}`;
}
export class SideEffectError extends Error {
}
/* istanbul ignore next */
export function stringifyObjectOnThePage() {
    if (this instanceof Error) {
        return `Error: ${this.message}`;
    }
    const seenBefore = new WeakMap();
    return JSON.stringify(this, function replacer(key, value) {
        if (typeof value === 'object' && value !== null) {
            if (seenBefore.has(value)) {
                return '(cycle)';
            }
            seenBefore.set(value, true);
        }
        if (value instanceof HTMLElement) {
            const idAttribute = value.id ? ` id="${value.id}"` : '';
            const classAttribute = value.classList.value ? ` class="${value.classList.value}"` : '';
            return `<${value.nodeName.toLowerCase()}${idAttribute}${classAttribute}>${value.hasChildNodes() ? '...' : ''}</${value.nodeName.toLowerCase()}>`;
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
export async function stringifyRemoteObject(object) {
    switch (object.type) {
        case "string" /* Protocol.Runtime.RemoteObjectType.String */:
            return `'${object.value}'`;
        case "bigint" /* Protocol.Runtime.RemoteObjectType.Bigint */:
            return `${object.value}n`;
        case "boolean" /* Protocol.Runtime.RemoteObjectType.Boolean */:
        case "number" /* Protocol.Runtime.RemoteObjectType.Number */:
            return `${object.value}`;
        case "undefined" /* Protocol.Runtime.RemoteObjectType.Undefined */:
            return 'undefined';
        case "symbol" /* Protocol.Runtime.RemoteObjectType.Symbol */:
        case "function" /* Protocol.Runtime.RemoteObjectType.Function */:
            return `${object.description}`;
        case "object" /* Protocol.Runtime.RemoteObjectType.Object */: {
            const res = await object.callFunction(stringifyObjectOnThePage);
            if (!res.object || res.object.type !== "string" /* Protocol.Runtime.RemoteObjectType.String */) {
                throw new Error('Could not stringify the object' + object);
            }
            return res.object.value;
        }
        default:
            throw new Error('Unknown type to stringify ' + object.type);
    }
}
export class EvaluateAction {
    static async execute(functionDeclaration, args, executionContext, { throwOnSideEffect }) {
        if (executionContext.debuggerModel.selectedCallFrame()) {
            return formatError('Cannot evaluate JavaScript because the execution is paused on a breakpoint.');
        }
        const response = await executionContext.callFunctionOn({
            functionDeclaration,
            returnByValue: false,
            allowUnsafeEvalBlockedByCSP: false,
            throwOnSideEffect,
            userGesture: true,
            awaitPromise: true,
            arguments: args.map(remoteObject => {
                return { objectId: remoteObject.objectId };
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
            return await stringifyRemoteObject(response.object);
        }
        finally {
            executionContext.runtimeModel.releaseEvaluationResult(response);
        }
    }
}
//# sourceMappingURL=EvaluateAction.js.map
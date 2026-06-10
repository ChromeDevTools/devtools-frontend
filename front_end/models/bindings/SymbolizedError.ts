// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as StackTrace from '../stack_trace/stack_trace.js';
import type * as Workspace from '../workspace/workspace.js';

import type {DebuggerWorkspaceBinding} from './DebuggerWorkspaceBinding.js';
import {type LiveLocation, LiveLocationPool} from './LiveLocation.js';

export function isErrorLike(stack: string): boolean {
  return /\n\s*at\s/.test(stack) || stack.startsWith('SyntaxError:');
}

export type SymbolizedError = SymbolizedErrorObject|UnparsableError;

export class UnparsableError extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly errorStack: string;
  readonly cause: SymbolizedError|null;

  constructor(errorStack: string, cause: SymbolizedError|null) {
    super();
    this.errorStack = errorStack;
    this.cause = cause;

    this.cause?.addEventListener(Events.UPDATED, this.#fireUpdated, this);
  }

  dispose(): void {
    this.cause?.removeEventListener(Events.UPDATED, this.#fireUpdated, this);
    if (this.cause instanceof SymbolizedErrorObject || this.cause instanceof UnparsableError) {
      this.cause.dispose();
    }
  }

  #fireUpdated(): void {
    this.dispatchEventToListeners(Events.UPDATED);
  }
}

export class SymbolizedErrorObject extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly message: string;
  readonly stackTrace: StackTrace.StackTrace.ParsedErrorStackTrace;
  readonly cause: SymbolizedError|null;
  #syntaxErrorLocation: Workspace.UISourceCode.UILocation|null = null;

  constructor(message: string, stackTrace: StackTrace.StackTrace.ParsedErrorStackTrace, cause: SymbolizedError|null) {
    super();
    this.message = message;
    this.stackTrace = stackTrace;
    this.cause = cause;

    this.stackTrace.addEventListener(StackTrace.StackTrace.Events.UPDATED, this.#fireUpdated, this);
    this.cause?.addEventListener(Events.UPDATED, this.#fireUpdated, this);
  }

  dispose(): void {
    this.stackTrace.removeEventListener(StackTrace.StackTrace.Events.UPDATED, this.#fireUpdated, this);
    this.cause?.removeEventListener(Events.UPDATED, this.#fireUpdated, this);
    if (this.cause instanceof SymbolizedErrorObject || this.cause instanceof UnparsableError) {
      this.cause.dispose();
    }
  }

  get syntaxErrorLocation(): Workspace.UISourceCode.UILocation|null {
    return this.#syntaxErrorLocation;
  }

  /**
   * Evaluates if we should populate the `syntaxErrorLocation` based on the provided exception details.
   *
   * There are three primary cases for SyntaxError:
   * 1. Programmatic `SyntaxError`: Thrown via `throw new SyntaxError('...', {cause: ...})`. Has a full stack trace,
   *    and an optional cause. The exception details point to the `throw` statement, which is identical to the top frame.
   *    We do NOT want to populate `syntaxErrorLocation` here to avoid redundant location rendering in the UI.
   * 2. Script parse failure: Failed to parse a script. Has no stack trace but possesses a compile-time location.
   *    We DO want to populate `syntaxErrorLocation` to highlight where the parse failed.
   * 3. `eval` parse failure: Failed to parse an eval string. Has a stack trace pointing to the `eval` call site
   *    and a compile-time location of the parse failure within the string. The exception details location differs
   *    from the top frame. We DO want to populate `syntaxErrorLocation` here.
   */
  static async createForSyntaxError(target: SDK.Target.Target, debuggerWorkspaceBinding: DebuggerWorkspaceBinding,
                                    message: string, exceptionDetails: Protocol.Runtime.ExceptionDetails,
                                    stackTrace: StackTrace.StackTrace.ParsedErrorStackTrace,
                                    cause: SymbolizedError|null): Promise<SymbolizedErrorObject> {
    const {exception, scriptId, lineNumber, columnNumber} = exceptionDetails;
    if (!exception || exception.subtype !== 'error' || exception.className !== 'SyntaxError') {
      throw new Error('SymbolizedErrorObject.createForSyntaxError expects a SyntaxError');
    }

    const symbolizedError = new SymbolizedErrorObject(message, stackTrace, cause);

    if (!scriptId) {
      return symbolizedError;
    }

    const topFrame = exceptionDetails.stackTrace?.callFrames[0];
    const isProgrammaticThrow = topFrame && topFrame.scriptId === scriptId && topFrame.lineNumber === lineNumber &&
        topFrame.columnNumber === columnNumber;

    if (!isProgrammaticThrow) {
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      if (debuggerModel) {
        const rawLocation = debuggerModel.createRawLocationByScriptId(scriptId, lineNumber, columnNumber);
        // We don't implement dispose here. We won't create many of these so a couple
        // LiveLocationPools and SymbolizedErrorObject instances leaking is fine.
        await debuggerWorkspaceBinding.createLiveLocation(
            rawLocation, symbolizedError.#updateSyntaxErrorLocation.bind(symbolizedError), new LiveLocationPool());
      }
    }

    return symbolizedError;
  }

  async #updateSyntaxErrorLocation(liveLocation: LiveLocation): Promise<void> {
    this.#syntaxErrorLocation = await liveLocation.uiLocation();
    this.dispatchEventToListeners(Events.UPDATED);
  }

  #fireUpdated(): void {
    this.dispatchEventToListeners(Events.UPDATED);
  }
}

export const enum Events {
  UPDATED = 'UPDATED',
}

export interface EventTypes {
  [Events.UPDATED]: void;
}

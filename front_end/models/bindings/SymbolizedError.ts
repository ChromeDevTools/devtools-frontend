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

// TODO: also add SymbolizedSyntaxError and UnparsableError
export type SymbolizedError = SymbolizedErrorObject;

export class SymbolizedErrorObject extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly message: string;
  readonly stackTrace: StackTrace.StackTrace.ParsedErrorStackTrace;
  readonly cause: SymbolizedError|null;

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
    this.cause?.dispose();
  }

  #fireUpdated(): void {
    this.dispatchEventToListeners(Events.UPDATED);
  }
}

export class SymbolizedSyntaxError extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly message: string;
  #uiLocation: Workspace.UISourceCode.UILocation|null = null;

  private constructor(message: string) {
    super();
    this.message = message;
  }

  get uiLocation(): Workspace.UISourceCode.UILocation|null {
    return this.#uiLocation;
  }

  static async fromExceptionDetails(
      target: SDK.Target.Target, debuggerWorkspaceBinding: DebuggerWorkspaceBinding,
      exceptionDetails: Protocol.Runtime.ExceptionDetails): Promise<SymbolizedSyntaxError|null> {
    const {exception, scriptId, lineNumber, columnNumber} = exceptionDetails;
    if (!exception || exception.subtype !== 'error' || exception.className !== 'SyntaxError') {
      throw new Error('SymbolizedSyntaxError.fromExceptionDetails expects a SyntaxError');
    }
    if (!scriptId) {
      return null;
    }

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    if (!debuggerModel) {
      return null;
    }

    const rawLocation = debuggerModel.createRawLocationByScriptId(scriptId, lineNumber, columnNumber);
    const symbolizedSyntaxError = new SymbolizedSyntaxError(exception.description || '');

    // We don't implement dispose here. We won't create many of these so a couple
    // LiveLocationPools and SymbolizedSyntaxError instances leaking is fine.
    await debuggerWorkspaceBinding.createLiveLocation(
        rawLocation, symbolizedSyntaxError.#update.bind(symbolizedSyntaxError), new LiveLocationPool());

    return symbolizedSyntaxError;
  }

  async #update(liveLocation: LiveLocation): Promise<void> {
    this.#uiLocation = await liveLocation.uiLocation();
    this.dispatchEventToListeners(Events.UPDATED);
  }
}

export const enum Events {
  UPDATED = 'UPDATED',
}

export interface EventTypes {
  [Events.UPDATED]: void;
}

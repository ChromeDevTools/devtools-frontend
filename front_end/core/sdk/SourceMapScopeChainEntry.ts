// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import * as i18n from '../i18n/i18n.js';

import type {CallFrame, LocationRange, ScopeChainEntry} from './DebuggerModel.js';
import {type GetPropertiesResult, type RemoteObject, RemoteObjectImpl, RemoteObjectProperty} from './RemoteObject.js';
import type {GeneratedRange, OriginalScope} from './SourceMapScopes.js';
import {contains} from './SourceMapScopesInfo.js';

const UIStrings = {
  /**
   *@description Title of a section in the debugger showing local JavaScript variables.
   */
  local: 'Local',
  /**
   *@description Text that refers to closure as a programming term
   */
  closure: 'Closure',
  /**
   *@description Noun that represents a section or block of code in the Debugger Model. Shown in the Sources tab, while paused on a breakpoint.
   */
  block: 'Block',
  /**
   *@description Title of a section in the debugger showing JavaScript variables from the global scope.
   */
  global: 'Global',
  /**
   *@description Text in Scope Chain Sidebar Pane of the Sources panel
   */
  returnValue: 'Return value',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/SourceMapScopeChainEntry.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SourceMapScopeChainEntry implements ScopeChainEntry {
  readonly #callFrame: CallFrame;
  readonly #scope: OriginalScope;
  readonly #range?: GeneratedRange;
  readonly #isInnerMostFunction: boolean;
  readonly #returnValue?: RemoteObject;

  /**
   * @param isInnerMostFunction If `scope` is the innermost 'function' scope. Only used for labeling as we name the
   * scope of the paused function 'Local', while other outer 'function' scopes are named 'Closure'.
   */
  constructor(
      callFrame: CallFrame, scope: OriginalScope, range: GeneratedRange|undefined, isInnerMostFunction: boolean,
      returnValue: RemoteObject|undefined) {
    this.#callFrame = callFrame;
    this.#scope = scope;
    this.#range = range;
    this.#isInnerMostFunction = isInnerMostFunction;
    this.#returnValue = returnValue;
  }

  extraProperties(): RemoteObjectProperty[] {
    if (this.#returnValue) {
      return [new RemoteObjectProperty(
          i18nString(UIStrings.returnValue), this.#returnValue, undefined, undefined, undefined, undefined, undefined,
          /* synthetic */ true)];
    }
    return [];
  }

  callFrame(): CallFrame {
    return this.#callFrame;
  }

  type(): string {
    switch (this.#scope.kind) {
      case 'global':
        return Protocol.Debugger.ScopeType.Global;
      case 'function':
        return this.#isInnerMostFunction ? Protocol.Debugger.ScopeType.Local : Protocol.Debugger.ScopeType.Closure;
      case 'block':
        return Protocol.Debugger.ScopeType.Block;
    }
    return this.#scope.kind;
  }

  typeName(): string {
    switch (this.#scope.kind) {
      case 'global':
        return i18nString(UIStrings.global);
      case 'function':
        return this.#isInnerMostFunction ? i18nString(UIStrings.local) : i18nString(UIStrings.closure);
      case 'block':
        return i18nString(UIStrings.block);
    }
    return this.#scope.kind;
  }

  name(): string|undefined {
    return this.#scope.name;
  }

  range(): LocationRange|null {
    return null;
  }

  object(): RemoteObject {
    return new SourceMapScopeRemoteObject(this.#callFrame, this.#scope, this.#range);
  }

  description(): string {
    return '';
  }

  icon(): string|undefined {
    return undefined;
  }
}

class SourceMapScopeRemoteObject extends RemoteObjectImpl {
  readonly #callFrame: CallFrame;
  readonly #scope: OriginalScope;
  readonly #range?: GeneratedRange;

  constructor(callFrame: CallFrame, scope: OriginalScope, range: GeneratedRange|undefined) {
    super(
        callFrame.debuggerModel.runtimeModel(), /* objectId */ undefined, 'object', /* sub type */ undefined,
        /* value */ null);
    this.#callFrame = callFrame;
    this.#scope = scope;
    this.#range = range;
  }

  override async doGetProperties(_ownProperties: boolean, accessorPropertiesOnly: boolean, generatePreview: boolean):
      Promise<GetPropertiesResult> {
    if (accessorPropertiesOnly) {
      return {properties: [], internalProperties: []};
    }

    const properties: RemoteObjectProperty[] = [];
    for (const [index, variable] of this.#scope.variables.entries()) {
      const expression = this.#findExpression(index);
      if (expression === null) {
        properties.push(SourceMapScopeRemoteObject.#unavailableProperty(variable));
        continue;
      }

      // TODO(crbug.com/40277685): Once we can evaluate expressions in scopes other than the innermost one,
      //         we need to find the find the CDP scope that matches `this.#range` and evaluate in that.
      const result = await this.#callFrame.evaluate({expression, generatePreview});
      if ('error' in result || result.exceptionDetails) {
        // TODO(crbug.com/40277685): Make these errors user-visible to aid tooling developers.
        //         E.g. show the error on hover or expose it in the developer resources panel.
        properties.push(SourceMapScopeRemoteObject.#unavailableProperty(variable));
      } else {
        properties.push(new RemoteObjectProperty(
            variable, result.object, /* enumerable */ false, /* writable */ false, /* isOwn */ true,
            /* wasThrown */ false));
      }
    }

    return {properties, internalProperties: []};
  }

  /** @returns null if the variable is unavailable at the current paused location */
  #findExpression(index: number): string|null {
    if (!this.#range) {
      return null;
    }

    const expressionOrSubRanges = this.#range.values[index];
    if (typeof expressionOrSubRanges === 'string') {
      return expressionOrSubRanges;
    }
    if (expressionOrSubRanges === undefined) {
      return null;
    }

    const pausedPosition = this.#callFrame.location();
    for (const range of expressionOrSubRanges) {
      if (contains({start: range.from, end: range.to}, pausedPosition.lineNumber, pausedPosition.columnNumber)) {
        return range.value ?? null;
      }
    }
    return null;
  }

  static #unavailableProperty(name: string): RemoteObjectProperty {
    return new RemoteObjectProperty(
        name, null, /* enumerable */ false, /* writeable */ false, /* isOwn */ true, /* wasThrown */ false);
  }
}

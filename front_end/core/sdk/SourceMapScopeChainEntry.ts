// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import * as i18n from '../i18n/i18n.js';

import {type CallFrame, type LocationRange, type ScopeChainEntry} from './DebuggerModel.js';
import {LocalJSONObject, type RemoteObject, RemoteObjectProperty} from './RemoteObject.js';
import {type GeneratedRange, type OriginalScope} from './SourceMapScopes.js';

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
  /* eslint-disable-next-line no-unused-private-class-members */
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
    // TODO(crbug.com/40277685): Return a remote object that uses 'evaluateOnCallFrame' with
    //                           binding expressions to resolve this scope's variables.
    return new LocalJSONObject({});
  }

  description(): string {
    return '';
  }

  icon(): string|undefined {
    return undefined;
  }
}

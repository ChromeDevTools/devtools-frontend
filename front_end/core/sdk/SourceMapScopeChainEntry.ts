// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import type * as ScopesCodec from '../../third_party/source-map-scopes-codec/source-map-scopes-codec.js';
import * as i18n from '../i18n/i18n.js';

import type {CallFrame, LocationRange, ScopeChainEntry} from './DebuggerModel.js';
import {type GetPropertiesResult, type RemoteObject, RemoteObjectImpl, RemoteObjectProperty} from './RemoteObject.js';
import {contains} from './SourceMapScopesInfo.js';

const UIStrings = {
  /**
   * @description Title of a section in the debugger showing local JavaScript variables.
   */
  local: 'Local',
  /**
   * @description Text that refers to closure as a programming term.
   */
  closure: 'Closure',
  /**
   * @description Noun that represents a section or block of code in the Debugger Model. Shown in the Sources tab, while paused on a breakpoint.
   */
  block: 'Block',
  /**
   * @description Title of a section in the debugger showing JavaScript variables from the global scope.
   */
  global: 'Global',
  /**
   * @description Text in Scope Chain section of the Sources panel.
   */
  exception: 'Exception',
  /**
   * @description Text in Scope Chain section of the Sources panel.
   */
  returnValue: 'Return value',
} as const;
const str_ = i18n.i18n.registerUIStrings('core/sdk/SourceMapScopeChainEntry.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SourceMapScopeChainEntry implements ScopeChainEntry {
  readonly #callFrame: CallFrame;
  readonly #scope: ScopesCodec.OriginalScope;
  readonly #range?: ScopesCodec.GeneratedRange;
  readonly #isInnerMostFunction: boolean;
  readonly #returnValue?: RemoteObject;
  readonly #scopeNumber?: number;

  /**
   * @param isInnerMostFunction If `scope` is the innermost 'function' scope. Only used for labeling as we name the
   * scope of the paused function 'Local', while other outer 'function' scopes are named 'Closure'.
   * @param scopeNumber The V8 scope in which `scope`s binding expressions must be evaluated. Defaults to the
   * inner-most scope.
   */
  constructor(callFrame: CallFrame, scope: ScopesCodec.OriginalScope, range: ScopesCodec.GeneratedRange|undefined,
              isInnerMostFunction: boolean, returnValue: RemoteObject|undefined, scopeNumber?: number) {
    this.#callFrame = callFrame;
    this.#scope = scope;
    this.#range = range;
    this.#isInnerMostFunction = isInnerMostFunction;
    this.#returnValue = returnValue;
    this.#scopeNumber = scopeNumber;
  }

  extraProperties(): RemoteObjectProperty[] {
    const extraProperties = [];
    if (this.#isInnerMostFunction && this.#callFrame.exception) {
      extraProperties.push(new RemoteObjectProperty(i18nString(UIStrings.exception), this.#callFrame.exception,
                                                    undefined, undefined, undefined, undefined, undefined,
                                                    /* synthetic */ true));
    }
    if (this.#returnValue) {
      extraProperties.push(new RemoteObjectProperty(
          i18nString(UIStrings.returnValue), this.#returnValue, undefined, undefined, undefined, undefined, undefined,
          /* synthetic */ true, this.#callFrame.setReturnValue.bind(this.#callFrame)));
    }
    return extraProperties;
  }

  callFrame(): CallFrame {
    return this.#callFrame;
  }

  type(): string {
    if (this.#scope.isStackFrame) {
      return this.#isInnerMostFunction ? Protocol.Debugger.ScopeType.Local : Protocol.Debugger.ScopeType.Closure;
    }
    // `kind` is a free-form label. The spec encourages 'Global'/'Block' but doesn't mandate the casing.
    switch (this.#scope.kind?.toLowerCase()) {
      case 'global':
        return Protocol.Debugger.ScopeType.Global;
      case 'block':
        return Protocol.Debugger.ScopeType.Block;
    }
    return this.#scope.kind ?? '';
  }

  typeName(): string {
    if (this.#scope.isStackFrame) {
      return this.#isInnerMostFunction ? i18nString(UIStrings.local) : i18nString(UIStrings.closure);
    }
    switch (this.#scope.kind?.toLowerCase()) {
      case 'global':
        return i18nString(UIStrings.global);
      case 'block':
        return i18nString(UIStrings.block);
    }
    return this.#scope.kind ?? '';
  }

  name(): string|undefined {
    return this.#scope.name;
  }

  range(): LocationRange|null {
    return null;
  }

  object(): RemoteObject {
    return new SourceMapScopeRemoteObject(this.#callFrame, this.#scope, this.#range, this.#scopeNumber);
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
  readonly #scope: ScopesCodec.OriginalScope;
  readonly #range?: ScopesCodec.GeneratedRange;
  readonly #scopeNumber?: number;

  constructor(callFrame: CallFrame, scope: ScopesCodec.OriginalScope, range: ScopesCodec.GeneratedRange|undefined,
              scopeNumber: number|undefined) {
    super(
        callFrame.debuggerModel.runtimeModel(), /* objectId */ undefined, 'object', /* sub type */ undefined,
        /* value */ null);
    this.#callFrame = callFrame;
    this.#scope = scope;
    this.#range = range;
    this.#scopeNumber = scopeNumber;
  }

  override async doGetProperties(_ownProperties: boolean, accessorPropertiesOnly: boolean,
                                 _nonIndexedPropertiesOnly: boolean,
                                 generatePreview: boolean): Promise<GetPropertiesResult> {
    if (accessorPropertiesOnly) {
      return {properties: [], internalProperties: []};
    }

    if (this.#scope.variables.length === 0) {
      return {properties: [], internalProperties: []};
    }

    const expressions = this.#scope.variables.map((_, index) => this.#findExpression(index));

    if (expressions.every(expr => expr === null)) {
      const properties = this.#scope.variables.map(v => SourceMapScopeRemoteObject.#unavailableProperty(v));
      return {properties, internalProperties: []};
    }

    const spreadEntries: string[] = [];
    for (const [index, expr] of expressions.entries()) {
      if (expr !== null) {
        spreadEntries.push(`...(() => { try { return {${index}: eval(${JSON.stringify(expr)})}; } catch {} })()`);
      }
    }

    const batchExpression = `({ __proto__: null, ${spreadEntries.join(', ')} })`;
    const result = await this.#callFrame.evaluate({
      expression: batchExpression,
      generatePreview: false,
      scopeNumber: this.#scopeNumber,
    });

    if ('error' in result || result.exceptionDetails || !result.object) {
      const properties = this.#scope.variables.map(v => SourceMapScopeRemoteObject.#unavailableProperty(v));
      return {properties, internalProperties: []};
    }

    const {properties: objectProperties} = await result.object.getOwnProperties(generatePreview);
    result.object.release();

    const propertyMap = new Map<string, RemoteObjectProperty>();
    if (objectProperties) {
      for (const prop of objectProperties) {
        propertyMap.set(prop.name, prop);
      }
    }

    const properties: RemoteObjectProperty[] = [];
    for (const [index, variable] of this.#scope.variables.entries()) {
      const prop = propertyMap.get(String(index));
      if (!prop || !prop.value) {
        properties.push(SourceMapScopeRemoteObject.#unavailableProperty(variable));
      } else {
        properties.push(new RemoteObjectProperty(variable, prop.value, /* enumerable */ false, /* writable */ false,
                                                 /* isOwn */ true,
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
    if (expressionOrSubRanges === null || expressionOrSubRanges === undefined) {
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

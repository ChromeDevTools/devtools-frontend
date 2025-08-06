// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the #name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';
import type {DOMPinnedWebIDLProp, DOMPinnedWebIDLType} from '../common/JavaScriptMetaData.js';

import type {DebuggerModel, FunctionDetails} from './DebuggerModel.js';
import type {RuntimeModel} from './RuntimeModel.js';

// This cannot be an interface due to "instanceof RemoteObject" checks in the code.
export abstract class RemoteObject {
  static fromLocalObject(value: unknown): RemoteObject {
    return new LocalJSONObject(value);
  }

  static type(remoteObject: RemoteObject): string {
    if (remoteObject === null) {
      return 'null';
    }

    const type = typeof remoteObject;
    if (type !== 'object' && type !== 'function') {
      return type;
    }

    return remoteObject.type;
  }

  static isNullOrUndefined(remoteObject?: RemoteObject): boolean {
    if (remoteObject === undefined) {
      return true;
    }
    switch (remoteObject.type) {
      case Protocol.Runtime.RemoteObjectType.Object:
        return remoteObject.subtype === Protocol.Runtime.RemoteObjectSubtype.Null;
      case Protocol.Runtime.RemoteObjectType.Undefined:
        return true;
      default:
        return false;
    }
  }

  static arrayNameFromDescription(description: string): string {
    return description.replace(descriptionLengthParenRegex, '').replace(descriptionLengthSquareRegex, '');
  }

  static arrayLength(object: RemoteObject|Protocol.Runtime.RemoteObject|Protocol.Runtime.ObjectPreview): number {
    if (object.subtype !== 'array' && object.subtype !== 'typedarray') {
      return 0;
    }
    // Array lengths in V8-generated descriptions switched from square brackets to parentheses.
    // Both formats are checked in case the front end is dealing with an old version of V8.
    const parenMatches = object.description?.match(descriptionLengthParenRegex);
    const squareMatches = object.description?.match(descriptionLengthSquareRegex);
    return parenMatches ? parseInt(parenMatches[1], 10) : (squareMatches ? parseInt(squareMatches[1], 10) : 0);
  }

  static arrayBufferByteLength(object: RemoteObject|Protocol.Runtime.RemoteObject|Protocol.Runtime.ObjectPreview):
      number {
    if (object.subtype !== 'arraybuffer') {
      return 0;
    }
    const matches = object.description?.match(descriptionLengthParenRegex);
    return matches ? parseInt(matches[1], 10) : 0;
  }

  static unserializableDescription(object: unknown): string|null {
    if (typeof object === 'number') {
      const description = String(object);
      if (object === 0 && 1 / object < 0) {
        return UnserializableNumber.NEGATIVE_ZERO;
      }
      if (description === UnserializableNumber.NAN || description === UnserializableNumber.INFINITY ||
          description === UnserializableNumber.NEGATIVE_INFINITY) {
        return description;
      }
    }
    if (typeof object === 'bigint') {
      return object + 'n';
    }
    return null;
  }

  static toCallArgument(object: string|number|bigint|boolean|RemoteObject|Protocol.Runtime.RemoteObject|null|undefined):
      Protocol.Runtime.CallArgument {
    const type = typeof object;
    if (type === 'undefined') {
      return {};
    }
    const unserializableDescription = RemoteObject.unserializableDescription(object);
    if (type === 'number') {
      if (unserializableDescription !== null) {
        return {unserializableValue: unserializableDescription};
      }
      return {value: object};
    }
    if (type === 'bigint') {
      return {unserializableValue: unserializableDescription ?? undefined};
    }
    if (type === 'string' || type === 'boolean') {
      return {value: object};
    }

    if (!object) {
      return {value: null};
    }

    // The unserializableValue is a function on RemoteObject's and a simple property on
    // Protocol.Runtime.RemoteObject's.
    const objectAsProtocolRemoteObject = (object as Protocol.Runtime.RemoteObject);
    if (object instanceof RemoteObject) {
      const unserializableValue = object.unserializableValue();
      if (unserializableValue !== undefined) {
        return {unserializableValue};
      }
    } else if (objectAsProtocolRemoteObject.unserializableValue !== undefined) {
      return {unserializableValue: objectAsProtocolRemoteObject.unserializableValue};
    }

    if (typeof objectAsProtocolRemoteObject.objectId !== 'undefined') {
      return {objectId: objectAsProtocolRemoteObject.objectId};
    }

    return {value: objectAsProtocolRemoteObject.value};
  }

  static async loadFromObjectPerProto(object: RemoteObject, generatePreview: boolean, nonIndexedPropertiesOnly = false):
      Promise<GetPropertiesResult> {
    const result = await Promise.all([
      object.getAllProperties(true /* accessorPropertiesOnly */, generatePreview, nonIndexedPropertiesOnly),
      object.getOwnProperties(generatePreview, nonIndexedPropertiesOnly),
    ]);
    const accessorProperties = result[0].properties;
    const ownProperties = result[1].properties;
    const internalProperties = result[1].internalProperties;
    if (!ownProperties || !accessorProperties) {
      return {properties: null, internalProperties: null};
    }
    const propertiesMap = new Map<string, RemoteObjectProperty>();
    const propertySymbols = [];
    for (let i = 0; i < accessorProperties.length; i++) {
      const property = accessorProperties[i];
      if (property.symbol) {
        propertySymbols.push(property);
      } else if (property.isOwn || property.name !== '__proto__') {
        // TODO(crbug/1076820): Eventually we should move away from
        // showing accessor #properties directly on the receiver.
        propertiesMap.set(property.name, property);
      }
    }
    for (let i = 0; i < ownProperties.length; i++) {
      const property = ownProperties[i];
      if (property.isAccessorProperty()) {
        continue;
      }
      if (property.private || property.symbol) {
        propertySymbols.push(property);
      } else {
        propertiesMap.set(property.name, property);
      }
    }
    return {
      properties: [...propertiesMap.values()].concat(propertySymbols),
      internalProperties: internalProperties ? internalProperties : null,
    };
  }

  customPreview(): Protocol.Runtime.CustomPreview|null {
    return null;
  }

  abstract get objectId(): Protocol.Runtime.RemoteObjectId|undefined;
  abstract get type(): string;

  abstract get subtype(): string|undefined;

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract get value(): any;

  abstract get description(): string|undefined;
  abstract set description(description: string|undefined);

  abstract get hasChildren(): boolean;

  abstract arrayLength(): number;

  abstract getOwnProperties(generatePreview: boolean, nonIndexedPropertiesOnly?: boolean): Promise<GetPropertiesResult>;

  abstract getAllProperties(
      accessorPropertiesOnly: boolean, generatePreview: boolean,
      nonIndexedPropertiesOnly?: boolean): Promise<GetPropertiesResult>;

  unserializableValue(): string|undefined {
    throw new Error('Not implemented');
  }

  get preview(): Protocol.Runtime.ObjectPreview|undefined {
    return undefined;
  }

  get className(): string|null {
    return null;
  }

  callFunction<T, U>(_functionDeclaration: (this: U, ...args: any[]) => T, _args?: Protocol.Runtime.CallArgument[]):
      Promise<CallFunctionResult> {
    throw new Error('Not implemented');
  }

  callFunctionJSON<T, U>(
      _functionDeclaration: (this: U, ...args: any[]) => T,
      _args: Protocol.Runtime.CallArgument[]|undefined): Promise<T|null> {
    throw new Error('Not implemented');
  }

  arrayBufferByteLength(): number {
    throw new Error('Not implemented');
  }

  deleteProperty(_name: Protocol.Runtime.CallArgument): Promise<string|undefined> {
    throw new Error('Not implemented');
  }

  setPropertyValue(_name: string|Protocol.Runtime.CallArgument, _value: string): Promise<string|undefined> {
    throw new Error('Not implemented');
  }

  release(): void {
  }

  debuggerModel(): DebuggerModel {
    throw new Error('DebuggerModel-less object');
  }

  runtimeModel(): RuntimeModel {
    throw new Error('RuntimeModel-less object');
  }

  isNode(): boolean {
    return false;
  }

  /**
   * Checks whether this object can be inspected with the Linear memory inspector.
   * @returns `true` if this object can be inspected with the Linear memory inspector.
   */
  isLinearMemoryInspectable(): boolean {
    return false;
  }

  webIdl?: RemoteObjectWebIdlTypeMetadata;
}

export class RemoteObjectImpl extends RemoteObject {
  #runtimeModel: RuntimeModel;
  readonly #runtimeAgent: ProtocolProxyApi.RuntimeApi;
  readonly #type: string;
  readonly #subtype: string|undefined;
  #objectId: Protocol.Runtime.RemoteObjectId|undefined;
  #description: string|undefined;
  #hasChildren: boolean;
  readonly #preview: Protocol.Runtime.ObjectPreview|undefined;
  readonly #unserializableValue: string|undefined;
  readonly #value: typeof RemoteObject.prototype.value;
  readonly #customPreview: Protocol.Runtime.CustomPreview|null;
  readonly #className: string|null;

  constructor(
      runtimeModel: RuntimeModel,
      objectId: Protocol.Runtime.RemoteObjectId|undefined,
      type: string,
      subtype: string|undefined,
      value: typeof RemoteObject.prototype.value,
      unserializableValue?: string,
      description?: string,
      preview?: Protocol.Runtime.ObjectPreview,
      customPreview?: Protocol.Runtime.CustomPreview,
      className?: string,
  ) {
    super();

    this.#runtimeModel = runtimeModel;
    this.#runtimeAgent = runtimeModel.target().runtimeAgent();

    this.#type = type;
    this.#subtype = subtype;
    if (objectId) {
      // handle
      this.#objectId = objectId;
      this.#description = description;
      this.#hasChildren = (type !== 'symbol');
      this.#preview = preview;
    } else {
      this.#description = description;
      if (!this.description && unserializableValue) {
        this.#description = unserializableValue;
      }
      if (!this.#description && (typeof value !== 'object' || value === null)) {
        this.#description = String(value);
      }
      this.#hasChildren = false;
      if (typeof unserializableValue === 'string') {
        this.#unserializableValue = unserializableValue;
        if (unserializableValue === UnserializableNumber.INFINITY ||
            unserializableValue === UnserializableNumber.NEGATIVE_INFINITY ||
            unserializableValue === UnserializableNumber.NEGATIVE_ZERO ||
            unserializableValue === UnserializableNumber.NAN) {
          this.#value = Number(unserializableValue);
        } else if (type === 'bigint' && unserializableValue.endsWith('n')) {
          this.#value = BigInt(unserializableValue.substring(0, unserializableValue.length - 1));
        } else {
          this.#value = unserializableValue;
        }

      } else {
        this.#value = value;
      }
    }
    this.#customPreview = customPreview || null;
    this.#className = typeof className === 'string' ? className : null;
  }

  override customPreview(): Protocol.Runtime.CustomPreview|null {
    return this.#customPreview;
  }

  override get objectId(): Protocol.Runtime.RemoteObjectId|undefined {
    return this.#objectId;
  }

  override get type(): string {
    return this.#type;
  }

  override get subtype(): string|undefined {
    return this.#subtype;
  }

  override get value(): typeof RemoteObject.prototype.value {
    return this.#value;
  }

  override unserializableValue(): string|undefined {
    return this.#unserializableValue;
  }

  override get description(): string|undefined {
    return this.#description;
  }

  override set description(description: string|undefined) {
    this.#description = description;
  }

  override get hasChildren(): boolean {
    return this.#hasChildren;
  }

  override get preview(): Protocol.Runtime.ObjectPreview|undefined {
    return this.#preview;
  }

  override get className(): string|null {
    return this.#className;
  }

  override getOwnProperties(generatePreview: boolean, nonIndexedPropertiesOnly = false): Promise<GetPropertiesResult> {
    return this.doGetProperties(true, false, nonIndexedPropertiesOnly, generatePreview);
  }

  override getAllProperties(
      accessorPropertiesOnly: boolean, generatePreview: boolean,
      nonIndexedPropertiesOnly = false): Promise<GetPropertiesResult> {
    return this.doGetProperties(false, accessorPropertiesOnly, nonIndexedPropertiesOnly, generatePreview);
  }

  async createRemoteObject(object: Protocol.Runtime.RemoteObject): Promise<RemoteObject> {
    return this.#runtimeModel.createRemoteObject(object);
  }

  async doGetProperties(
      ownProperties: boolean, accessorPropertiesOnly: boolean, nonIndexedPropertiesOnly: boolean,
      generatePreview: boolean): Promise<GetPropertiesResult> {
    if (!this.#objectId) {
      return {properties: null, internalProperties: null};
    }

    const response = await this.#runtimeAgent.invoke_getProperties({
      objectId: this.#objectId,
      ownProperties,
      accessorPropertiesOnly,
      nonIndexedPropertiesOnly,
      generatePreview,
    });
    if (response.getError()) {
      return {properties: null, internalProperties: null};
    }
    if (response.exceptionDetails) {
      this.#runtimeModel.exceptionThrown(Date.now(), response.exceptionDetails);
      return {properties: null, internalProperties: null};
    }
    const {result: properties = [], internalProperties = [], privateProperties = []} = response;
    const result = [];
    for (const property of properties) {
      const propertyValue = property.value ? await this.createRemoteObject(property.value) : null;
      const propertySymbol = property.symbol ? this.#runtimeModel.createRemoteObject(property.symbol) : null;
      const remoteProperty = new RemoteObjectProperty(
          property.name, propertyValue, Boolean(property.enumerable), Boolean(property.writable),
          Boolean(property.isOwn), Boolean(property.wasThrown), propertySymbol);

      if (typeof property.value === 'undefined') {
        if (property.get && property.get.type !== 'undefined') {
          remoteProperty.getter = this.#runtimeModel.createRemoteObject(property.get);
        }
        if (property.set && property.set.type !== 'undefined') {
          remoteProperty.setter = this.#runtimeModel.createRemoteObject(property.set);
        }
      }
      result.push(remoteProperty);
    }
    for (const property of privateProperties) {
      const propertyValue = property.value ? this.#runtimeModel.createRemoteObject(property.value) : null;
      const remoteProperty = new RemoteObjectProperty(
          property.name, propertyValue, true, true, true, false, undefined, false, undefined, true);

      if (typeof property.value === 'undefined') {
        if (property.get && property.get.type !== 'undefined') {
          remoteProperty.getter = this.#runtimeModel.createRemoteObject(property.get);
        }
        if (property.set && property.set.type !== 'undefined') {
          remoteProperty.setter = this.#runtimeModel.createRemoteObject(property.set);
        }
      }
      result.push(remoteProperty);
    }

    const internalPropertiesResult = [];
    for (const property of internalProperties) {
      if (!property.value) {
        continue;
      }
      const propertyValue = this.#runtimeModel.createRemoteObject(property.value);
      internalPropertiesResult.push(
          new RemoteObjectProperty(property.name, propertyValue, true, false, undefined, undefined, undefined, true));
    }
    return {properties: result, internalProperties: internalPropertiesResult};
  }

  override async setPropertyValue(name: string|Protocol.Runtime.CallArgument, value: string):
      Promise<string|undefined> {
    if (!this.#objectId) {
      return 'Can’t set a property of non-object.';
    }

    const response = await this.#runtimeAgent.invoke_evaluate({expression: value, silent: true});
    if (response.getError() || response.exceptionDetails) {
      return response.getError() ||
          (response.result.type !== 'string' ? response.result.description : response.result.value as string);
    }

    if (typeof name === 'string') {
      name = RemoteObject.toCallArgument(name);
    }

    const resultPromise = this.doSetObjectPropertyValue(response.result, name);

    if (response.result.objectId) {
      void this.#runtimeAgent.invoke_releaseObject({objectId: response.result.objectId});
    }

    return await resultPromise;
  }

  async doSetObjectPropertyValue(result: Protocol.Runtime.RemoteObject, name: Protocol.Runtime.CallArgument):
      Promise<string|undefined> {
    // This assignment may be for a regular (data) property, and for an accessor property (with getter/setter).
    // Note the sensitive matter about accessor property: the property may be physically defined in some proto object,
    // but logically it is bound to the object in question. JavaScript passes this object to getters/setters, not the object
    // where property was defined; so do we.
    const setPropertyValueFunction = 'function(a, b) { this[a] = b; }';

    const argv = [name, RemoteObject.toCallArgument(result)];
    const response = await this.#runtimeAgent.invoke_callFunctionOn({
      objectId: this.#objectId,
      functionDeclaration: setPropertyValueFunction,
      arguments: argv,
      silent: true,
    });
    const error = response.getError();
    return error || response.exceptionDetails ? error || response.result.description : undefined;
  }

  override async deleteProperty(name: Protocol.Runtime.CallArgument): Promise<string|undefined> {
    if (!this.#objectId) {
      return 'Can’t delete a property of non-object.';
    }

    const deletePropertyFunction = 'function(a) { delete this[a]; return !(a in this); }';
    const response = await this.#runtimeAgent.invoke_callFunctionOn({
      objectId: this.#objectId,
      functionDeclaration: deletePropertyFunction,
      arguments: [name],
      silent: true,
    });

    if (response.getError() || response.exceptionDetails) {
      return response.getError() || response.result.description;
    }

    if (!response.result.value) {
      return 'Failed to delete property.';
    }

    return undefined;
  }

  override async callFunction<T, U>(
      functionDeclaration: (this: U, ...args: any[]) => T,
      args?: Protocol.Runtime.CallArgument[]): Promise<CallFunctionResult> {
    const response = await this.#runtimeAgent.invoke_callFunctionOn({
      objectId: this.#objectId,
      functionDeclaration: functionDeclaration.toString(),
      arguments: args,
      silent: true,
    });
    if (response.getError()) {
      return {object: null, wasThrown: false};
    }
    // TODO: release exceptionDetails object
    return {
      object: this.#runtimeModel.createRemoteObject(response.result),
      wasThrown: Boolean(response.exceptionDetails),
    };
  }

  override async callFunctionJSON<T, U>(
      functionDeclaration: (this: U, ...args: any[]) => T,
      args: Protocol.Runtime.CallArgument[]|undefined): Promise<T|null> {
    const response = await this.#runtimeAgent.invoke_callFunctionOn({
      objectId: this.#objectId,
      functionDeclaration: functionDeclaration.toString(),
      arguments: args,
      silent: true,
      returnByValue: true,
    });
    if (response.getError() || response.exceptionDetails) {
      return null;
    }

    return response.result.value;
  }

  override release(): void {
    if (!this.#objectId) {
      return;
    }
    void this.#runtimeAgent.invoke_releaseObject({objectId: this.#objectId});
  }

  override arrayLength(): number {
    return RemoteObject.arrayLength(this);
  }

  override arrayBufferByteLength(): number {
    return RemoteObject.arrayBufferByteLength(this);
  }

  override debuggerModel(): DebuggerModel {
    return this.#runtimeModel.debuggerModel();
  }

  override runtimeModel(): RuntimeModel {
    return this.#runtimeModel;
  }

  override isNode(): boolean {
    return Boolean(this.#objectId) && this.type === 'object' && this.subtype === 'node';
  }

  override isLinearMemoryInspectable(): boolean {
    return this.type === 'object' && this.subtype !== undefined &&
        ['webassemblymemory', 'typedarray', 'dataview', 'arraybuffer'].includes(this.subtype);
  }
}

export class ScopeRemoteObject extends RemoteObjectImpl {
  readonly #scopeRef: ScopeRef;
  #savedScopeProperties: RemoteObjectProperty[]|undefined;

  constructor(
      runtimeModel: RuntimeModel, objectId: Protocol.Runtime.RemoteObjectId|undefined, scopeRef: ScopeRef, type: string,
      subtype: string|undefined, value: typeof RemoteObjectImpl.prototype.value, unserializableValue?: string,
      description?: string, preview?: Protocol.Runtime.ObjectPreview) {
    super(runtimeModel, objectId, type, subtype, value, unserializableValue, description, preview);
    this.#scopeRef = scopeRef;
    this.#savedScopeProperties = undefined;
  }

  override async doGetProperties(ownProperties: boolean, accessorPropertiesOnly: boolean, _generatePreview: boolean):
      Promise<GetPropertiesResult> {
    if (accessorPropertiesOnly) {
      return {properties: [], internalProperties: []};
    }

    if (this.#savedScopeProperties) {
      // No need to reload scope variables, as the remote object never
      // changes its #properties. If variable is updated, the #properties
      // array is patched locally.
      return {properties: this.#savedScopeProperties.slice(), internalProperties: null};
    }

    const allProperties = await super.doGetProperties(
        ownProperties, accessorPropertiesOnly, false /* nonIndexedPropertiesOnly */, true /* generatePreview */);
    if (Array.isArray(allProperties.properties)) {
      this.#savedScopeProperties = allProperties.properties.slice();
    }
    return allProperties;
  }

  override async doSetObjectPropertyValue(
      result: Protocol.Runtime.RemoteObject, argumentName: Protocol.Runtime.CallArgument): Promise<string|undefined> {
    const name = (argumentName.value as string);
    const error = await this.debuggerModel().setVariableValue(
        this.#scopeRef.number, name, RemoteObject.toCallArgument(result), this.#scopeRef.callFrameId);
    if (error) {
      return error;
    }
    if (this.#savedScopeProperties) {
      for (const property of this.#savedScopeProperties) {
        if (property.name === name) {
          property.value = this.runtimeModel().createRemoteObject(result);
        }
      }
    }
    return;
  }
}

export class ScopeRef {
  readonly number: number;
  readonly callFrameId: Protocol.Debugger.CallFrameId;

  constructor(number: number, callFrameId: Protocol.Debugger.CallFrameId) {
    this.number = number;
    this.callFrameId = callFrameId;
  }
}

export class RemoteObjectProperty {
  name: string;
  value?: RemoteObject;
  enumerable: boolean;
  writable: boolean;
  isOwn: boolean;
  wasThrown: boolean;
  symbol: RemoteObject|undefined;
  synthetic: boolean;
  syntheticSetter: ((arg0: string) => Promise<RemoteObject|null>)|undefined;

  private: boolean;
  getter: RemoteObject|undefined;
  setter: RemoteObject|undefined;

  webIdl?: RemoteObjectWebIdlPropertyMetadata;

  constructor(
      name: string, value: RemoteObject|null, enumerable?: boolean, writable?: boolean, isOwn?: boolean,
      wasThrown?: boolean, symbol?: RemoteObject|null, synthetic?: boolean,
      syntheticSetter?: ((arg0: string) => Promise<RemoteObject|null>), isPrivate?: boolean) {
    this.name = name;
    this.value = value !== null ? value : undefined;
    this.enumerable = typeof enumerable !== 'undefined' ? enumerable : true;
    const isNonSyntheticOrSyntheticWritable = !synthetic || Boolean(syntheticSetter);
    this.writable = typeof writable !== 'undefined' ? writable : isNonSyntheticOrSyntheticWritable;
    this.isOwn = Boolean(isOwn);
    this.wasThrown = Boolean(wasThrown);
    if (symbol) {
      this.symbol = symbol;
    }
    this.synthetic = Boolean(synthetic);
    if (syntheticSetter) {
      this.syntheticSetter = syntheticSetter;
    }
    this.private = Boolean(isPrivate);
  }

  async setSyntheticValue(expression: string): Promise<boolean> {
    if (!this.syntheticSetter) {
      return false;
    }
    const result = await this.syntheticSetter(expression);
    if (result) {
      this.value = result;
    }
    return Boolean(result);
  }

  isAccessorProperty(): boolean {
    return Boolean(this.getter || this.setter);
  }

  match({includeNullOrUndefinedValues, regex}: {includeNullOrUndefinedValues: boolean, regex: RegExp|null}): boolean {
    if (regex !== null) {
      if (!regex.test(this.name) && !regex.test(this.value?.description ?? '')) {
        return false;
      }
    }
    if (!includeNullOrUndefinedValues) {
      if (!this.isAccessorProperty() && RemoteObject.isNullOrUndefined(this.value)) {
        return false;
      }
    }
    return true;
  }

  cloneWithNewName(newName: string): RemoteObjectProperty {
    const property = new RemoteObjectProperty(
        newName, this.value ?? null, this.enumerable, this.writable, this.isOwn, this.wasThrown, this.symbol,
        this.synthetic, this.syntheticSetter, this.private);
    property.getter = this.getter;
    property.setter = this.setter;
    return property;
  }
}

// Below is a wrapper around a local object that implements the RemoteObject interface,
// which can be used by the UI code (primarily ObjectPropertiesSection).
// Note that only JSON-compliant objects are currently supported, as there's no provision
// for traversing prototypes, extracting class names via constructor, handling #properties
// or functions.

export class LocalJSONObject extends RemoteObject {
  #value: typeof RemoteObject.prototype.value;
  #cachedDescription!: string;
  #cachedChildren!: RemoteObjectProperty[];

  constructor(value: typeof RemoteObject.prototype.value) {
    super();
    this.#value = value;
  }

  override get objectId(): Protocol.Runtime.RemoteObjectId|undefined {
    return undefined;
  }

  override get value(): typeof RemoteObject.prototype.value {
    return this.#value;
  }

  override unserializableValue(): string|undefined {
    const unserializableDescription = RemoteObject.unserializableDescription(this.#value);
    return unserializableDescription || undefined;
  }

  override get description(): string {
    if (this.#cachedDescription) {
      return this.#cachedDescription;
    }

    function formatArrayItem(this: LocalJSONObject, property: RemoteObjectProperty): string {
      return this.formatValue(property.value || null);
    }

    function formatObjectItem(this: LocalJSONObject, property: RemoteObjectProperty): string {
      let name: string = property.name;
      if (/^\s|\s$|^$|\n/.test(name)) {
        name = '"' + name.replace(/\n/g, '\u21B5') + '"';
      }
      return name + ': ' + this.formatValue(property.value || null);
    }

    if (this.type === 'object') {
      switch (this.subtype) {
        case 'array':
          this.#cachedDescription = this.concatenate('[', ']', formatArrayItem.bind(this));
          break;
        case 'date':
          this.#cachedDescription = String(this.#value);
          break;
        case 'null':
          this.#cachedDescription = 'null';
          break;
        default:
          this.#cachedDescription = this.concatenate('{', '}', formatObjectItem.bind(this));
      }
    } else {
      this.#cachedDescription = String(this.#value);
    }

    return this.#cachedDescription;
  }

  private formatValue(value: RemoteObject|null): string {
    if (!value) {
      return 'undefined';
    }
    const description = value.description || '';
    if (value.type === 'string') {
      return '"' + description.replace(/\n/g, '\u21B5') + '"';
    }
    return description;
  }

  private concatenate(prefix: string, suffix: string, formatProperty: (arg0: RemoteObjectProperty) => string): string {
    const previewChars = 100;

    let buffer = prefix;
    const children = this.children();
    for (let i = 0; i < children.length; ++i) {
      const itemDescription = formatProperty(children[i]);
      if (buffer.length + itemDescription.length > previewChars) {
        buffer += ',…';
        break;
      }
      if (i) {
        buffer += ', ';
      }
      buffer += itemDescription;
    }
    buffer += suffix;
    return buffer;
  }

  override get type(): string {
    return typeof this.#value;
  }

  override get subtype(): string|undefined {
    if (this.#value === null) {
      return 'null';
    }

    if (Array.isArray(this.#value)) {
      return 'array';
    }

    if (this.#value instanceof Date) {
      return 'date';
    }

    return undefined;
  }

  override get hasChildren(): boolean {
    if ((typeof this.#value !== 'object') || (this.#value === null)) {
      return false;
    }
    return Boolean(Object.keys(this.#value).length);
  }

  override async getOwnProperties(_generatePreview: boolean, nonIndexedPropertiesOnly = false):
      Promise<GetPropertiesResult> {
    function isArrayIndex(name: string): boolean {
      const index = Number(name) >>> 0;
      return String(index) === name;
    }

    let properties = this.children();
    if (nonIndexedPropertiesOnly) {
      properties = properties.filter(property => !isArrayIndex(property.name));
    }
    return {properties, internalProperties: null};
  }

  override async getAllProperties(
      accessorPropertiesOnly: boolean, generatePreview: boolean,
      nonIndexedPropertiesOnly = false): Promise<GetPropertiesResult> {
    if (accessorPropertiesOnly) {
      return {properties: [], internalProperties: null};
    }
    return await this.getOwnProperties(generatePreview, nonIndexedPropertiesOnly);
  }

  private children(): RemoteObjectProperty[] {
    if (!this.hasChildren) {
      return [];
    }
    if (!this.#cachedChildren) {
      this.#cachedChildren = Object.entries(this.#value).map(([name, value]) => {
        return new RemoteObjectProperty(
            name, value instanceof RemoteObject ? value : RemoteObject.fromLocalObject(value));
      });
    }
    return this.#cachedChildren;
  }

  override arrayLength(): number {
    return Array.isArray(this.#value) ? this.#value.length : 0;
  }

  override async callFunction<T, U>(
      functionDeclaration: (this: U, ...args: any[]) => T,
      args?: Protocol.Runtime.CallArgument[]): Promise<CallFunctionResult> {
    const target = this.#value as U;
    const rawArgs = args ? args.map(arg => arg.value) : [];

    let result;
    let wasThrown = false;
    try {
      result = functionDeclaration.apply(target, rawArgs);
    } catch {
      wasThrown = true;
    }

    const object = RemoteObject.fromLocalObject(result);

    return {object, wasThrown};
  }

  override async callFunctionJSON<T, U>(
      functionDeclaration: (this: U, ...args: any[]) => T,
      args: Protocol.Runtime.CallArgument[]|undefined): Promise<T|null> {
    const target = this.#value as U;
    const rawArgs = args ? args.map(arg => arg.value) : [];

    let result;
    try {
      result = functionDeclaration.apply(target, rawArgs);
    } catch {
      result = null;
    }

    return result;
  }
}

export class RemoteArrayBuffer {
  readonly #object: RemoteObject;
  constructor(object: RemoteObject) {
    if (object.type !== 'object' || object.subtype !== 'arraybuffer') {
      throw new Error('Object is not an arraybuffer');
    }
    this.#object = object;
  }

  byteLength(): number {
    return this.#object.arrayBufferByteLength();
  }

  async bytes(start = 0, end = this.byteLength()): Promise<number[]|null> {
    if (start < 0 || start >= this.byteLength()) {
      throw new RangeError('start is out of range');
    }
    if (end < start || end > this.byteLength()) {
      throw new RangeError('end is out of range');
    }
    return await this.#object.callFunctionJSON(bytes, [{value: start}, {value: end - start}]);

    function bytes(this: ArrayBuffer, offset: number, length: number): number[] {
      return [...new Uint8Array(this, offset, length)];
    }
  }

  object(): RemoteObject {
    return this.#object;
  }
}

export class RemoteArray {
  readonly #object: RemoteObject;
  constructor(object: RemoteObject) {
    this.#object = object;
  }

  static objectAsArray(object: RemoteObject|null): RemoteArray {
    if (!object || object.type !== 'object' || (object.subtype !== 'array' && object.subtype !== 'typedarray')) {
      throw new Error('Object is empty or not an array');
    }
    return new RemoteArray(object);
  }

  static async createFromRemoteObjects(objects: RemoteObject[]): Promise<RemoteArray> {
    if (!objects.length) {
      throw new Error('Input array is empty');
    }
    const result = await objects[0].callFunction(createArray, objects.map(RemoteObject.toCallArgument));
    if (result.wasThrown || !result.object) {
      throw new Error('Call function throws exceptions or returns empty value');
    }
    return RemoteArray.objectAsArray(result.object);

    function createArray<T>(...args: T[]): T[] {
      return args;
    }
  }

  async at(index: number): Promise<RemoteObject> {
    if (index < 0 || index > this.#object.arrayLength()) {
      throw new Error('Out of range');
    }
    const result = await this.#object.callFunction<unknown, unknown[]>(at, [RemoteObject.toCallArgument(index)]);
    if (result.wasThrown || !result.object) {
      throw new Error('Exception in callFunction or result value is empty');
    }
    return result.object;

    function at<T>(this: T[], index: number): T {
      return this[index];
    }
  }

  length(): number {
    return this.#object.arrayLength();
  }

  map<T>(func: (arg0: RemoteObject) => Promise<T>): Promise<T[]> {
    const promises = [];
    for (let i = 0; i < this.length(); ++i) {
      promises.push(this.at(i).then(func));
    }
    return Promise.all(promises);
  }

  object(): RemoteObject {
    return this.#object;
  }
}

export class RemoteFunction {
  readonly #object: RemoteObject;

  constructor(object: RemoteObject) {
    this.#object = object;
  }

  static objectAsFunction(object: RemoteObject): RemoteFunction {
    if (object.type !== 'function') {
      throw new Error('Object is empty or not a function');
    }
    return new RemoteFunction(object);
  }

  async targetFunction(): Promise<RemoteObject> {
    const ownProperties = await this.#object.getOwnProperties(false /* generatePreview */);
    const targetFunction = ownProperties.internalProperties?.find(({name}) => name === '[[TargetFunction]]');
    return targetFunction?.value ?? this.#object;
  }

  async targetFunctionDetails(): Promise<FunctionDetails|null> {
    const targetFunction = await this.targetFunction();
    const functionDetails = await targetFunction.debuggerModel().functionDetailsPromise(targetFunction);
    if (this.#object !== targetFunction) {
      targetFunction.release();
    }
    return functionDetails;
  }
}

export class RemoteError {
  readonly #object: RemoteObject;

  #exceptionDetails?: Promise<Protocol.Runtime.ExceptionDetails|undefined>;
  #cause?: Promise<RemoteObject|undefined>;

  private constructor(object: RemoteObject) {
    this.#object = object;
  }

  static objectAsError(object: RemoteObject): RemoteError {
    if (object.subtype !== 'error') {
      throw new Error(`Object of type ${object.subtype} is not an error`);
    }
    return new RemoteError(object);
  }

  get errorStack(): string {
    return this.#object.description ?? '';
  }

  exceptionDetails(): Promise<Protocol.Runtime.ExceptionDetails|undefined> {
    if (!this.#exceptionDetails) {
      this.#exceptionDetails = this.#lookupExceptionDetails();
    }
    return this.#exceptionDetails;
  }

  #lookupExceptionDetails(): Promise<Protocol.Runtime.ExceptionDetails|undefined> {
    if (this.#object.objectId) {
      return this.#object.runtimeModel().getExceptionDetails(this.#object.objectId);
    }
    return Promise.resolve(undefined);
  }

  cause(): Promise<RemoteObject|undefined> {
    if (!this.#cause) {
      this.#cause = this.#lookupCause();
    }
    return this.#cause;
  }

  async #lookupCause(): Promise<RemoteObject|undefined> {
    const allProperties =
        await this.#object.getAllProperties(false /* accessorPropertiesOnly */, false /* generatePreview */);
    const cause = allProperties.properties?.find(prop => prop.name === 'cause');

    return cause?.value;
  }
}

const descriptionLengthParenRegex = /\(([0-9]+)\)/;
const descriptionLengthSquareRegex = /\[([0-9]+)\]/;

const enum UnserializableNumber {
  NEGATIVE_ZERO = ('-0'),
  NAN = ('NaN'),
  INFINITY = ('Infinity'),
  NEGATIVE_INFINITY = ('-Infinity'),
}

export interface CallFunctionResult {
  object: RemoteObject|null;
  wasThrown?: boolean;
}

export interface GetPropertiesResult {
  properties: RemoteObjectProperty[]|null;
  internalProperties: RemoteObjectProperty[]|null;
}

export interface RemoteObjectWebIdlTypeMetadata {
  info: DOMPinnedWebIDLType;
  state: Map<string, string>;
}

export interface RemoteObjectWebIdlPropertyMetadata {
  info: DOMPinnedWebIDLProp;
  applicable?: boolean;
}

/**
 * Pair of a linear memory inspectable {@link RemoteObject} and an optional
 * expression, which identifies the variable holding the object in the
 * current scope or the name of the field holding the object.
 *
 * This data structure is used to reveal an object in the Linear Memory
 * Inspector panel.
 */
export class LinearMemoryInspectable {
  /** The linear memory inspectable {@link RemoteObject}. */
  readonly object: RemoteObject;
  /** The name of the variable or the field holding the `object`. */
  readonly expression: string|undefined;

  /**
   * Wrap `object` and `expression` into a reveable structure.
   *
   * @param object A linear memory inspectable {@link RemoteObject}.
   * @param expression An optional name of the field or variable holding the `object`.
   */
  constructor(object: RemoteObject, expression?: string) {
    if (!object.isLinearMemoryInspectable()) {
      throw new Error('object must be linear memory inspectable');
    }
    this.object = object;
    this.expression = expression;
  }
}

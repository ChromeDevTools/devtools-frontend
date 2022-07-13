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
import {type DOMPinnedWebIDLProp, type DOMPinnedWebIDLType} from '../common/JavaScriptMetaData.js';

import {type DebuggerModel, type FunctionDetails} from './DebuggerModel.js';
import {type RuntimeModel} from './RuntimeModel.js';

export class RemoteObject {
  /**
   * This may not be an interface due to "instanceof RemoteObject" checks in the code.
   */

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromLocalObject(value: any): RemoteObject {
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
    return description.replace(_descriptionLengthParenRegex, '').replace(_descriptionLengthSquareRegex, '');
  }

  static arrayLength(object: RemoteObject|Protocol.Runtime.RemoteObject|Protocol.Runtime.ObjectPreview): number {
    if (object.subtype !== 'array' && object.subtype !== 'typedarray') {
      return 0;
    }
    // Array lengths in V8-generated descriptions switched from square brackets to parentheses.
    // Both formats are checked in case the front end is dealing with an old version of V8.
    const parenMatches = object.description && object.description.match(_descriptionLengthParenRegex);
    const squareMatches = object.description && object.description.match(_descriptionLengthSquareRegex);
    return parenMatches ? parseInt(parenMatches[1], 10) : (squareMatches ? parseInt(squareMatches[1], 10) : 0);
  }

  static arrayBufferByteLength(object: RemoteObject|Protocol.Runtime.RemoteObject|
                               Protocol.Runtime.ObjectPreview): number {
    if (object.subtype !== 'arraybuffer') {
      return 0;
    }
    const matches = object.description && object.description.match(_descriptionLengthParenRegex);
    return matches ? parseInt(matches[1], 10) : 0;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static unserializableDescription(object: any): string|null {
    const type = typeof object;
    if (type === 'number') {
      const description = String(object);
      if (object === 0 && 1 / object < 0) {
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
        // @ts-expect-error
        return UnserializableNumber.Negative0;
      }
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // @ts-expect-error
      if (description === UnserializableNumber.NaN || description === UnserializableNumber.Infinity ||
          // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
          // @ts-expect-error
          description === UnserializableNumber.NegativeInfinity) {
        return description;
      }
    }
    if (type === 'bigint') {
      return object + 'n';
    }
    return null;
  }

  static toCallArgument(object: string|number|bigint|boolean|RemoteObject|Protocol.Runtime.RemoteObject|null|
                        undefined): Protocol.Runtime.CallArgument {
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
      return {unserializableValue: (unserializableDescription as string)};
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
        return {unserializableValue: unserializableValue};
      }
    } else if (objectAsProtocolRemoteObject.unserializableValue !== undefined) {
      return {unserializableValue: objectAsProtocolRemoteObject.unserializableValue};
    }

    if (typeof objectAsProtocolRemoteObject.objectId !== 'undefined') {
      return {objectId: objectAsProtocolRemoteObject.objectId};
    }

    return {value: objectAsProtocolRemoteObject.value};
  }

  static async loadFromObjectPerProto(
      object: RemoteObject, generatePreview: boolean,
      nonIndexedPropertiesOnly: boolean = false): Promise<GetPropertiesResult> {
    const result = await Promise.all([
      object.getAllProperties(true /* accessorPropertiesOnly */, generatePreview, nonIndexedPropertiesOnly),
      object.getOwnProperties(generatePreview, nonIndexedPropertiesOnly),
    ]);
    const accessorProperties = result[0].properties;
    const ownProperties = result[1].properties;
    const internalProperties = result[1].internalProperties;
    if (!ownProperties || !accessorProperties) {
      return {properties: null, internalProperties: null} as GetPropertiesResult;
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

  get objectId(): Protocol.Runtime.RemoteObjectId|undefined {
    // TODO(crbug.com/1226471): Return undefined here.
    return 'Not implemented' as Protocol.Runtime.RemoteObjectId;
  }

  get type(): string {
    throw 'Not implemented';
  }

  get subtype(): string|undefined {
    throw 'Not implemented';
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get value(): any {
    throw 'Not implemented';
  }

  unserializableValue(): string|undefined {
    throw 'Not implemented';
  }

  get description(): string|undefined {
    throw 'Not implemented';
  }

  set description(description: string|undefined) {
    throw 'Not implemented';
  }

  get hasChildren(): boolean {
    throw 'Not implemented';
  }

  get preview(): Protocol.Runtime.ObjectPreview|undefined {
    return undefined;
  }

  get className(): string|null {
    return null;
  }

  arrayLength(): number {
    throw 'Not implemented';
  }

  arrayBufferByteLength(): number {
    throw 'Not implemented';
  }

  getOwnProperties(_generatePreview: boolean, _nonIndexedPropertiesOnly?: boolean): Promise<GetPropertiesResult> {
    throw 'Not implemented';
  }

  getAllProperties(_accessorPropertiesOnly: boolean, _generatePreview: boolean, _nonIndexedPropertiesOnly?: boolean):
      Promise<GetPropertiesResult> {
    throw 'Not implemented';
  }

  async deleteProperty(_name: Protocol.Runtime.CallArgument): Promise<string|undefined> {
    throw 'Not implemented';
  }

  async setPropertyValue(_name: string|Protocol.Runtime.CallArgument, _value: string): Promise<string|undefined> {
    throw 'Not implemented';
  }

  callFunction<T>(
      _functionDeclaration: (this: Object, ...arg1: unknown[]) => T,
      _args?: Protocol.Runtime.CallArgument[]): Promise<CallFunctionResult> {
    throw 'Not implemented';
  }

  callFunctionJSON<T>(
      _functionDeclaration: (this: Object, ...arg1: unknown[]) => T,
      _args: Protocol.Runtime.CallArgument[]|undefined): Promise<T> {
    throw 'Not implemented';
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

  webIdl?: RemoteObjectWebIdlTypeMetadata;
}

export class RemoteObjectImpl extends RemoteObject {
  runtimeModelInternal: RuntimeModel;
  readonly #runtimeAgent: ProtocolProxyApi.RuntimeApi;
  readonly #typeInternal: string;
  readonly #subtypeInternal: string|undefined;
  #objectIdInternal: Protocol.Runtime.RemoteObjectId|undefined;
  #descriptionInternal: string|undefined;
  hasChildrenInternal: boolean;
  readonly #previewInternal: Protocol.Runtime.ObjectPreview|undefined;
  readonly #unserializableValueInternal: string|undefined;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly #valueInternal: any;
  readonly #customPreviewInternal: Protocol.Runtime.CustomPreview|null;
  readonly #classNameInternal: string|null;

  constructor(
      runtimeModel: RuntimeModel, objectId: Protocol.Runtime.RemoteObjectId|undefined, type: string,
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subtype: string|undefined, value: any, unserializableValue?: string, description?: string,
      preview?: Protocol.Runtime.ObjectPreview, customPreview?: Protocol.Runtime.CustomPreview, className?: string) {
    super();

    this.runtimeModelInternal = runtimeModel;
    this.#runtimeAgent = runtimeModel.target().runtimeAgent();

    this.#typeInternal = type;
    this.#subtypeInternal = subtype;
    if (objectId) {
      // handle
      this.#objectIdInternal = objectId;
      this.#descriptionInternal = description;
      this.hasChildrenInternal = (type !== 'symbol');
      this.#previewInternal = preview;
    } else {
      this.#descriptionInternal = description;
      if (!this.description && unserializableValue) {
        this.#descriptionInternal = unserializableValue;
      }
      if (!this.#descriptionInternal && (typeof value !== 'object' || value === null)) {
        this.#descriptionInternal = String(value);
      }
      this.hasChildrenInternal = false;
      if (typeof unserializableValue === 'string') {
        this.#unserializableValueInternal = unserializableValue;
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
        // @ts-expect-error
        if (unserializableValue === UnserializableNumber.Infinity ||
            // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
            // @ts-expect-error
            unserializableValue === UnserializableNumber.NegativeInfinity ||
            // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
            // @ts-expect-error
            unserializableValue === UnserializableNumber.Negative0 ||
            // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
            // @ts-expect-error
            unserializableValue === UnserializableNumber.NaN) {
          this.#valueInternal = Number(unserializableValue);
        } else if (type === 'bigint' && unserializableValue.endsWith('n')) {
          this.#valueInternal = BigInt(unserializableValue.substring(0, unserializableValue.length - 1));
        } else {
          this.#valueInternal = unserializableValue;
        }

      } else {
        this.#valueInternal = value;
      }
    }
    this.#customPreviewInternal = customPreview || null;
    this.#classNameInternal = typeof className === 'string' ? className : null;
  }

  customPreview(): Protocol.Runtime.CustomPreview|null {
    return this.#customPreviewInternal;
  }

  get objectId(): Protocol.Runtime.RemoteObjectId|undefined {
    return this.#objectIdInternal;
  }

  get type(): string {
    return this.#typeInternal;
  }

  get subtype(): string|undefined {
    return this.#subtypeInternal;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get value(): any {
    return this.#valueInternal;
  }

  unserializableValue(): string|undefined {
    return this.#unserializableValueInternal;
  }

  get description(): string|undefined {
    return this.#descriptionInternal;
  }

  set description(description: string|undefined) {
    this.#descriptionInternal = description;
  }

  get hasChildren(): boolean {
    return this.hasChildrenInternal;
  }

  get preview(): Protocol.Runtime.ObjectPreview|undefined {
    return this.#previewInternal;
  }

  get className(): string|null {
    return this.#classNameInternal;
  }

  getOwnProperties(generatePreview: boolean, nonIndexedPropertiesOnly: boolean = false): Promise<GetPropertiesResult> {
    return this.doGetProperties(true, false, nonIndexedPropertiesOnly, generatePreview);
  }

  getAllProperties(
      accessorPropertiesOnly: boolean, generatePreview: boolean,
      nonIndexedPropertiesOnly: boolean = false): Promise<GetPropertiesResult> {
    return this.doGetProperties(false, accessorPropertiesOnly, nonIndexedPropertiesOnly, generatePreview);
  }

  async createRemoteObject(object: Protocol.Runtime.RemoteObject): Promise<RemoteObject> {
    return this.runtimeModelInternal.createRemoteObject(object);
  }

  async doGetProperties(
      ownProperties: boolean, accessorPropertiesOnly: boolean, nonIndexedPropertiesOnly: boolean,
      generatePreview: boolean): Promise<GetPropertiesResult> {
    if (!this.#objectIdInternal) {
      return {properties: null, internalProperties: null} as GetPropertiesResult;
    }

    const response = await this.#runtimeAgent.invoke_getProperties({
      objectId: this.#objectIdInternal,
      ownProperties,
      accessorPropertiesOnly,
      nonIndexedPropertiesOnly,
      generatePreview,
    });
    if (response.getError()) {
      return {properties: null, internalProperties: null} as GetPropertiesResult;
    }
    if (response.exceptionDetails) {
      this.runtimeModelInternal.exceptionThrown(Date.now(), response.exceptionDetails);
      return {properties: null, internalProperties: null} as GetPropertiesResult;
    }
    const {result: properties = [], internalProperties = [], privateProperties = []} = response;
    const result = [];
    for (const property of properties) {
      const propertyValue = property.value ? await this.createRemoteObject(property.value) : null;
      const propertySymbol = property.symbol ? this.runtimeModelInternal.createRemoteObject(property.symbol) : null;
      const remoteProperty = new RemoteObjectProperty(
          property.name, propertyValue, Boolean(property.enumerable), Boolean(property.writable),
          Boolean(property.isOwn), Boolean(property.wasThrown), propertySymbol);

      if (typeof property.value === 'undefined') {
        if (property.get && property.get.type !== 'undefined') {
          remoteProperty.getter = this.runtimeModelInternal.createRemoteObject(property.get);
        }
        if (property.set && property.set.type !== 'undefined') {
          remoteProperty.setter = this.runtimeModelInternal.createRemoteObject(property.set);
        }
      }
      result.push(remoteProperty);
    }
    for (const property of privateProperties) {
      const propertyValue = property.value ? this.runtimeModelInternal.createRemoteObject(property.value) : null;
      const remoteProperty = new RemoteObjectProperty(
          property.name, propertyValue, true, true, true, false, undefined, false, undefined, true);

      if (typeof property.value === 'undefined') {
        if (property.get && property.get.type !== 'undefined') {
          remoteProperty.getter = this.runtimeModelInternal.createRemoteObject(property.get);
        }
        if (property.set && property.set.type !== 'undefined') {
          remoteProperty.setter = this.runtimeModelInternal.createRemoteObject(property.set);
        }
      }
      result.push(remoteProperty);
    }

    const internalPropertiesResult = [];
    for (const property of internalProperties) {
      if (!property.value) {
        continue;
      }
      if (property.name === '[[StableObjectId]]') {
        continue;
      }
      const propertyValue = this.runtimeModelInternal.createRemoteObject(property.value);
      internalPropertiesResult.push(
          new RemoteObjectProperty(property.name, propertyValue, true, false, undefined, undefined, undefined, true));
    }
    return {properties: result, internalProperties: internalPropertiesResult};
  }

  async setPropertyValue(name: string|Protocol.Runtime.CallArgument, value: string): Promise<string|undefined> {
    if (!this.#objectIdInternal) {
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

    return resultPromise;
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
      objectId: this.#objectIdInternal,
      functionDeclaration: setPropertyValueFunction,
      arguments: argv,
      silent: true,
    });
    const error = response.getError();
    return error || response.exceptionDetails ? error || response.result.description : undefined;
  }

  async deleteProperty(name: Protocol.Runtime.CallArgument): Promise<string|undefined> {
    if (!this.#objectIdInternal) {
      return 'Can’t delete a property of non-object.';
    }

    const deletePropertyFunction = 'function(a) { delete this[a]; return !(a in this); }';
    const response = await this.#runtimeAgent.invoke_callFunctionOn({
      objectId: this.#objectIdInternal,
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

  async callFunction<T>(
      functionDeclaration: (this: Object, ...arg1: unknown[]) => T,
      args?: Protocol.Runtime.CallArgument[]): Promise<CallFunctionResult> {
    const response = await this.#runtimeAgent.invoke_callFunctionOn({
      objectId: this.#objectIdInternal,
      functionDeclaration: functionDeclaration.toString(),
      arguments: args,
      silent: true,
    });
    if (response.getError()) {
      return {object: null, wasThrown: false};
    }
    // TODO: release exceptionDetails object
    return {
      object: this.runtimeModelInternal.createRemoteObject(response.result),
      wasThrown: Boolean(response.exceptionDetails),
    };
  }

  async callFunctionJSON<T>(
      functionDeclaration: (this: Object, ...arg1: unknown[]) => T,
      args: Protocol.Runtime.CallArgument[]|undefined): Promise<T> {
    const response = await this.#runtimeAgent.invoke_callFunctionOn({
      objectId: this.#objectIdInternal,
      functionDeclaration: functionDeclaration.toString(),
      arguments: args,
      silent: true,
      returnByValue: true,
    });

    return response.getError() || response.exceptionDetails ? null : response.result.value;
  }

  release(): void {
    if (!this.#objectIdInternal) {
      return;
    }
    void this.#runtimeAgent.invoke_releaseObject({objectId: this.#objectIdInternal});
  }

  arrayLength(): number {
    return RemoteObject.arrayLength(this);
  }

  arrayBufferByteLength(): number {
    return RemoteObject.arrayBufferByteLength(this);
  }

  debuggerModel(): DebuggerModel {
    return this.runtimeModelInternal.debuggerModel();
  }

  runtimeModel(): RuntimeModel {
    return this.runtimeModelInternal;
  }

  isNode(): boolean {
    return Boolean(this.#objectIdInternal) && this.type === 'object' && this.subtype === 'node';
  }
}

export class ScopeRemoteObject extends RemoteObjectImpl {
  #scopeRef: ScopeRef;
  #savedScopeProperties: RemoteObjectProperty[]|undefined;

  constructor(
      runtimeModel: RuntimeModel, objectId: Protocol.Runtime.RemoteObjectId|undefined, scopeRef: ScopeRef, type: string,
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subtype: string|undefined, value: any, unserializableValue?: string, description?: string,
      preview?: Protocol.Runtime.ObjectPreview) {
    super(runtimeModel, objectId, type, subtype, value, unserializableValue, description, preview);
    this.#scopeRef = scopeRef;
    this.#savedScopeProperties = undefined;
  }

  async doGetProperties(ownProperties: boolean, accessorPropertiesOnly: boolean, _generatePreview: boolean):
      Promise<GetPropertiesResult> {
    if (accessorPropertiesOnly) {
      return {properties: [], internalProperties: []} as GetPropertiesResult;
    }

    if (this.#savedScopeProperties) {
      // No need to reload scope variables, as the remote object never
      // changes its #properties. If variable is updated, the #properties
      // array is patched locally.
      return {properties: this.#savedScopeProperties.slice(), internalProperties: null};
    }

    const allProperties = await super.doGetProperties(
        ownProperties, accessorPropertiesOnly, false /* nonIndexedPropertiesOnly */, true /* generatePreview */);
    if (this.#scopeRef && Array.isArray(allProperties.properties)) {
      this.#savedScopeProperties = allProperties.properties.slice();
      if (!this.#scopeRef.callFrameId) {
        for (const property of this.#savedScopeProperties) {
          property.writable = false;
        }
      }
    }
    return allProperties;
  }

  async doSetObjectPropertyValue(result: Protocol.Runtime.RemoteObject, argumentName: Protocol.Runtime.CallArgument):
      Promise<string|undefined> {
    const name = (argumentName.value as string);
    const error = await this.debuggerModel().setVariableValue(
        this.#scopeRef.number, name, RemoteObject.toCallArgument(result),
        (this.#scopeRef.callFrameId as Protocol.Debugger.CallFrameId));
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
  number: number;
  callFrameId: Protocol.Debugger.CallFrameId|undefined;
  constructor(number: number, callFrameId?: Protocol.Debugger.CallFrameId) {
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
}

// Below is a wrapper around a local object that implements the RemoteObject interface,
// which can be used by the UI code (primarily ObjectPropertiesSection).
// Note that only JSON-compliant objects are currently supported, as there's no provision
// for traversing prototypes, extracting class names via constructor, handling #properties
// or functions.

export class LocalJSONObject extends RemoteObject {
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  valueInternal: any;
  #cachedDescription!: string;
  #cachedChildren!: RemoteObjectProperty[];

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(value: any) {
    super();
    this.valueInternal = value;
  }

  get objectId(): Protocol.Runtime.RemoteObjectId|undefined {
    return undefined;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get value(): any {
    return this.valueInternal;
  }

  unserializableValue(): string|undefined {
    const unserializableDescription = RemoteObject.unserializableDescription(this.valueInternal);
    return unserializableDescription || undefined;
  }

  get description(): string {
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
          this.#cachedDescription = String(this.valueInternal);
          break;
        case 'null':
          this.#cachedDescription = 'null';
          break;
        default:
          this.#cachedDescription = this.concatenate('{', '}', formatObjectItem.bind(this));
      }
    } else {
      this.#cachedDescription = String(this.valueInternal);
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

  get type(): string {
    return typeof this.valueInternal;
  }

  get subtype(): string|undefined {
    if (this.valueInternal === null) {
      return 'null';
    }

    if (Array.isArray(this.valueInternal)) {
      return 'array';
    }

    if (this.valueInternal instanceof Date) {
      return 'date';
    }

    return undefined;
  }

  get hasChildren(): boolean {
    if ((typeof this.valueInternal !== 'object') || (this.valueInternal === null)) {
      return false;
    }
    return Boolean(Object.keys((this.valueInternal as Object)).length);
  }

  async getOwnProperties(_generatePreview: boolean, nonIndexedPropertiesOnly: boolean = false):
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

  async getAllProperties(
      accessorPropertiesOnly: boolean, generatePreview: boolean,
      nonIndexedPropertiesOnly: boolean = false): Promise<GetPropertiesResult> {
    if (accessorPropertiesOnly) {
      return {properties: [], internalProperties: null};
    }
    return await this.getOwnProperties(generatePreview, nonIndexedPropertiesOnly);
  }

  private children(): RemoteObjectProperty[] {
    if (!this.hasChildren) {
      return [];
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (this.valueInternal as any);

    function buildProperty(propName: string): RemoteObjectProperty {
      let propValue = value[propName];
      if (!(propValue instanceof RemoteObject)) {
        propValue = RemoteObject.fromLocalObject(propValue);
      }
      return new RemoteObjectProperty(propName, propValue);
    }
    if (!this.#cachedChildren) {
      this.#cachedChildren = Object.keys((value as Object)).map(buildProperty);
    }
    return this.#cachedChildren;
  }

  arrayLength(): number {
    return Array.isArray(this.valueInternal) ? this.valueInternal.length : 0;
  }

  async callFunction<T>(
      functionDeclaration: (this: Object, ...arg1: unknown[]) => T,
      args?: Protocol.Runtime.CallArgument[]): Promise<CallFunctionResult> {
    const target = (this.valueInternal as Object);
    const rawArgs = args ? args.map(arg => arg.value) : [];

    let result;
    let wasThrown = false;
    try {
      result = functionDeclaration.apply(target, rawArgs);
    } catch (e) {
      wasThrown = true;
    }

    const object = RemoteObject.fromLocalObject(result);

    return {object, wasThrown} as CallFunctionResult;
  }

  async callFunctionJSON<T>(
      functionDeclaration: (this: Object, ...arg1: unknown[]) => T,
      args: Protocol.Runtime.CallArgument[]|undefined): Promise<T> {
    const target = (this.valueInternal as Object);
    const rawArgs = args ? args.map(arg => arg.value) : [];

    let result;
    try {
      result = functionDeclaration.apply(target, rawArgs);
    } catch (e) {
      result = null;
    }

    return result as T;
  }
}

export class RemoteArrayBuffer {
  readonly #objectInternal: RemoteObject;
  constructor(object: RemoteObject) {
    if (object.type !== 'object' || object.subtype !== 'arraybuffer') {
      throw new Error('Object is not an arraybuffer');
    }
    this.#objectInternal = object;
  }

  byteLength(): number {
    return this.#objectInternal.arrayBufferByteLength();
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async bytes(start: any = 0, end: any = this.byteLength()): Promise<number[]> {
    if (start < 0 || start >= this.byteLength()) {
      throw new RangeError('start is out of range');
    }
    if (end < start || end > this.byteLength()) {
      throw new RangeError('end is out of range');
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // @ts-expect-error
    return await this.#objectInternal.callFunctionJSON(bytes, [{value: start}, {value: end - start}]);

    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function bytes(this: any, offset: number, length: number): number[] {
      return [...new Uint8Array(this, offset, length)];
    }
  }

  object(): RemoteObject {
    return this.#objectInternal;
  }
}

export class RemoteArray {
  readonly #objectInternal: RemoteObject;
  constructor(object: RemoteObject) {
    this.#objectInternal = object;
  }

  static objectAsArray(object: RemoteObject|null): RemoteArray {
    if (!object || object.type !== 'object' || (object.subtype !== 'array' && object.subtype !== 'typedarray')) {
      throw new Error('Object is empty or not an array');
    }
    return new RemoteArray(object);
  }

  static createFromRemoteObjects(objects: RemoteObject[]): Promise<RemoteArray> {
    if (!objects.length) {
      throw new Error('Input array is empty');
    }
    const objectArguments = [];
    for (let i = 0; i < objects.length; ++i) {
      objectArguments.push(RemoteObject.toCallArgument(objects[i]));
    }
    return objects[0].callFunction(createArray, objectArguments).then(returnRemoteArray);

    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function createArray(): any[] {
      if (arguments.length > 1) {
        return new Array(arguments);
      }
      return [arguments[0]];
    }

    function returnRemoteArray(result: CallFunctionResult): RemoteArray {
      if (result.wasThrown || !result.object) {
        throw new Error('Call function throws exceptions or returns empty value');
      }
      return RemoteArray.objectAsArray(result.object);
    }
  }

  at(index: number): Promise<RemoteObject> {
    if (index < 0 || index > this.#objectInternal.arrayLength()) {
      throw new Error('Out of range');
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // @ts-expect-error
    return this.#objectInternal.callFunction(at, [RemoteObject.toCallArgument(index)]).then(assertCallFunctionResult);

    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function at(this: any, index: number): any {
      return this[index];
    }

    function assertCallFunctionResult(result: CallFunctionResult): RemoteObject {
      if (result.wasThrown || !result.object) {
        throw new Error('Exception in callFunction or result value is empty');
      }
      return result.object;
    }
  }

  length(): number {
    return this.#objectInternal.arrayLength();
  }

  map<T>(func: (arg0: RemoteObject) => Promise<T>): Promise<T[]> {
    const promises = [];
    for (let i = 0; i < this.length(); ++i) {
      promises.push(this.at(i).then(func));
    }
    return Promise.all(promises);
  }

  object(): RemoteObject {
    return this.#objectInternal;
  }
}

export class RemoteFunction {
  readonly #objectInternal: RemoteObject;

  constructor(object: RemoteObject) {
    this.#objectInternal = object;
  }

  static objectAsFunction(object: RemoteObject|null): RemoteFunction {
    if (!object || object.type !== 'function') {
      throw new Error('Object is empty or not a function');
    }
    return new RemoteFunction(object);
  }

  targetFunction(): Promise<RemoteObject> {
    return this.#objectInternal.getOwnProperties(false /* generatePreview */).then(targetFunction.bind(this));

    function targetFunction(this: RemoteFunction, ownProperties: GetPropertiesResult): RemoteObject {
      if (!ownProperties.internalProperties) {
        return this.#objectInternal;
      }
      const internalProperties = ownProperties.internalProperties;
      for (const property of internalProperties) {
        if (property.name === '[[TargetFunction]]') {
          return property.value as RemoteObject;
        }
      }
      return this.#objectInternal;
    }
  }

  targetFunctionDetails(): Promise<FunctionDetails|null> {
    return this.targetFunction().then(functionDetails.bind(this));

    function functionDetails(this: RemoteFunction, targetFunction: RemoteObject): Promise<FunctionDetails|null> {
      const boundReleaseFunctionDetails =
          releaseTargetFunction.bind(null, this.#objectInternal !== targetFunction ? targetFunction : null);
      return targetFunction.debuggerModel().functionDetailsPromise(targetFunction).then(boundReleaseFunctionDetails);
    }

    function releaseTargetFunction(
        targetFunction: RemoteObject|null, functionDetails: FunctionDetails|null): FunctionDetails|null {
      if (targetFunction) {
        targetFunction.release();
      }
      return functionDetails;
    }
  }

  object(): RemoteObject {
    return this.#objectInternal;
  }
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
const _descriptionLengthParenRegex: RegExp = /\(([0-9]+)\)/;
// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
const _descriptionLengthSquareRegex: RegExp = /\[([0-9]+)\]/;

const enum UnserializableNumber {
  Negative0 = ('-0'),
  NaN = ('NaN'),
  Infinity = ('Infinity'),
  NegativeInfinity = ('-Infinity'),
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

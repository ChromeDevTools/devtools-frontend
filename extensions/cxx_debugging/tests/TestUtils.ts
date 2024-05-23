// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type Chrome} from '../../../extension-api/ExtensionAPI.js';
import {type Value, type WasmInterface} from '../src/CustomFormatters.js';
import {WorkerPlugin} from '../src/DevToolsPluginHost.js';
import {type WasmValue} from '../src/WasmTypes.js';
import {type HostInterface} from '../src/WorkerRPC.js';
import {type Debugger} from './RealBackend.js';

export class TestHostInterface implements HostInterface {
  getWasmLinearMemory(_offset: number, _length: number, _stopId: unknown): ArrayBuffer {
    throw new Error('Method not implemented.');
  }
  getWasmLocal(_local: number, _stopId: unknown): WasmValue {
    throw new Error('Method not implemented.');
  }
  getWasmGlobal(_global: number, _stopId: unknown): WasmValue {
    throw new Error('Method not implemented.');
  }
  getWasmOp(_op: number, _stopId: unknown): WasmValue {
    throw new Error('Method not implemented.');
  }
  reportResourceLoad(
      _resourceUrl: string,
      _status: {success: boolean; errorMessage?: string | undefined; size?: number | undefined;}): Promise<void> {
    return Promise.resolve();
  }
}

export function makeURL(path: string): string {
  return new URL(path, document.baseURI).href;
}

export async function createWorkerPlugin(debug?: Debugger): Promise<Chrome.DevTools.LanguageExtensionPlugin> {
  return WorkerPlugin.create([], true).then(p => {
    if (debug) {
      p.getWasmLinearMemory = debug.getWasmLinearMemory.bind(debug);
      p.getWasmLocal = debug.getWasmLocal.bind(debug);
      p.getWasmGlobal = debug.getWasmGlobal.bind(debug);
      p.getWasmOp = debug.getWasmOp.bind(debug);
    }
    /* eslint-disable-next-line no-debugger */
    debugger;  // Halt in the debugger to let developers set breakpoints in C++.
    return p;
  });
}

export function relativePathname(url: URL, base: URL): string {
  const baseSplit = base.pathname.split('/');
  const urlSplit = url.pathname.split('/');

  let i = 0;
  for (; i < Math.min(baseSplit.length, urlSplit.length); ++i) {
    if (baseSplit[i] !== urlSplit[i]) {
      break;
    }
  }
  const result = new Array(baseSplit.length - i);
  result.fill('..');
  result.push(...urlSplit.slice(i).filter(p => p.length > 0));

  return result.join('/');
}

export function nonNull<T>(value: T|null|undefined): T {
  assert.exists(value);
  return value as T;
}

export function remoteObject(value: Chrome.DevTools.RemoteObject|Chrome.DevTools.ForeignObject|
                             null): Chrome.DevTools.RemoteObject {
  assert.exists(value);
  assert(value.type != 'reftype');
  return value;
}

export class TestWasmInterface implements WasmInterface {
  memory = new ArrayBuffer(0);
  locals = new Map<number, WasmValue>();
  globals = new Map<number, WasmValue>();
  stack = new Map<number, WasmValue>();

  readMemory(offset: number, length: number): Uint8Array {
    return new Uint8Array(this.memory, offset, length);
  }
  getOp(op: number): WasmValue {
    const val = this.stack.get(op);
    if (val !== undefined) {
      return val;
    }
    throw new Error(`No stack entry ${op}`);
  }
  getLocal(local: number): WasmValue {
    const val = this.locals.get(local);
    if (val !== undefined) {
      return val;
    }
    throw new Error(`No local ${local}`);
  }
  getGlobal(global: number): WasmValue {
    const val = this.globals.get(global);
    if (val !== undefined) {
      return val;
    }
    throw new Error(`No global ${global}`);
  }
}

export class TestValue implements Value {
  private dataView: DataView;
  members: {[key: string]: TestValue, [key: number]: TestValue};
  location: number;
  size: number;
  typeNames: string[];

  static fromInt8(value: number, typeName: string = 'int8_t'): TestValue {
    const content = new DataView(new ArrayBuffer(1));
    content.setInt8(0, value);
    return new TestValue(content, typeName);
  }
  static fromInt16(value: number, typeName: string = 'int16_t'): TestValue {
    const content = new DataView(new ArrayBuffer(2));
    content.setInt16(0, value, true);
    return new TestValue(content, typeName);
  }
  static fromInt32(value: number, typeName: string = 'int32_t'): TestValue {
    const content = new DataView(new ArrayBuffer(4));
    content.setInt32(0, value, true);
    return new TestValue(content, typeName);
  }
  static fromInt64(value: bigint, typeName: string = 'int64_t'): TestValue {
    const content = new DataView(new ArrayBuffer(8));
    content.setBigInt64(0, value, true);
    return new TestValue(content, typeName);
  }
  static fromUint8(value: number, typeName: string = 'uint8_t'): TestValue {
    const content = new DataView(new ArrayBuffer(1));
    content.setUint8(0, value);
    return new TestValue(content, typeName);
  }
  static fromUint16(value: number, typeName: string = 'uint16_t'): TestValue {
    const content = new DataView(new ArrayBuffer(2));
    content.setUint16(0, value, true);
    return new TestValue(content, typeName);
  }
  static fromUint32(value: number, typeName: string = 'uint32_t'): TestValue {
    const content = new DataView(new ArrayBuffer(4));
    content.setUint32(0, value, true);
    return new TestValue(content, typeName);
  }
  static fromUint64(value: bigint, typeName: string = 'uint64_t'): TestValue {
    const content = new DataView(new ArrayBuffer(8));
    content.setBigUint64(0, value, true);
    return new TestValue(content, typeName);
  }
  static fromFloat32(value: number, typeName: string = 'float'): TestValue {
    const content = new DataView(new ArrayBuffer(4));
    content.setFloat32(0, value, true);
    return new TestValue(content, typeName);
  }
  static fromFloat64(value: number, typeName: string = 'double'): TestValue {
    const content = new DataView(new ArrayBuffer(8));
    content.setFloat64(0, value, true);
    return new TestValue(content, typeName);
  }
  static pointerTo(pointeeOrElements: TestValue|TestValue[], address?: number): TestValue {
    const content = new DataView(new ArrayBuffer(4));
    const elements = Array.isArray(pointeeOrElements) ? pointeeOrElements : [pointeeOrElements];
    address = address ?? elements[0].location;
    content.setUint32(0, address, true);
    const space = elements[0].typeNames[0].endsWith('*') ? '' : ' ';
    const members: {[key: string|number]: TestValue} = {'*': elements[0]};
    for (let i = 0; i < elements.length; ++i) {
      members[i] = elements[i];
    }
    const value = new TestValue(content, `${elements[0].typeNames[0]}${space}*`, members);
    return value;
  }
  static fromMembers(typeName: string, members: {[key: string]: TestValue, [key: number]: TestValue}): TestValue {
    return new TestValue(new DataView(new ArrayBuffer(0)), typeName, members);
  }

  asInt8(): number {
    return this.dataView.getInt8(0);
  }
  asInt16(): number {
    return this.dataView.getInt16(0, true);
  }
  asInt32(): number {
    return this.dataView.getInt32(0, true);
  }
  asInt64(): bigint {
    return this.dataView.getBigInt64(0, true);
  }
  asUint8(): number {
    return this.dataView.getUint8(0);
  }
  asUint16(): number {
    return this.dataView.getUint16(0, true);
  }
  asUint32(): number {
    return this.dataView.getUint32(0, true);
  }
  asUint64(): bigint {
    return this.dataView.getBigUint64(0, true);
  }
  asFloat32(): number {
    return this.dataView.getFloat32(0, true);
  }
  asFloat64(): number {
    return this.dataView.getFloat64(0, true);
  }
  asDataView(offset?: number, size?: number): DataView {
    offset = this.location + (offset ?? 0);
    size = Math.min(size ?? this.size, this.size - Math.max(0, offset));
    return new DataView(this.dataView.buffer, offset, size);
  }
  getMembers(): string[] {
    return Object.keys(this.members);
  }

  $(member: string|number): Value {
    if (typeof member === 'number' || !member.includes('.')) {
      return this.members[member];
    }
    let value = this as Value;
    for (const prop of member.split('.')) {
      value = value.$(prop);
    }
    return value;
  }

  constructor(content: DataView, typeName: string, members?: {[key: string]: TestValue, [key: number]: TestValue}) {
    this.location = 0;
    this.size = content.byteLength;
    this.typeNames = [typeName];
    this.members = members || {};
    this.dataView = content;
  }
}

declare global {
  /* eslint-disable-next-line @typescript-eslint/naming-convention */
  let __karma__: unknown;
}

// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type Chrome} from '../../../extension-api/ExtensionAPI.js';

import {type WasmValue} from './WasmTypes.js';
import {type HostInterface} from './WorkerRPC.js';

export interface FieldInfo {
  typeId: string;
  name: string|undefined;
  offset: number;
}

export interface Enumerator {
  typeId: string;
  name: string;
  value: bigint;
}

export interface TypeInfo {
  typeId: string;
  enumerators?: Enumerator[];
  alignment: number;
  size: number;
  isPointer: boolean;
  members: FieldInfo[];
  arraySize: number;
  hasValue: boolean;
  typeNames: string[];
  canExpand: boolean;
}

export interface WasmInterface {
  readMemory(offset: number, length: number): Uint8Array;
  getOp(op: number): WasmValue;
  getLocal(local: number): WasmValue;
  getGlobal(global: number): WasmValue;
}

export interface Value {
  location: number;
  size: number;
  typeNames: string[];
  asUint8: () => number;
  asUint16: () => number;
  asUint32: () => number;
  asUint64: () => bigint;
  asInt8: () => number;
  asInt16: () => number;
  asInt32: () => number;
  asInt64: () => bigint;
  asFloat32: () => number;
  asFloat64: () => number;
  asDataView: (offset?: number, size?: number) => DataView;
  $: (member: string|number) => Value;
  getMembers(): string[];
}

export class MemorySlice {
  readonly begin: number;
  buffer: ArrayBuffer;

  constructor(buffer: ArrayBuffer, begin: number) {
    this.begin = begin;
    this.buffer = buffer;
  }

  merge(other: MemorySlice): MemorySlice {
    if (other.begin < this.begin) {
      return other.merge(this);
    }
    if (other.begin > this.end) {
      throw new Error('Slices are not contiguous');
    }
    if (other.end <= this.end) {
      return this;
    }

    const newBuffer = new Uint8Array(other.end - this.begin);
    newBuffer.set(new Uint8Array(this.buffer), 0);
    newBuffer.set(new Uint8Array(other.buffer, this.end - other.begin), this.length);

    return new MemorySlice(newBuffer.buffer, this.begin);
  }

  contains(offset: number): boolean {
    return this.begin <= offset && offset < this.end;
  }

  get length(): number {
    return this.buffer.byteLength;
  }

  get end(): number {
    return this.length + this.begin;
  }

  view(begin: number, length: number): DataView {
    return new DataView(this.buffer, begin - this.begin, length);
  }
}

export class PageStore {
  readonly slices: MemorySlice[] = [];

  // Returns the highest index |i| such that |slices[i].start <= offset|, or -1 if there is no such |i|.
  findSliceIndex(offset: number): number {
    let begin = 0;
    let end = this.slices.length;
    while (begin < end) {
      const idx = Math.floor((end + begin) / 2);

      const pivot = this.slices[idx];
      if (offset < pivot.begin) {
        end = idx;
      } else {
        begin = idx + 1;
      }
    }
    return begin - 1;
  }

  findSlice(offset: number): MemorySlice|null {
    return this.getSlice(this.findSliceIndex(offset), offset);
  }

  private getSlice(index: number, offset: number): MemorySlice|null {
    if (index < 0) {
      return null;
    }
    const candidate = this.slices[index];
    return candidate?.contains(offset) ? candidate : null;
  }

  addSlice(buffer: ArrayBuffer|number[], begin: number): MemorySlice {
    let slice = new MemorySlice(Array.isArray(buffer) ? new Uint8Array(buffer).buffer : buffer, begin);

    let leftPosition = this.findSliceIndex(slice.begin - 1);
    const leftOverlap = this.getSlice(leftPosition, slice.begin - 1);
    if (leftOverlap) {
      slice = slice.merge(leftOverlap);
    } else {
      leftPosition++;
    }
    const rightPosition = this.findSliceIndex(slice.end);
    const rightOverlap = this.getSlice(rightPosition, slice.end);
    if (rightOverlap) {
      slice = slice.merge(rightOverlap);
    }
    this.slices.splice(
        leftPosition,                      // Insert to the right if no overlap
        rightPosition - leftPosition + 1,  // Delete one additional slice if overlapping on the left
        slice);
    return slice;
  }
}
export class WasmMemoryView {
  private readonly wasm: WasmInterface;
  private readonly pages = new PageStore();
  private static readonly PAGE_SIZE = 4096;

  constructor(wasm: WasmInterface) {
    this.wasm = wasm;
  }

  private page(byteOffset: number, byteLength: number): {page: number, offset: number, count: number} {
    const mask = WasmMemoryView.PAGE_SIZE - 1;
    const offset = byteOffset & mask;
    const page = byteOffset - offset;
    const rangeEnd = byteOffset + byteLength;
    const count = 1 + Math.ceil((rangeEnd - (rangeEnd & mask) - page) / WasmMemoryView.PAGE_SIZE);
    return {page, offset, count};
  }

  private getPages(page: number, count: number): DataView {
    if (page & (WasmMemoryView.PAGE_SIZE - 1)) {
      throw new Error('Not a valid page');
    }
    let slice = this.pages.findSlice(page);
    const size = WasmMemoryView.PAGE_SIZE * count;
    if (!slice || slice.length < count * WasmMemoryView.PAGE_SIZE) {
      const data = this.wasm.readMemory(page, size);
      if (data.byteOffset !== 0 || data.byteLength !== data.buffer.byteLength) {
        throw new Error('Did not expect a partial memory view');
      }
      slice = this.pages.addSlice(data.buffer, page);
    }
    return slice.view(page, size);
  }

  getFloat32(byteOffset: number, littleEndian?: boolean): number {
    const {offset, page, count} = this.page(byteOffset, 4);
    const view = this.getPages(page, count);
    return view.getFloat32(offset, littleEndian);
  }
  getFloat64(byteOffset: number, littleEndian?: boolean): number {
    const {offset, page, count} = this.page(byteOffset, 8);
    const view = this.getPages(page, count);
    return view.getFloat64(offset, littleEndian);
  }
  getInt8(byteOffset: number): number {
    const {offset, page, count} = this.page(byteOffset, 1);
    const view = this.getPages(page, count);
    return view.getInt8(offset);
  }
  getInt16(byteOffset: number, littleEndian?: boolean): number {
    const {offset, page, count} = this.page(byteOffset, 2);
    const view = this.getPages(page, count);
    return view.getInt16(offset, littleEndian);
  }
  getInt32(byteOffset: number, littleEndian?: boolean): number {
    const {offset, page, count} = this.page(byteOffset, 4);
    const view = this.getPages(page, count);
    return view.getInt32(offset, littleEndian);
  }
  getUint8(byteOffset: number): number {
    const {offset, page, count} = this.page(byteOffset, 1);
    const view = this.getPages(page, count);
    return view.getUint8(offset);
  }
  getUint16(byteOffset: number, littleEndian?: boolean): number {
    const {offset, page, count} = this.page(byteOffset, 2);
    const view = this.getPages(page, count);
    return view.getUint16(offset, littleEndian);
  }
  getUint32(byteOffset: number, littleEndian?: boolean): number {
    const {offset, page, count} = this.page(byteOffset, 4);
    const view = this.getPages(page, count);
    return view.getUint32(offset, littleEndian);
  }
  getBigInt64(byteOffset: number, littleEndian?: boolean): bigint {
    const {offset, page, count} = this.page(byteOffset, 8);
    const view = this.getPages(page, count);
    return view.getBigInt64(offset, littleEndian);
  }
  getBigUint64(byteOffset: number, littleEndian?: boolean): bigint {
    const {offset, page, count} = this.page(byteOffset, 8);
    const view = this.getPages(page, count);
    return view.getBigUint64(offset, littleEndian);
  }
  asDataView(byteOffset: number, byteLength: number): DataView {
    const {offset, page, count} = this.page(byteOffset, byteLength);
    const view = this.getPages(page, count);
    return new DataView(view.buffer, view.byteOffset + offset, byteLength);
  }
}

export class CXXValue implements Value, LazyObject {
  readonly location: number;
  private readonly type: TypeInfo;
  private readonly data?: number[];
  private readonly memoryOrDataView: DataView|WasmMemoryView;
  private readonly wasm: WasmInterface;
  private readonly typeMap: Map<unknown, TypeInfo>;
  private readonly memoryView: WasmMemoryView;
  private membersMap?: Map<string, {location: number, type: TypeInfo}>;
  private readonly objectStore: LazyObjectStore;
  private readonly objectId: string;
  private readonly displayValue: string|undefined;
  private readonly memoryAddress?: number;

  constructor(
      objectStore: LazyObjectStore, wasm: WasmInterface, memoryView: WasmMemoryView, location: number, type: TypeInfo,
      typeMap: Map<unknown, TypeInfo>, data?: number[], displayValue?: string, memoryAddress?: number) {
    if (!location && !data) {
      throw new Error('Cannot represent nullptr');
    }
    this.data = data;
    this.location = location;
    this.type = type;
    this.typeMap = typeMap;
    this.wasm = wasm;
    this.memoryOrDataView = data ? new DataView(new Uint8Array(data).buffer) : memoryView;
    if (data && data.length !== type.size) {
      throw new Error('Invalid data size');
    }
    this.memoryView = memoryView;
    this.objectStore = objectStore;
    this.objectId = objectStore.store(this);
    this.displayValue = displayValue;
    this.memoryAddress = memoryAddress;
  }

  static create(objectStore: LazyObjectStore, wasm: WasmInterface, memoryView: WasmMemoryView, typeInfo: {
    typeInfos: TypeInfo[],
    root: TypeInfo,
    location?: number,
    data?: number[],
    displayValue?: string,
    memoryAddress?: number,
  }): CXXValue {
    const typeMap = new Map();
    for (const info of typeInfo.typeInfos) {
      typeMap.set(info.typeId, info);
    }
    const {location, root, data, displayValue, memoryAddress} = typeInfo;
    return new CXXValue(objectStore, wasm, memoryView, location ?? 0, root, typeMap, data, displayValue, memoryAddress);
  }

  private get members(): Map<string, {location: number, type: TypeInfo}> {
    if (!this.membersMap) {
      this.membersMap = new Map();
      for (const member of this.type.members) {
        const memberType = this.typeMap.get(member.typeId);
        if (memberType && member.name) {
          const memberLocation = member.name === '*' ? this.memoryOrDataView.getUint32(this.location, true) :
                                                       this.location + member.offset;
          this.membersMap.set(member.name, {location: memberLocation, type: memberType});
        }
      }
    }
    return this.membersMap;
  }

  private getArrayElement(index: number): CXXValue {
    const data = this.members.has('*') ? undefined : this.data;
    const element = this.members.get('*') || this.members.get('0');
    if (!element) {
      throw new Error(`Incomplete type information for array or pointer type '${this.typeNames}'`);
    }
    return new CXXValue(
        this.objectStore, this.wasm, this.memoryView, element.location + index * element.type.size, element.type,
        this.typeMap, data);
  }

  async getProperties(): Promise<{name: string, property: LazyObject}[]> {
    const properties = [];
    if (this.type.arraySize > 0) {
      for (let index = 0; index < this.type.arraySize; ++index) {
        properties.push({name: `${index}`, property: await this.getArrayElement(index)});
      }
    } else {
      const members = await this.members;
      const data = members.has('*') ? undefined : this.data;
      for (const [name, {location, type}] of members) {
        const property = new CXXValue(this.objectStore, this.wasm, this.memoryView, location, type, this.typeMap, data);
        properties.push({name, property});
      }
    }
    return properties;
  }

  async asRemoteObject(): Promise<Chrome.DevTools.RemoteObject|Chrome.DevTools.ForeignObject> {
    if (this.type.hasValue && this.type.arraySize === 0) {
      const formatter = CustomFormatters.get(this.type);
      if (!formatter) {
        const type = 'undefined' as Chrome.DevTools.RemoteObjectType;
        const description = '<not displayable>';
        return {type, description, hasChildren: false};
      }

      if (this.location === undefined || (!this.data && this.location === 0xffffffff)) {
        const type = 'undefined' as Chrome.DevTools.RemoteObjectType;
        const description = '<optimized out>';
        return {type, description, hasChildren: false};
      }
      const value =
          new CXXValue(this.objectStore, this.wasm, this.memoryView, this.location, this.type, this.typeMap, this.data);

      try {
        const formattedValue = await formatter.format(this.wasm, value);
        return lazyObjectFromAny(formattedValue, this.objectStore, this.type, this.displayValue, this.memoryAddress)
            .asRemoteObject();
      } catch (e) {
        // Fallthrough
      }
    }

    const type = (this.type.arraySize > 0 ? 'array' : 'object') as Chrome.DevTools.RemoteObjectType;
    const {objectId} = this;
    return {
      type,
      description: this.type.typeNames[0],
      hasChildren: this.type.members.length > 0,
      linearMemoryAddress: this.memoryAddress,
      linearMemorySize: this.type.size,
      objectId,
    };
  }

  get typeNames(): string[] {
    return this.type.typeNames;
  }

  get size(): number {
    return this.type.size;
  }

  asInt8(): number {
    return this.memoryOrDataView.getInt8(this.location);
  }
  asInt16(): number {
    return this.memoryOrDataView.getInt16(this.location, true);
  }
  asInt32(): number {
    return this.memoryOrDataView.getInt32(this.location, true);
  }
  asInt64(): bigint {
    return this.memoryOrDataView.getBigInt64(this.location, true);
  }
  asUint8(): number {
    return this.memoryOrDataView.getUint8(this.location);
  }
  asUint16(): number {
    return this.memoryOrDataView.getUint16(this.location, true);
  }
  asUint32(): number {
    return this.memoryOrDataView.getUint32(this.location, true);
  }
  asUint64(): bigint {
    return this.memoryOrDataView.getBigUint64(this.location, true);
  }
  asFloat32(): number {
    return this.memoryOrDataView.getFloat32(this.location, true);
  }
  asFloat64(): number {
    return this.memoryOrDataView.getFloat64(this.location, true);
  }
  asDataView(offset?: number, size?: number): DataView {
    offset = this.location + (offset ?? 0);
    size = size ?? this.size;
    if (this.memoryOrDataView instanceof DataView) {
      size = Math.min(size - offset, this.memoryOrDataView.byteLength - offset - this.location);
      if (size < 0) {
        throw new RangeError('Size exceeds the buffer range');
      }
      return new DataView(
          this.memoryOrDataView.buffer, this.memoryOrDataView.byteOffset + this.location + offset, size);
    }
    return this.memoryView.asDataView(offset, size);
  }
  $(selector: string|number): CXXValue {
    const data = this.members.has('*') ? undefined : this.data;

    if (typeof selector === 'number') {
      return this.getArrayElement(selector);
    }

    const dot = selector.indexOf('.');
    const memberName = dot >= 0 ? selector.substring(0, dot) : selector;
    selector = selector.substring(memberName.length + 1);

    const member = this.members.get(memberName);
    if (!member) {
      throw new Error(`Type ${this.typeNames[0] || '<anonymous>'} has no member '${
          memberName}'. Available members are: ${Array.from(this.members.keys())}`);
    }
    const memberValue =
        new CXXValue(this.objectStore, this.wasm, this.memoryView, member.location, member.type, this.typeMap, data);
    if (selector.length === 0) {
      return memberValue;
    }
    return memberValue.$(selector);
  }

  getMembers(): string[] {
    return Array.from(this.members.keys());
  }
}

export interface LazyObject {
  getProperties(): Promise<{name: string, property: LazyObject}[]>;
  asRemoteObject(): Promise<Chrome.DevTools.RemoteObject|Chrome.DevTools.ForeignObject>;
}

export function primitiveObject<T>(
    value: T, description?: string, linearMemoryAddress?: number, type?: TypeInfo): PrimitiveLazyObject<T>|null {
  if (['number', 'string', 'boolean', 'bigint', 'undefined'].includes(typeof value)) {
    if (typeof value === 'bigint' || typeof value === 'number') {
      const enumerator = type?.enumerators?.find(e => e.value === BigInt(value));
      if (enumerator) {
        description = enumerator.name;
      }
    }
    return new PrimitiveLazyObject(
        typeof value as Chrome.DevTools.RemoteObjectType, value, description, linearMemoryAddress, type?.size);
  }
  return null;
}

function lazyObjectFromAny(
    value: FormatterResult, objectStore: LazyObjectStore, type?: TypeInfo, description?: string,
    linearMemoryAddress?: number): LazyObject {
  const primitive = primitiveObject(value, description, linearMemoryAddress, type);
  if (primitive) {
    return primitive;
  }
  if (value instanceof CXXValue) {
    return value;
  }
  if (typeof value === 'object') {
    if (value === null) {
      return new PrimitiveLazyObject(
          'null' as Chrome.DevTools.RemoteObjectType, value, description, linearMemoryAddress);
    }
    return new LocalLazyObject(value, objectStore, type, linearMemoryAddress);
  }
  if (typeof value === 'function') {
    return value();
  }

  throw new Error('Value type is not formattable');
}

export class LazyObjectStore {
  private nextObjectId: number = 0;
  private objects: Map<string, LazyObject> = new Map();

  store(lazyObject: LazyObject): string {
    const objectId = `${this.nextObjectId++}`;
    this.objects.set(objectId, lazyObject);
    return objectId;
  }

  get(objectId: string): LazyObject|undefined {
    return this.objects.get(objectId);
  }

  release(objectId: string): void {
    this.objects.delete(objectId);
  }

  clear(): void {
    this.objects.clear();
  }
}

export class PrimitiveLazyObject<T> implements LazyObject {
  readonly type: Chrome.DevTools.RemoteObjectType;
  readonly value: T;
  readonly description: string;
  private readonly linearMemoryAddress?: number;
  private readonly linearMemorySize?: number;
  constructor(
      type: Chrome.DevTools.RemoteObjectType, value: T, description?: string, linearMemoryAddress?: number,
      linearMemorySize?: number) {
    this.type = type;
    this.value = value;
    this.description = description ?? `${value}`;
    this.linearMemoryAddress = linearMemoryAddress;
    this.linearMemorySize = linearMemorySize;
  }

  async getProperties(): Promise<{name: string, property: LazyObject}[]> {
    return [];
  }

  async asRemoteObject(): Promise<Chrome.DevTools.RemoteObject> {
    const {type, value, description, linearMemoryAddress, linearMemorySize} = this;
    return {type, hasChildren: false, value, description, linearMemoryAddress, linearMemorySize};
  }
}

export class LocalLazyObject implements LazyObject {
  readonly value: Object;
  private readonly objectId;
  private readonly objectStore: LazyObjectStore;
  private readonly type?: TypeInfo;
  private readonly linearMemoryAddress?: number;

  constructor(value: object, objectStore: LazyObjectStore, type?: TypeInfo, linearMemoryAddress?: number) {
    this.value = value;
    this.objectStore = objectStore;
    this.objectId = objectStore.store(this);
    this.type = type;
    this.linearMemoryAddress = linearMemoryAddress;
  }

  async getProperties(): Promise<{name: string, property: LazyObject}[]> {
    return Object.entries(this.value).map(([name, value]) => {
      const property = lazyObjectFromAny(value, this.objectStore);
      return {name, property};
    });
  }

  async asRemoteObject(): Promise<Chrome.DevTools.RemoteObject> {
    const type = (Array.isArray(this.value) ? 'array' : 'object') as Chrome.DevTools.RemoteObjectType;
    const {objectId, type: valueType, linearMemoryAddress} = this;
    return {
      type,
      objectId,
      description: valueType?.typeNames[0],
      hasChildren: Object.keys(this.value).length > 0,
      linearMemorySize: valueType?.size,
      linearMemoryAddress,
    };
  }
}

export type FormatterResult = number|string|boolean|bigint|undefined|CXXValue|object|(() => LazyObject);
export type FormatterCallback = (wasm: WasmInterface, value: Value) => FormatterResult;
export interface Formatter {
  types: Array<string>|((t: TypeInfo) => boolean);
  imports?: Array<FormatterCallback>;
  format: FormatterCallback;
}

export class HostWasmInterface {
  private readonly hostInterface: HostInterface;
  private readonly stopId: unknown;
  private readonly cache: Chrome.DevTools.ForeignObject[] = [];
  readonly view: WasmMemoryView;
  constructor(hostInterface: HostInterface, stopId: unknown) {
    this.hostInterface = hostInterface;
    this.stopId = stopId;
    this.view = new WasmMemoryView(this);
  }
  readMemory(offset: number, length: number): Uint8Array {
    return new Uint8Array(this.hostInterface.getWasmLinearMemory(offset, length, this.stopId));
  }
  getOp(op: number): WasmValue {
    return this.hostInterface.getWasmOp(op, this.stopId);
  }
  getLocal(local: number): WasmValue {
    return this.hostInterface.getWasmLocal(local, this.stopId);
  }
  getGlobal(global: number): WasmValue {
    return this.hostInterface.getWasmGlobal(global, this.stopId);
  }
}

export class DebuggerProxy {
  wasm: HostWasmInterface;
  target: EmscriptenModule;
  constructor(wasm: HostWasmInterface, target: EmscriptenModule) {
    this.wasm = wasm;
    this.target = target;
  }

  readMemory(src: number, dst: number, length: number): number {
    const data = this.wasm.view.asDataView(src, length);
    this.target.HEAP8.set(new Uint8Array(data.buffer, data.byteOffset, length), dst);
    return data.byteLength;
  }
  getLocal(index: number): WasmValue {
    return this.wasm.getLocal(index);
  }
  getGlobal(index: number): WasmValue {
    return this.wasm.getGlobal(index);
  }
  getOperand(index: number): WasmValue {
    return this.wasm.getOp(index);
  }
}

export class CustomFormatters {
  private static formatters: Map<string, Formatter> = new Map();
  private static genericFormatters: Formatter[] = [];

  static addFormatter(formatter: Formatter): void {
    if (Array.isArray(formatter.types)) {
      for (const type of formatter.types) {
        CustomFormatters.formatters.set(type, formatter);
      }
    } else {
      CustomFormatters.genericFormatters.push(formatter);
    }
  }

  static get(type: TypeInfo): Formatter|null {
    for (const name of type.typeNames) {
      const formatter = CustomFormatters.formatters.get(name);
      if (formatter) {
        return formatter;
      }
    }

    for (const t of type.typeNames) {
      const CONST_PREFIX = 'const ';
      if (t.startsWith(CONST_PREFIX)) {
        const formatter = CustomFormatters.formatters.get(t.substr(CONST_PREFIX.length));
        if (formatter) {
          return formatter;
        }
      }
    }

    for (const formatter of CustomFormatters.genericFormatters) {
      if (formatter.types instanceof Function) {
        if (formatter.types(type)) {
          return formatter;
        }
      }
    }
    return null;
  }
}

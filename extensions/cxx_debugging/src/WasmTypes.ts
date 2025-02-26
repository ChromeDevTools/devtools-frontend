// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Chrome} from '../../../extension-api/ExtensionAPI';

export type ForeignObject = Chrome.DevTools.ForeignObject;

export type WasmValue = Chrome.DevTools.WasmValue;

export type WasmSimdValue = string;

export type WasmPrimitive = number|bigint|WasmSimdValue;

/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/prefer-enum-initializers */
export const enum SerializedWasmType {
  i32 = 1,
  i64,
  f32,
  f64,
  v128,
  reftype
}
/* eslint-enable @typescript-eslint/naming-convention, @typescript-eslint/prefer-enum-initializers */

export function serializeWasmValue(value: WasmValue|ArrayBuffer, buffer: ArrayBufferLike): SerializedWasmType {
  if (value instanceof ArrayBuffer) {
    const data = new Uint8Array(value);
    new Uint8Array(buffer).set(data);
    return data.byteLength || -1;
  }

  const view = new DataView(buffer);
  switch (value.type) {
    case 'i32': {
      view.setInt32(0, value.value, true);
      return SerializedWasmType.i32;
    }
    case 'i64': {
      view.setBigInt64(0, value.value, true);
      return SerializedWasmType.i64;
    }
    case 'f32': {
      view.setFloat32(0, value.value, true);
      return SerializedWasmType.f32;
    }
    case 'f64': {
      view.setFloat64(0, value.value, true);
      return SerializedWasmType.f64;
    }
    case 'v128': {
      const [, a, b, c, d] = (value.value).split(' ');
      view.setInt32(0, Number(a), true);
      view.setInt32(4, Number(b), true);
      view.setInt32(8, Number(c), true);
      view.setInt32(12, Number(d), true);
      return SerializedWasmType.v128;
    }
    case 'reftype': {
      view.setUint8(0, ['local', 'global', 'operand'].indexOf(value.valueClass));
      view.setUint32(1, value.index, true);
      return SerializedWasmType.reftype;
    }
    default:
      throw new Error('cannot serialize non-numerical wasm type');
  }
}

export function deserializeWasmMemory(buffer: ArrayBufferLike): ArrayBuffer {
  const result = new Uint8Array(buffer.byteLength);
  result.set(new Uint8Array(buffer));
  return result.buffer;
}

export function deserializeWasmValue(buffer: ArrayBufferLike, type: SerializedWasmType): WasmValue {
  const view = new DataView(buffer);
  switch (type) {
    case SerializedWasmType.i32:
      return {type: 'i32', value: view.getInt32(0, true)};
    case SerializedWasmType.i64:
      return {type: 'i64', value: view.getBigInt64(0, true)};
    case SerializedWasmType.f32:
      return {type: 'f32', value: view.getFloat32(0, true)};
    case SerializedWasmType.f64:
      return {type: 'f64', value: view.getFloat64(0, true)};
    case SerializedWasmType.v128: {
      const a = view.getUint32(0, true);
      const b = view.getUint32(4, true);
      const c = view.getUint32(8, true);
      const d = view.getUint32(12, true);
      return {
        type: 'v128',
        value: `i32x4 0x${a.toString(16).padStart(8, '0')} 0x${b.toString(16).padStart(8, '0')} 0x${
            c.toString(16).padStart(8, '0')} 0x${d.toString(16).padStart(8, '0')}`
      };
    }
    case SerializedWasmType.reftype: {
      const ValueClasses: ['local', 'global', 'operand'] = ['local', 'global', 'operand'];
      const valueClass = ValueClasses[view.getUint8(0)];
      const index = view.getUint32(1, true);
      return {type: 'reftype', valueClass, index};
    }
  }
  // @ts-expect-error
  throw new Error('Invalid primitive wasm type');
}

export const kMaxWasmValueSize = 4 + 4 + 4 * 10;

export type WasmFunction = (...args: WasmPrimitive[]) => WasmPrimitive;

export type WasmExport = {
  name: string,
}&({func: number}|{table: number}|{mem: number}|{global: number});

export type WasmImport = {
  name: string,
  module: string,
}&({func: number}|{table: number}|{mem: number}|{global: number});

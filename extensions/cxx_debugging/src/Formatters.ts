// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  CustomFormatters,
  type Value,
  type WasmInterface,
  PrimitiveLazyObject,
  type LazyObject,
  type TypeInfo,
} from './CustomFormatters.js';

/*
 * Numbers
 */
CustomFormatters.addFormatter({types: ['bool'], format: (wasm, value) => value.asUint8() > 0});
CustomFormatters.addFormatter({types: ['uint16_t'], format: (wasm, value) => value.asUint16()});
CustomFormatters.addFormatter({types: ['uint32_t'], format: (wasm, value) => value.asUint32()});
CustomFormatters.addFormatter({types: ['uint64_t'], format: (wasm, value) => value.asUint64()});

CustomFormatters.addFormatter({types: ['int16_t'], format: (wasm, value) => value.asInt16()});
CustomFormatters.addFormatter({types: ['int32_t'], format: (wasm, value) => value.asInt32()});
CustomFormatters.addFormatter({types: ['int64_t'], format: (wasm, value) => value.asInt64()});

CustomFormatters.addFormatter({types: ['float'], format: (wasm, value) => value.asFloat32()});
CustomFormatters.addFormatter({types: ['double'], format: (wasm, value) => value.asFloat64()});

export const enum Constants {
  MAX_STRING_LEN = (1 << 28) - 16,  // This is the maximum string len for 32bit taken from V8
  PAGE_SIZE = 1 << 12,              // Block size used for formatting strings when searching for the null terminator
  SAFE_HEAP_START = 1 << 10,
}
export function formatVoid(): () => LazyObject {
  return () => new PrimitiveLazyObject('undefined', undefined, '<void>');
}

CustomFormatters.addFormatter({types: ['void'], format: formatVoid});

CustomFormatters.addFormatter({types: ['uint8_t', 'int8_t'], format: formatChar});

export function formatChar(wasm: WasmInterface, value: Value): string {
  const char = value.typeNames.includes('int8_t') ? Math.abs(value.asInt8()) : value.asUint8();
  switch (char) {
    case 0x0:
      return '\'\\0\'';
    case 0x7:
      return '\'\\a\'';
    case 0x8:
      return '\'\\b\'';
    case 0x9:
      return '\'\\t\'';
    case 0xA:
      return '\'\\n\'';
    case 0xB:
      return '\'\\v\'';
    case 0xC:
      return '\'\\f\'';
    case 0xD:
      return '\'\\r\'';
  }
  if (char < 0x20 || char > 0x7e) {
    return `'\\x${char.toString(16).padStart(2, '0')}'`;
  }
  return `'${String.fromCharCode(value.asInt8())}'`;
}

CustomFormatters.addFormatter({
  types: ['wchar_t', 'char32_t', 'char16_t'],
  format: (wasm, value) => {
    const codepoint = value.size === 2 ? value.asUint16() : value.asUint32();
    try {
      return String.fromCodePoint(codepoint);
    } catch {
      return `U+${codepoint.toString(16).padStart(value.size * 2, '0')}`;
    }
  },
});

/*
 * STL
 */
function formatLibCXXString<T extends CharArrayConstructor>(
    wasm: WasmInterface, value: Value, charType: T,
    decode: (chars: InstanceType<T>) => string): {size: number, string: string} {
  const shortString = value.$('__r_.__value_.<union>.__s');
  const size = shortString.getMembers().includes('<union>') ? shortString.$('<union>.__size_').asUint8() :
                                                              shortString.$('__size_').asUint8();
  const isLong = 0 < (size & 0x80);
  const charSize = charType.BYTES_PER_ELEMENT;
  if (isLong) {
    const longString = value.$('__r_.__value_.<union>.__l');
    const data = longString.$('__data_').asUint32();
    const stringSize = longString.$('__size_').asUint32();

    const copyLen = Math.min(stringSize * charSize, Constants.MAX_STRING_LEN);
    const bytes = wasm.readMemory(data, copyLen);
    const text = new charType(bytes.buffer, bytes.byteOffset, stringSize) as InstanceType<T>;
    return {size: stringSize, string: decode(text)};
  }

  const bytes = shortString.$('__data_').asDataView(0, size * charSize);
  const text = new charType(bytes.buffer, bytes.byteOffset, size) as InstanceType<T>;
  return {size, string: decode(text)};
}

export function formatLibCXX8String(wasm: WasmInterface, value: Value): {size: number, string: string} {
  return formatLibCXXString(wasm, value, Uint8Array, str => new TextDecoder().decode(str));
}

export function formatLibCXX16String(wasm: WasmInterface, value: Value): {size: number, string: string} {
  return formatLibCXXString(wasm, value, Uint16Array, str => new TextDecoder('utf-16le').decode(str));
}

export function formatLibCXX32String(wasm: WasmInterface, value: Value): {size: number, string: string} {
  // emscripten's wchar is 4 byte
  return formatLibCXXString(
      wasm, value, Uint32Array, str => Array.from(str).map(v => String.fromCodePoint(v)).join(''));
}

CustomFormatters.addFormatter({
  types: [
    'std::__2::string',
    'std::__2::basic_string<char, std::__2::char_traits<char>, std::__2::allocator<char> >',
    'std::__2::u8string',
    'std::__2::basic_string<char8_t, std::__2::char_traits<char8_t>, std::__2::allocator<char8_t> >',
  ],
  format: formatLibCXX8String,
});

CustomFormatters.addFormatter({
  types: [
    'std::__2::u16string',
    'std::__2::basic_string<char16_t, std::__2::char_traits<char16_t>, std::__2::allocator<char16_t> >',
  ],
  format: formatLibCXX16String,
});

CustomFormatters.addFormatter({
  types: [
    'std::__2::wstring',
    'std::__2::basic_string<wchar_t, std::__2::char_traits<wchar_t>, std::__2::allocator<wchar_t> >',
    'std::__2::u32string',
    'std::__2::basic_string<char32_t, std::__2::char_traits<char32_t>, std::__2::allocator<char32_t> >',
  ],
  format: formatLibCXX32String,
});

type CharArrayConstructor = typeof Uint8Array|typeof Uint16Array|typeof Uint32Array;
function formatRawString<T extends CharArrayConstructor>(
    wasm: WasmInterface, value: Value, charType: T, decode: (chars: InstanceType<T>) => string): string|
    {[key: string]: Value | null} {
  const address = value.asUint32();
  if (address < Constants.SAFE_HEAP_START) {
    return formatPointerOrReference(wasm, value);
  }
  const charSize = charType.BYTES_PER_ELEMENT;
  const slices: DataView[] = [];
  const deref = value.$('*');
  for (let bufferSize = 0; bufferSize < Constants.MAX_STRING_LEN; bufferSize += Constants.PAGE_SIZE) {
    // Copy PAGE_SIZE bytes
    const buffer = deref.asDataView(bufferSize, Constants.PAGE_SIZE);
    // Convert to charType
    const substr = new charType(buffer.buffer, buffer.byteOffset, buffer.byteLength / charSize);
    const strlen = substr.indexOf(0);
    if (strlen >= 0) {
      // buffer size is in bytes, strlen in characters
      const str = new charType(bufferSize / charSize + strlen) as InstanceType<T>;
      for (let i = 0; i < slices.length; ++i) {
        str.set(
            new charType(slices[i].buffer, slices[i].byteOffset, slices[i].byteLength / charSize),
            i * Constants.PAGE_SIZE / charSize);
      }
      str.set(substr.subarray(0, strlen), bufferSize / charSize);
      return decode(str);
    }
    slices.push(buffer);
  }
  return formatPointerOrReference(wasm, value);
}

export function formatCString(wasm: WasmInterface, value: Value): string|{[key: string]: Value | null} {
  return formatRawString(wasm, value, Uint8Array, str => new TextDecoder().decode(str));
}

export function formatU16CString(wasm: WasmInterface, value: Value): string|{[key: string]: Value | null} {
  return formatRawString(wasm, value, Uint16Array, str => new TextDecoder('utf-16le').decode(str));
}

export function formatCWString(wasm: WasmInterface, value: Value): string|{[key: string]: Value | null} {
  // emscripten's wchar is 4 byte
  return formatRawString(wasm, value, Uint32Array, str => Array.from(str).map(v => String.fromCodePoint(v)).join(''));
}

// Register with higher precedence than the generic pointer handler.
CustomFormatters.addFormatter({types: ['char *', 'char8_t *'], format: formatCString});
CustomFormatters.addFormatter({types: ['char16_t *'], format: formatU16CString});
CustomFormatters.addFormatter({types: ['wchar_t *', 'char32_t *'], format: formatCWString});

export function formatVector(wasm: WasmInterface, value: Value): Value[] {
  const begin = value.$('__begin_');
  const end = value.$('__end_');
  const size = (end.asUint32() - begin.asUint32()) / begin.$('*').size;
  const elements = [];
  for (let i = 0; i < size; ++i) {
    elements.push(begin.$(i));
  }
  return elements;
}

function reMatch(...exprs: RegExp[]): (type: TypeInfo) => boolean {
  return (type: TypeInfo) => {
    for (const expr of exprs) {
      for (const name of type.typeNames) {
        if (expr.exec(name)) {
          return true;
        }
      }
    }

    for (const expr of exprs) {
      for (const name of type.typeNames) {
        if (name.startsWith('const ')) {
          if (expr.exec(name.substring(6))) {
            return true;
          }
        }
      }
    }
    return false;
  };
}

CustomFormatters.addFormatter({types: reMatch(/^std::vector<.+>$/), format: formatVector});

export function formatPointerOrReference(wasm: WasmInterface, value: Value): {[key: string]: Value|null} {
  const address = value.asUint32();
  if (address === 0) {
    return {'0x0': null};
  }
  return {[`0x${address.toString(16)}`]: value.$('*')};
}
CustomFormatters.addFormatter({types: type => type.isPointer, format: formatPointerOrReference});

export function formatDynamicArray(wasm: WasmInterface, value: Value): {[key: string]: Value|null} {
  return {[`0x${value.location.toString(16)}`]: value.$(0)};
}
CustomFormatters.addFormatter({types: reMatch(/^.+\[\]$/), format: formatDynamicArray});

export function formatUInt128(wasm: WasmInterface, value: Value): bigint {
  const view = value.asDataView();
  return (view.getBigUint64(8, true) << BigInt(64)) + (view.getBigUint64(0, true));
}
CustomFormatters.addFormatter({types: ['unsigned __int128'], format: formatUInt128});

export function formatInt128(wasm: WasmInterface, value: Value): bigint {
  const view = value.asDataView();
  return (view.getBigInt64(8, true) << BigInt(64)) | (view.getBigUint64(0, true));
}
CustomFormatters.addFormatter({types: ['__int128'], format: formatInt128});

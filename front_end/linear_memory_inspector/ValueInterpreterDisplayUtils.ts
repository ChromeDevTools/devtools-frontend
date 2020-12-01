// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
const ls = Common.ls;

export const VALUE_INTEPRETER_MAX_NUM_BYTES = 8;

export const enum ValueType {
  Int8 = 'Integer 8-bit',
  Int16 = 'Integer 16-bit',
  Int32 = 'Integer 32-bit',
  Int64 = 'Integer 64-bit',
  Float32 = 'Float 32-bit',
  Float64 = 'Float 64-bit',
  String = 'String'
}

export const enum Endianness {
  Little = 'Little Endian',
  Big = 'Big Endian'
}

export const enum ValueTypeMode {
  Decimal = 'dec',
  Hexadecimal = 'hex',
  Octal = 'oct',
  Scientific = 'sci',
  None = 'none'
}

export function valueTypeModeToLocalizedString(mode: ValueTypeMode) {
  switch (mode) {
    case ValueTypeMode.Decimal:
      return ls`dec`;
    case ValueTypeMode.Hexadecimal:
      return ls`hex`;
    case ValueTypeMode.Octal:
      return ls`oct`;
    case ValueTypeMode.Scientific:
      return ls`sci`;
    case ValueTypeMode.None:
      return ls`none`;
  }
}

export function endiannessToLocalizedString(endianness: Endianness) {
  switch (endianness) {
    case Endianness.Little:
      return ls`Little Endian`;
    case Endianness.Big:
      return ls`Big Endian`;
  }
}

export function valueTypeToLocalizedString(valueType: ValueType) {
  switch (valueType) {
    case ValueType.Int8:
      return ls`Integer 8-bit`;
    case ValueType.Int16:
      return ls`Integer 16-bit`;
    case ValueType.Int32:
      return ls`Integer 32-bit`;
    case ValueType.Int64:
      return ls`Integer 64-bit`;
    case ValueType.Float32:
      return ls`Float 32-bit`;
    case ValueType.Float64:
      return ls`Float 64-bit`;
    case ValueType.String:
      return ls`String`;
  }
}

export function isValidMode(type: ValueType, mode: ValueTypeMode) {
  switch (type) {
    case ValueType.Int8:
    case ValueType.Int16:
    case ValueType.Int32:
    case ValueType.Int64:
      return mode === ValueTypeMode.Decimal || mode === ValueTypeMode.Hexadecimal || mode === ValueTypeMode.Octal;
    case ValueType.Float32:
    case ValueType.Float64:
      return mode === ValueTypeMode.Scientific || mode === ValueTypeMode.Decimal;
    case ValueType.String:
      return mode === ValueTypeMode.None;
  }
}

export function typeHasSignedNotation(type: ValueType) {
  switch (type) {
    case ValueType.Int8:
    case ValueType.Int16:
    case ValueType.Int32:
    case ValueType.Int64:
      return true;
    default:
      return false;
  }
}

export function isNumber(type: ValueType) {
  switch (type) {
    case ValueType.Int8:
    case ValueType.Int16:
    case ValueType.Int32:
    case ValueType.Int64:
    case ValueType.Float32:
    case ValueType.Float64:
      return true;
    default:
      return false;
  }
}

export interface FormatData {
  buffer: ArrayBuffer;
  type: ValueType;
  endianness: Endianness;
  signed: boolean;
  mode: ValueTypeMode;
}

export function format(formatData: FormatData) {
  const valueView = new DataView(formatData.buffer);
  const isLittleEndian = formatData.endianness === Endianness.Little;
  let value;

  switch (formatData.type) {
    case ValueType.Int8:
      value = formatData.signed ? valueView.getInt8(0) : valueView.getUint8(0);
      return formatInteger(value, formatData.mode);
    case ValueType.Int16:
      value = formatData.signed ? valueView.getInt16(0, isLittleEndian) : valueView.getUint16(0, isLittleEndian);
      return formatInteger(value, formatData.mode);
    case ValueType.Int32:
      value = formatData.signed ? valueView.getInt32(0, isLittleEndian) : valueView.getUint32(0, isLittleEndian);
      return formatInteger(value, formatData.mode);
    case ValueType.Int64:
      value = formatData.signed ? valueView.getBigInt64(0, isLittleEndian) : valueView.getBigUint64(0, isLittleEndian);
      return formatInteger(value, formatData.mode);
    case ValueType.Float32:
      value = valueView.getFloat32(0, isLittleEndian);
      return formatFloat(value, formatData.mode);
    case ValueType.Float64:
      value = valueView.getFloat64(0, isLittleEndian);
      return formatFloat(value, formatData.mode);
    case ValueType.String:
      throw new Error(`Type ${formatData.type} is not yet implemented`);
  }
}

export function formatFloat(value: number, mode: ValueTypeMode) {
  switch (mode) {
    case ValueTypeMode.Decimal:
      return value.toFixed(2).toString();
    case ValueTypeMode.Scientific:
      return value.toExponential(2).toString();
    default:
      throw new Error(`Unknown mode for floats: ${mode}.`);
  }
}

export function formatInteger(value: number|bigint, mode: ValueTypeMode) {
  switch (mode) {
    case ValueTypeMode.Decimal:
      return value.toString();
    case ValueTypeMode.Hexadecimal:
      return value.toString(16);
    case ValueTypeMode.Octal:
      return value.toString(8);
    default:
      throw new Error(`Unknown mode for integers: ${mode}.`);
  }
}

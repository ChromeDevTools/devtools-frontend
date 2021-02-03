// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';

export const UIStrings = {
  /**
  *@description Text that describes the representation of a value in the Linear Memory Inspector, short for decimal
  */
  dec: 'dec',
  /**
  *@description Text that describes the representation of a value in the Linear Memory Inspector
  */
  hex: 'hex',
  /**
  *@description Text that describes the representation of a value in the Linear Memory Inspector, short for octal
  */
  oct: 'oct',
  /**
  *@description Text that describes the representation of a value in the Linear Memory Inspector, short for scientific
  */
  sci: 'sci',
  /**
  *@description Text that describes the type of a value in the Linear Memory Inspector
  */
  none: 'none',
  /**
  *@description Text that describes the Endianness setting that can be selected in the select item in the Linear Memory Inspector
  */
  littleEndian: 'Little Endian',
  /**
  *@description Text that describes the Endianness setting that can be selected in the select item in the Linear Memory Inspector
  */
  bigEndian: 'Big Endian',
  /**
  *@description Text that describes the type of a value in the Linear Memory Inspector
  */
  integerBit: 'Integer 8-bit',
  /**
  *@description Text that describes the type of a value in the Linear Memory Inspector
  */
  integer16Bit: 'Integer 16-bit',
  /**
  *@description Text that describes the type of a value in the Linear Memory Inspector
  */
  integer32Bit: 'Integer 32-bit',
  /**
  *@description Text that describes the type of a value in the Linear Memory Inspector
  */
  integer64Bit: 'Integer 64-bit',
  /**
  *@description Text that describes the type of a value in the Linear Memory Inspector
  */
  floatBit: 'Float 32-bit',
  /**
  *@description Text that describes the type of a value in the Linear Memory Inspector
  */
  float64Bit: 'Float 64-bit',
  /**
  *@description Text that describes the type of a value in the Linear Memory Inspector
  */
  string: 'String',
};
const str_ = i18n.i18n.registerUIStrings('linear_memory_inspector/ValueInterpreterDisplayUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const VALUE_INTEPRETER_MAX_NUM_BYTES = 8;

export const enum ValueType {
  Int8 = 'Integer 8-bit',
  Int16 = 'Integer 16-bit',
  Int32 = 'Integer 32-bit',
  Int64 = 'Integer 64-bit',
  Float32 = 'Float 32-bit',
  Float64 = 'Float 64-bit',
  String = 'String',
}

export const enum Endianness {
  Little = 'Little Endian',
  Big = 'Big Endian',
}

export const enum ValueTypeMode {
  Decimal = 'dec',
  Hexadecimal = 'hex',
  Octal = 'oct',
  Scientific = 'sci',
  None = 'none',
}

export function valueTypeModeToLocalizedString(mode: ValueTypeMode): string {
  switch (mode) {
    case ValueTypeMode.Decimal:
      return i18nString(UIStrings.dec);
    case ValueTypeMode.Hexadecimal:
      return i18nString(UIStrings.hex);
    case ValueTypeMode.Octal:
      return i18nString(UIStrings.oct);
    case ValueTypeMode.Scientific:
      return i18nString(UIStrings.sci);
    case ValueTypeMode.None:
      return i18nString(UIStrings.none);
    default:
      return Platform.assertNever(mode, `Unknown mode: ${mode}`);
  }
}

export function endiannessToLocalizedString(endianness: Endianness): string {
  switch (endianness) {
    case Endianness.Little:
      return i18nString(UIStrings.littleEndian);
    case Endianness.Big:
      return i18nString(UIStrings.bigEndian);
    default:
      return Platform.assertNever(endianness, `Unknown endianness: ${endianness}`);
  }
}

export function valueTypeToLocalizedString(valueType: ValueType): string {
  switch (valueType) {
    case ValueType.Int8:
      return i18nString(UIStrings.integerBit);
    case ValueType.Int16:
      return i18nString(UIStrings.integer16Bit);
    case ValueType.Int32:
      return i18nString(UIStrings.integer32Bit);
    case ValueType.Int64:
      return i18nString(UIStrings.integer64Bit);
    case ValueType.Float32:
      return i18nString(UIStrings.floatBit);
    case ValueType.Float64:
      return i18nString(UIStrings.float64Bit);
    case ValueType.String:
      return i18nString(UIStrings.string);
    default:
      return Platform.assertNever(valueType, `Unknown value type: ${valueType}`);
  }
}

export function isValidMode(type: ValueType, mode: ValueTypeMode): boolean {
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
    default:
      return Platform.assertNever(type, `Unknown value type: ${type}`);
  }
}

export function isNumber(type: ValueType): boolean {
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

export function format(formatData: FormatData): string {
  const valueView = new DataView(formatData.buffer);
  const isLittleEndian = formatData.endianness === Endianness.Little;
  let value;

  try {
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
        value =
            formatData.signed ? valueView.getBigInt64(0, isLittleEndian) : valueView.getBigUint64(0, isLittleEndian);
        return formatInteger(value, formatData.mode);
      case ValueType.Float32:
        value = valueView.getFloat32(0, isLittleEndian);
        return formatFloat(value, formatData.mode);
      case ValueType.Float64:
        value = valueView.getFloat64(0, isLittleEndian);
        return formatFloat(value, formatData.mode);
      case ValueType.String:
        throw new Error(`Type ${formatData.type} is not yet implemented`);
      default:
        return Platform.assertNever(formatData.type, `Unknown value type: ${formatData.type}`);
    }
  } catch (e) {
    return 'N/A';
  }
}

export function formatFloat(value: number, mode: ValueTypeMode): string {
  switch (mode) {
    case ValueTypeMode.Decimal:
      return value.toFixed(2).toString();
    case ValueTypeMode.Scientific:
      return value.toExponential(2).toString();
    default:
      throw new Error(`Unknown mode for floats: ${mode}.`);
  }
}

export function formatInteger(value: number|bigint, mode: ValueTypeMode): string {
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

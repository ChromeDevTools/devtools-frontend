export declare const VALUE_INTEPRETER_MAX_NUM_BYTES = 8;
export declare const enum ValueType {
    INT8 = "Integer 8-bit",
    INT16 = "Integer 16-bit",
    INT32 = "Integer 32-bit",
    INT64 = "Integer 64-bit",
    FLOAT32 = "Float 32-bit",
    FLOAT64 = "Float 64-bit",
    POINTER32 = "Pointer 32-bit",
    POINTER64 = "Pointer 64-bit"
}
export declare const enum Endianness {
    LITTLE = "Little Endian",
    BIG = "Big Endian"
}
export declare const enum ValueTypeMode {
    DECIMAL = "dec",
    HEXADECIMAL = "hex",
    OCTAL = "oct",
    SCIENTIFIC = "sci"
}
export declare function getDefaultValueTypeMapping(): Map<ValueType, ValueTypeMode>;
export declare const VALUE_TYPE_MODE_LIST: ValueTypeMode[];
export declare function valueTypeToLocalizedString(valueType: ValueType): string;
export declare function isValidMode(type: ValueType, mode: ValueTypeMode): boolean;
export declare function isNumber(type: ValueType): boolean;
export declare function getPointerAddress(type: ValueType, buffer: ArrayBuffer, endianness: Endianness): number | bigint;
export declare function isPointer(type: ValueType): boolean;
export interface FormatData {
    buffer: ArrayBuffer;
    type: ValueType;
    endianness: Endianness;
    signed: boolean;
    mode?: ValueTypeMode;
}
export declare function format(formatData: FormatData): string;
export declare function formatFloat(value: number, mode: ValueTypeMode): string;
export declare function formatInteger(value: number | bigint, mode: ValueTypeMode): string;
